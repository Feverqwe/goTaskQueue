package internal

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"goTaskQueue/internal/cfg"
	"goTaskQueue/internal/taskQueue"
)

func TestMCPRequiresBearerTokenAndListsTaskTools(t *testing.T) {
	service := NewTaskService(taskQueue.NewQueue(), &cfg.Config{})
	router := NewRouter()
	HandleMCP(router, service, "test-secret", "test")

	request := newMCPRequest(`{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}`)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	if response.Code != http.StatusUnauthorized {
		t.Fatalf("status without token = %d, want %d", response.Code, http.StatusUnauthorized)
	}

	request = newMCPRequest(`{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}`)
	request.Header.Set("Authorization", "Bearer test-secret")
	response = httptest.NewRecorder()
	router.ServeHTTP(response, request)
	if response.Code != http.StatusOK {
		t.Fatalf("authorized status = %d, body = %s", response.Code, response.Body.String())
	}
	body := response.Body.String()
	for _, toolName := range []string{
		"templates_search", "task_start", "task_follow", "task_input", "task_resize", "task_delete",
	} {
		if !strings.Contains(body, `"name":"`+toolName+`"`) {
			t.Errorf("tools/list response does not contain %q: %s", toolName, body)
		}
	}
	if !strings.Contains(body, "next_cursor") || !strings.Contains(body, "CTRL_C") {
		t.Fatalf("tools/list response is missing PTY workflow details: %s", body)
	}
}

func TestTaskServiceWritesToPtyAndFollowsOutput(t *testing.T) {
	queue := taskQueue.NewQueue()
	config := &cfg.Config{
		PtyRun:    []string{"sh", "-c"},
		PtyRunEnv: []string{"TERM=xterm-256color"},
	}
	service := NewTaskService(queue, config)
	command := `while IFS= read -r line; do printf 'reply:%s\n' "$line"; done`
	isPty := true
	task, err := service.AddTask(AddTaskInput{Command: &command, IsPty: &isPty, IsRun: true})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if task.IsRunning() {
			_ = service.StopTask(task.Id)
		}
	})

	initial, err := service.TaskOutput(context.Background(), task.Id, -1, 0, 0, 0)
	if err != nil {
		t.Fatal(err)
	}
	if !initial.Snapshot {
		t.Fatal("initial PTY output was not marked as a screen snapshot")
	}
	if err := service.SendTaskInput(task.Id, "hello agent", "", true); err != nil {
		t.Fatal(err)
	}

	cursor := initial.NextCursor
	output := ""
	deadline := time.Now().Add(3 * time.Second)
	for !strings.Contains(output, "reply:hello agent") && time.Now().Before(deadline) {
		part, err := service.TaskOutput(context.Background(), task.Id, cursor, 500*time.Millisecond, 20*time.Millisecond, 0)
		if err != nil {
			t.Fatal(err)
		}
		cursor = part.NextCursor
		output += part.Output
	}
	if !strings.Contains(output, "reply:hello agent") {
		t.Fatalf("PTY output = %q, want command response", output)
	}
	if screen := task.TerminalScreen(); !strings.Contains(screen, "reply:hello agent") {
		t.Fatalf("terminal screen = %q, want command response", screen)
	}
}

func newMCPRequest(body string) *http.Request {
	request := httptest.NewRequest(http.MethodPost, "/mcp", strings.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Accept", "application/json, text/event-stream")
	request.Header.Set("MCP-Protocol-Version", "2025-06-18")
	return request
}
