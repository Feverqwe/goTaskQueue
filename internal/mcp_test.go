package internal

import (
	"context"
	"fmt"
	"math"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"goTaskQueue/internal/cfg"
	gzbuffer "goTaskQueue/internal/gzBuffer"
	"goTaskQueue/internal/taskQueue"
)

func TestMCPTaskOutputRejectsCursorBeyondLog(t *testing.T) {
	queue := taskQueue.NewQueue()
	config := &cfg.Config{}
	task := queue.Add(config, taskQueue.TaskBase{})
	task.Combined = taskQueue.WrapQuickBuf(gzbuffer.NewGzBuffer().GetDataStore(), taskQueue.MemBufSize)
	t.Cleanup(func() {
		if err := task.Combined.Close(); err != nil {
			t.Error(err)
		}
	})
	if _, err := task.Combined.Write([]byte(strings.Repeat("x", 105180))); err != nil {
		t.Fatal(err)
	}
	router := NewRouter()
	HandleMCP(router, NewTaskService(queue, config), "test-secret", "test")

	request := fmt.Sprintf(`{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"task_output","arguments":{"id":%q,"cursor":105589}}}`, task.Id)
	response := callAuthorizedMCP(router, request)
	if response.Code != http.StatusOK || !strings.Contains(response.Body.String(), `"isError":true`) {
		t.Fatalf("task_output status = %d, body = %s", response.Code, response.Body.String())
	}
	if !strings.Contains(response.Body.String(), "read offset 105589 outside buffer size 105180") {
		t.Fatalf("task_output did not report the invalid cursor: %s", response.Body.String())
	}
}

func TestMCPFollowHugeTimeoutWaitsForOutput(t *testing.T) {
	queue := taskQueue.NewQueue()
	config := &cfg.Config{Run: []string{"sh", "-c"}}
	service := NewTaskService(queue, config)
	command := `read -r line; printf '%s' "$line"`
	task, err := service.AddTask(AddTaskInput{Command: &command, IsRun: true})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if task.IsRunning() {
			_ = task.Kill()
		}
	})
	router := NewRouter()
	HandleMCP(router, service, "test-secret", "test")
	// Use a value exactly representable by the SDK's JSON number handling.
	huge := min(int64(math.MaxInt), int64(1<<54))
	request := newMCPRequest(fmt.Sprintf(`{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"task_follow","arguments":{"id":%q,"wait_seconds":%d,"settle_ms":%d}}}`, task.Id, huge, huge))
	request.Header.Set("Authorization", "Bearer test-secret")
	done := make(chan struct{})
	response := httptest.NewRecorder()
	go func() {
		defer close(done)
		router.ServeHTTP(response, request)
	}()
	select {
	case <-done:
		t.Fatalf("huge timeout returned immediately: %s", response.Body.String())
	case <-time.After(30 * time.Millisecond):
	}
	if err := service.SendTaskInput(task.Id, "timeout-regression", "", true); err != nil {
		t.Fatal(err)
	}
	select {
	case <-done:
		if !strings.Contains(response.Body.String(), "timeout-regression") || strings.Contains(response.Body.String(), `"isError":true`) {
			t.Fatalf("task_follow did not return task output: %s", response.Body.String())
		}
	case <-time.After(3 * time.Second):
		t.Fatal("task_follow did not return after output and process exit")
	}
}

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
		"templates_search", "template_create", "template_update", "template_delete", "tasks_cleanup", "task_start", "task_tail", "task_screen", "task_follow", "task_input", "task_resize", "task_delete",
	} {
		if !strings.Contains(body, `"name":"`+toolName+`"`) {
			t.Errorf("tools/list response does not contain %q: %s", toolName, body)
		}
	}
	if !strings.Contains(body, "next_cursor") || !strings.Contains(body, "CTRL_C") {
		t.Fatalf("tools/list response is missing PTY workflow details: %s", body)
	}
	for _, variableGuide := range []string{"TASK_VAR_", "UPPERCASE_KEY", "[a-z][a-z0-9_]*", "{{ vars.key }}", "select variable"} {
		if !strings.Contains(body, variableGuide) {
			t.Errorf("tools/list response is missing template variable guidance %q: %s", variableGuide, body)
		}
	}

	initialize := `{"jsonrpc":"2.0","id":2,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"test-client","version":"test"}}}`
	response = callAuthorizedMCP(router, initialize)
	if response.Code != http.StatusOK {
		t.Fatalf("initialize status = %d, body = %s", response.Code, response.Body.String())
	}
	for _, instruction := range []string{
		"TASK_VAR_", `{{ vars.key }}`, "PowerShell", "cmd.exe", "defaultValue", "Legacy {key}",
	} {
		if !strings.Contains(response.Body.String(), instruction) {
			t.Errorf("initialize response is missing template instruction %q: %s", instruction, response.Body.String())
		}
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
	screen, err := service.TaskScreen(task.Id)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(screen.Screen, "reply:hello agent") {
		t.Fatalf("TaskScreen() = %q, want command response", screen.Screen)
	}
	tail, err := service.TaskTail(task.Id, 1, 0)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(tail.Output, "reply:hello agent") {
		t.Fatalf("TaskTail() = %q, want command response", tail.Output)
	}
	if tail.NextCursor < tail.StartCursor {
		t.Fatalf("TaskTail() cursors = %d..%d", tail.StartCursor, tail.NextCursor)
	}
}

func TestTailLineStart(t *testing.T) {
	tests := []struct {
		name  string
		data  string
		lines int
		want  string
	}{
		{name: "trailing newline", data: "one\ntwo\nthree\n", lines: 2, want: "two\nthree\n"},
		{name: "open final line", data: "one\ntwo\nthree", lines: 1, want: "three"},
		{name: "more requested than available", data: "one\ntwo", lines: 10, want: "one\ntwo"},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := test.data[tailLineStart([]byte(test.data), test.lines):]; got != test.want {
				t.Fatalf("tail = %q, want %q", got, test.want)
			}
		})
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
