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
		"templates_search", "template_create", "template_update", "template_delete", "tasks_cleanup", "task_start", "task_follow", "task_input", "task_resize", "task_delete",
	} {
		if !strings.Contains(body, `"name":"`+toolName+`"`) {
			t.Errorf("tools/list response does not contain %q: %s", toolName, body)
		}
	}
	if !strings.Contains(body, "next_cursor") || !strings.Contains(body, "CTRL_C") {
		t.Fatalf("tools/list response is missing PTY workflow details: %s", body)
	}
}

func TestMCPTasksCleanupUsesDialogStatuses(t *testing.T) {
	queue := taskQueue.NewQueue()
	service := NewTaskService(queue, &cfg.Config{})
	router := NewRouter()
	HandleMCP(router, service, "test-secret", "test")

	finished := queue.Add(&cfg.Config{}, taskQueue.TaskBase{})
	finished.IsStarted = true
	finished.IsFinished = true
	finished.State = "FINISHED"
	failed := queue.Add(&cfg.Config{}, taskQueue.TaskBase{})
	failed.IsStarted = true
	failed.IsFinished = true
	failed.IsError = true
	failed.State = "ERROR"
	idle := queue.Add(&cfg.Config{}, taskQueue.TaskBase{})

	invalid := `{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"tasks_cleanup","arguments":{"statuses":["IDLE"]}}}`
	response := callAuthorizedMCP(router, invalid)
	if response.Code != http.StatusOK || !strings.Contains(response.Body.String(), `"isError":true`) {
		t.Fatalf("invalid tasks_cleanup status = %d, body = %s", response.Code, response.Body.String())
	}

	cleanup := `{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"tasks_cleanup","arguments":{"statuses":["FINISHED","ERROR"]}}}`
	response = callAuthorizedMCP(router, cleanup)
	if response.Code != http.StatusOK || strings.Contains(response.Body.String(), `"isError":true`) {
		t.Fatalf("tasks_cleanup status = %d, body = %s", response.Code, response.Body.String())
	}
	if _, err := queue.Get(finished.Id); err == nil {
		t.Fatal("finished task still exists after tasks_cleanup")
	}
	if _, err := queue.Get(failed.Id); err == nil {
		t.Fatal("error task still exists after tasks_cleanup")
	}
	if _, err := queue.Get(idle.Id); err != nil {
		t.Fatal("idle task was removed by tasks_cleanup")
	}
}

func TestMCPTemplateCreateAndUpdate(t *testing.T) {
	previousProfilePath := cfg.PROFILE_PATH_CACHE
	cfg.PROFILE_PATH_CACHE = t.TempDir()
	t.Cleanup(func() {
		cfg.PROFILE_PATH_CACHE = previousProfilePath
		taskQueue.FlushTemplateCache()
	})
	taskQueue.FlushTemplateCache()

	service := NewTaskService(taskQueue.NewQueue(), &cfg.Config{})
	router := NewRouter()
	HandleMCP(router, service, "test-secret", "test")

	create := `{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"template_create","arguments":{"template":{"place":"agents/example","command":"printf create","name":"Agent example","description":"Created through MCP","id":"agent-example","variables":[],"label":"Example","group":"Agents","isPty":false,"isOnlyCombined":false,"isSingleInstance":false,"isStartOnBoot":false,"isWriteLogs":true,"ttl":0}}}}`
	response := callAuthorizedMCP(router, create)
	if response.Code != http.StatusOK || strings.Contains(response.Body.String(), `"isError":true`) {
		t.Fatalf("template_create status = %d, body = %s", response.Code, response.Body.String())
	}
	template, err := taskQueue.ReadTemplate("agents/example")
	if err != nil {
		t.Fatal(err)
	}
	if template.Command != "printf create" || template.Description != "Created through MCP" {
		t.Fatalf("created template = %#v", template)
	}

	update := `{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"template_update","arguments":{"current_place":"agents/example","template":{"place":"agents/renamed","command":"printf updated","name":"Updated example","description":"Updated through MCP","id":"agent-example","variables":[],"label":"Updated","group":"Agents","isPty":false,"isOnlyCombined":true,"isSingleInstance":false,"isStartOnBoot":false,"isWriteLogs":true,"ttl":60}}}}`
	response = callAuthorizedMCP(router, update)
	if response.Code != http.StatusOK || strings.Contains(response.Body.String(), `"isError":true`) {
		t.Fatalf("template_update status = %d, body = %s", response.Code, response.Body.String())
	}
	if _, err := taskQueue.ReadTemplate("agents/example"); err == nil {
		t.Fatal("old template place still exists after update")
	}
	template, err = taskQueue.ReadTemplate("agents/renamed")
	if err != nil {
		t.Fatal(err)
	}
	if template.Command != "printf updated" || template.Name != "Updated example" || template.TTL != 60 || !template.IsOnlyCombined {
		t.Fatalf("updated template = %#v", template)
	}

	deleteRequest := `{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"template_delete","arguments":{"place":"agents/renamed"}}}`
	response = callAuthorizedMCP(router, deleteRequest)
	if response.Code != http.StatusOK || strings.Contains(response.Body.String(), `"isError":true`) {
		t.Fatalf("template_delete status = %d, body = %s", response.Code, response.Body.String())
	}
	if _, err := taskQueue.ReadTemplate("agents/renamed"); err == nil {
		t.Fatal("template still exists after template_delete")
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

func callAuthorizedMCP(router *Router, body string) *httptest.ResponseRecorder {
	request := newMCPRequest(body)
	request.Header.Set("Authorization", "Bearer test-secret")
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	return response
}
