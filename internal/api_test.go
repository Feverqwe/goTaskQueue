package internal

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"goTaskQueue/internal/cfg"
	memstorage "goTaskQueue/internal/memStorage"
	"goTaskQueue/internal/shared"
	"goTaskQueue/internal/taskQueue"
)

func TestTaskLogEndpointsMapPublicNamesToStoredLogs(t *testing.T) {
	queue := taskQueue.NewQueue()
	config := &cfg.Config{}
	task := queue.Add(config, taskQueue.TaskBase{})
	task.Stdout = testDataStore("stdout data")
	task.Stderr = testDataStore("stderr data")
	task.Combined = testDataStore("combined data")

	router := NewRouter()
	HandleApi(router, queue, memstorage.GetMemStorage(), config, make(chan string))

	for _, tc := range []struct {
		name string
		want string
	}{
		{name: "stdout", want: "stdout data"},
		{name: "stderr", want: "stderr data"},
		{name: "combined", want: "combined data"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			request := httptest.NewRequest(http.MethodGet, "/api/task/"+tc.name+"?id="+task.Id, nil)
			response := httptest.NewRecorder()

			router.ServeHTTP(response, request)

			if response.Code != http.StatusOK {
				t.Fatalf("status = %d, want %d", response.Code, http.StatusOK)
			}
			if response.Body.String() != tc.want {
				t.Fatalf("body = %q, want %q", response.Body.String(), tc.want)
			}
		})
	}
}

func TestCloneAndRunUnknownTaskReturnsApiError(t *testing.T) {
	queue := taskQueue.NewQueue()
	config := &cfg.Config{}
	router := NewRouter()
	HandleApi(router, queue, memstorage.GetMemStorage(), config, make(chan string))

	request := httptest.NewRequest(
		http.MethodPost,
		"/api/clone",
		strings.NewReader(`{"id":"missing","isRun":true}`),
	)
	response := httptest.NewRecorder()

	router.ServeHTTP(response, request)

	if response.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusInternalServerError)
	}
	if !strings.Contains(response.Body.String(), "Task not found") {
		t.Fatalf("body = %q, want task-not-found error", response.Body.String())
	}
}

func testDataStore(data string) *shared.DataStore {
	return &shared.DataStore{
		PipeTo: func(w io.Writer) error {
			_, err := io.WriteString(w, data)
			return err
		},
	}
}
