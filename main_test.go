package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"goTaskQueue/internal"
	"goTaskQueue/internal/cfg"
	"goTaskQueue/internal/taskQueue"

	"golang.org/x/net/websocket"
)

func TestWebsocketHandlerReturnsWhenIdleClientDisconnects(t *testing.T) {
	queue := taskQueue.NewQueue()
	task := queue.Add(&cfg.Config{}, taskQueue.TaskBase{})
	router := internal.NewRouter()
	handleWebsocket(router, queue)

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
