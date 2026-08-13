package internal

import (
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
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
	HandleApi(router, NewTaskService(queue, config), memstorage.GetMemStorage(), config, make(chan string))

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
	HandleApi(router, NewTaskService(queue, config), memstorage.GetMemStorage(), config, make(chan string))

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

func TestSetTemplateOrderReturnsSaveErrorAndKeepsConfig(t *testing.T) {
	originalProfilePath := cfg.PROFILE_PATH_CACHE
	t.Cleanup(func() {
		cfg.PROFILE_PATH_CACHE = originalProfilePath
	})

	profileFile := filepath.Join(t.TempDir(), "profile-file")
	if err := os.WriteFile(profileFile, []byte("not a directory"), 0600); err != nil {
		t.Fatal(err)
	}
	cfg.PROFILE_PATH_CACHE = profileFile

	config := &cfg.Config{TemplateOrder: []string{"old"}}
	router := NewRouter()
	HandleApi(router, NewTaskService(taskQueue.NewQueue(), config), memstorage.GetMemStorage(), config, make(chan string))

	request := httptest.NewRequest(
		http.MethodPost,
		"/api/setTemplateOrder",
		strings.NewReader(`{"templateOrder":["new"]}`),
	)
	response := httptest.NewRecorder()

	router.ServeHTTP(response, request)

	if response.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusInternalServerError)
	}
	if len(config.TemplateOrder) != 1 || config.TemplateOrder[0] != "old" {
		t.Fatalf("template order = %#v, want unchanged order", config.TemplateOrder)
	}
}

func TestSearchTemplatesEndpointFindsDescription(t *testing.T) {
	originalProfilePath := cfg.PROFILE_PATH_CACHE
	cfg.PROFILE_PATH_CACHE = t.TempDir()
	taskQueue.FlushTemplateCache()
	t.Cleanup(func() {
		cfg.PROFILE_PATH_CACHE = originalProfilePath
		taskQueue.FlushTemplateCache()
	})

	if err := taskQueue.WriteTemplate(taskQueue.Template{
		Place: "ops/deploy", Name: "Release worker",
		Description: "Deploy the background worker to production", Command: "true",
		Variables: []taskQueue.TemplateVariable{},
	}, true); err != nil {
		t.Fatal(err)
	}

	config := &cfg.Config{}
	router := NewRouter()
	HandleApi(router, NewTaskService(taskQueue.NewQueue(), config), memstorage.GetMemStorage(), config, make(chan string))
	request := httptest.NewRequest(http.MethodGet, "/api/templates/search?query=production&limit=5", nil)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
	}
	if !strings.Contains(response.Body.String(), `"description":"Deploy the background worker to production"`) {
		t.Fatalf("search response does not contain template description: %s", response.Body.String())
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
