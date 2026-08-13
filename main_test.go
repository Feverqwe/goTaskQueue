package main

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"goTaskQueue/internal"
	"goTaskQueue/internal/cfg"
	"goTaskQueue/internal/shared"
	"goTaskQueue/internal/taskQueue"

	"golang.org/x/net/websocket"
)

func TestWebsocketHandlerReturnsWhenIdleClientDisconnects(t *testing.T) {
	queue := taskQueue.NewQueue()
	config := &cfg.Config{}
	task := queue.Add(config, taskQueue.TaskBase{})
	router := internal.NewRouter()
	handleWebsocket(router, internal.NewTaskService(queue, config))

	requestDone := make(chan struct{})
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer close(requestDone)
		router.ServeHTTP(w, r)
	}))

	wsURL := "ws" + strings.TrimPrefix(server.URL, "http") + "/ws?id=" + task.Id
	client, err := websocket.Dial(wsURL, "", server.URL)
	if err != nil {
		server.Close()
		t.Fatal(err)
	}
	if err := client.Close(); err != nil {
		server.CloseClientConnections()
		t.Fatal(err)
	}

	select {
	case <-requestDone:
		server.Close()
	case <-time.After(time.Second):
		server.CloseClientConnections()
		t.Fatal("WebSocket handler remained subscribed after client disconnect")
	}
}

func TestWebsocketHandlerDrainsFinalOutputBeforeClosing(t *testing.T) {
	queue := taskQueue.NewQueue()
	config := &cfg.Config{}
	task := queue.Add(config, taskQueue.TaskBase{})
	task.IsFinished = true

	var lenCalls atomic.Int32
	task.Combined = &shared.DataStore{
		Len: func() int64 {
			if lenCalls.Add(1) <= 2 {
				return 5
			}
			return 9
		},
		ReadAt: func(offset int64) ([]byte, error) {
			switch offset {
			case 0:
				return []byte("first"), nil
			case 5:
				return []byte("tail"), nil
			default:
				return nil, fmt.Errorf("unexpected read offset %d", offset)
			}
		},
	}

	router := internal.NewRouter()
	handleWebsocket(router, internal.NewTaskService(queue, config))
	server := httptest.NewServer(router)
	defer server.Close()

	wsURL := "ws" + strings.TrimPrefix(server.URL, "http") + "/ws?id=" + task.Id
	client, err := websocket.Dial(wsURL, "", server.URL)
	if err != nil {
		t.Fatal(err)
	}
	defer client.Close()

	for _, want := range []string{"hfirst", "atail", "f"} {
		var message []byte
		if err := websocket.Message.Receive(client, &message); err != nil {
			t.Fatalf("receive %q: %v", want, err)
		}
		if string(message) != want {
			t.Fatalf("message = %q, want %q", message, want)
		}
	}
}

func TestWebsocketHandlerReportsUnknownTask(t *testing.T) {
	queue := taskQueue.NewQueue()
	router := internal.NewRouter()
	handleWebsocket(router, internal.NewTaskService(queue, &cfg.Config{}))
	server := httptest.NewServer(router)
	defer server.Close()

	wsURL := "ws" + strings.TrimPrefix(server.URL, "http") + "/ws?id=missing"
	client, err := websocket.Dial(wsURL, "", server.URL)
	if err != nil {
		t.Fatal(err)
	}
	defer client.Close()

	var message []byte
	if err := websocket.Message.Receive(client, &message); err != nil {
		t.Fatal(err)
	}
	if want := "eTask not found"; string(message) != want {
		t.Fatalf("message = %q, want %q", message, want)
	}
}

func TestWebsocketHandlerReportsLogReadError(t *testing.T) {
	queue := taskQueue.NewQueue()
	config := &cfg.Config{}
	task := queue.Add(config, taskQueue.TaskBase{})
	task.Combined = &shared.DataStore{
		Len: func() int64 { return 1 },
		ReadAt: func(int64) ([]byte, error) {
			return nil, fmt.Errorf("read failed")
		},
	}

	router := internal.NewRouter()
	handleWebsocket(router, internal.NewTaskService(queue, config))
	server := httptest.NewServer(router)
	defer server.Close()

	wsURL := "ws" + strings.TrimPrefix(server.URL, "http") + "/ws?id=" + task.Id
	client, err := websocket.Dial(wsURL, "", server.URL)
	if err != nil {
		t.Fatal(err)
	}
	defer client.Close()

	var message []byte
	if err := websocket.Message.Receive(client, &message); err != nil {
		t.Fatal(err)
	}
	if want := "eread failed"; string(message) != want {
		t.Fatalf("message = %q, want %q", message, want)
	}
}
