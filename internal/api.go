package internal

import (
	"encoding/json"
	"errors"
	taskqueue "goTaskQueue/internal/taskQueue"
	"net/http"
	"syscall"

	"github.com/NYTimes/gziphandler"
)

type JsonFailResponse struct {
	Error string `json:"error"`
}

type JsonSuccessResponse struct {
	Result interface{} `json:"result"`
}

func HandleApi(router *Router, taskQueue *taskqueue.Queue, config *Config, callChan chan string) {
	apiRouter := NewRouter()
	gzipHandler := gziphandler.GzipHandler(apiRouter)

	handleAction(apiRouter, config, taskQueue, callChan)
	handleFobidden(apiRouter)

	router.All("^/api/", func(w http.ResponseWriter, r *http.Request, next RouteNextFn) {
		gzipHandler.ServeHTTP(w, r)
	})
}

func handleFobidden(router *Router) {
	router.Use(func(w http.ResponseWriter, r *http.Request, next RouteNextFn) {
		w.WriteHeader(403)
	})
}

func handleAction(router *Router, config *Config, taskQueue *taskqueue.Queue, callChan chan string) {
	type GetTaskPayload struct {
		Id string `json:"id"`
	}

	type SignalTaskPayload struct {
		Id     string `json:"id"`
		Signal string `json:"signal"`
	}

	type SendTaskPayload struct {
		Id   string `json:"id"`
		Data string `json:"data"`
	}

	type AddTaskPayload struct {
		Command string `json:"command"`
		Label   string `json:"label"`
	}

	router.Get("/api/tasks", func(w http.ResponseWriter, r *http.Request, next RouteNextFn) {
		apiCall(w, func() ([]*taskqueue.Task, error) {
			tasks := taskQueue.GetAll()
			return tasks, nil
		})
	})

	router.Post("/api/delete", func(w http.ResponseWriter, r *http.Request, next RouteNextFn) {
		apiCall(w, func() (string, error) {
			payload, err := readPayload[GetTaskPayload](r)
			if err != nil {
				return "", err
			}

			err = taskQueue.Del(payload.Id)

			return "ok", err
		})
	})

	router.Post("/api/add", func(w http.ResponseWriter, r *http.Request, next RouteNextFn) {
		apiCall(w, func() (*taskqueue.Task, error) {
			payload, err := readPayload[AddTaskPayload](r)
			if err != nil {
				return nil, err
			}

			task := taskQueue.Add(payload.Command, payload.Label)

			return task, err
		})
	})

	router.Get("/api/task", func(w http.ResponseWriter, r *http.Request, next RouteNextFn) {
		apiCall(w, func() (*taskqueue.Task, error) {
			id := r.URL.Query().Get("id")

			task, err := taskQueue.Get(id)
			return task, err
		})
	})

	router.Post("/api/task/run", func(w http.ResponseWriter, r *http.Request, next RouteNextFn) {
		apiCall(w, func() (string, error) {
			payload, err := readPayload[GetTaskPayload](r)
			if err != nil {
				return "", err
			}

			task, err := taskQueue.Get(payload.Id)
			if err != nil {
				return "", err
			}

			err = task.Run()

			return "ok", err
		})
	})

	router.Post("/api/task/kill", func(w http.ResponseWriter, r *http.Request, next RouteNextFn) {
		apiCall(w, func() (string, error) {
			payload, err := readPayload[GetTaskPayload](r)
			if err != nil {
				return "", err
			}

			task, err := taskQueue.Get(payload.Id)
			if err != nil {
				return "", err
			}

			err = task.Kill()

			return "ok", err
		})
	})

	router.Post("/api/task/signal", func(w http.ResponseWriter, r *http.Request, next RouteNextFn) {
		apiCall(w, func() (string, error) {
			payload, err := readPayload[SignalTaskPayload](r)
			if err != nil {
				return "", err
			}

			task, err := taskQueue.Get(payload.Id)
			if err != nil {
				return "", err
			}

			switch payload.Signal {
			case "SIGINT":
				err = task.Signal(syscall.SIGINT)
			default:
				err = errors.New("unsupported_signal")
			}

			return "ok", err
		})
	})

	router.Post("/api/task/send", func(w http.ResponseWriter, r *http.Request, next RouteNextFn) {
		apiCall(w, func() (string, error) {
			payload, err := readPayload[SendTaskPayload](r)
			if err != nil {
				return "", err
			}

			task, err := taskQueue.Get(payload.Id)
			if err != nil {
				return "", err
			}

			err = task.Send(payload.Data)

			return "ok", err
		})
	})

	router.Post("/api/reloadConfig", func(w http.ResponseWriter, r *http.Request, next RouteNextFn) {
		apiCall(w, func() (string, error) {
			callChan <- "reload"

			return "ok", nil
		})
	})

	router.Custom([]string{"GET"}, []string{"/api/task/stdout", "/api/task/stderr", "/api/task/combined"}, func(w http.ResponseWriter, r *http.Request, next RouteNextFn) {
		logType := r.URL.Path[10:]
		id := r.URL.Query().Get("id")

		task, err := taskQueue.Get(id)
		if err != nil {
			sendStatus(w, 403)
			return
		}

		var data []byte
		if logType == "stdout" && task.Stdout != nil {
			data = *task.Stdout
		} else if logType == "stderr" && task.Stderr != nil {
			data = *task.Stderr
		} else if logType == "combined" && task.Combined != nil {
			data = *task.Combined
		}
		if data == nil {
			sendStatus(w, 404)
			return
		}

		w.Header().Add("Content-type", "text/plain")
		w.WriteHeader(200)
		w.Write(data)
	})
}

type ActionAny[T any] func() (T, error)

func apiCall[T any](w http.ResponseWriter, action ActionAny[T]) {
	result, err := action()
	err = writeApiResult(w, result, err)
	if err != nil {
		panic(err)
	}
}

func writeApiResult(w http.ResponseWriter, result interface{}, err error) error {
	var statusCode int
	var body interface{}
	if err != nil {
		statusCode = 500
		body = JsonFailResponse{
			Error: err.Error(),
		}
	} else {
		statusCode = 200
		body = JsonSuccessResponse{
			Result: result,
		}
	}
	json, err := json.Marshal(body)
	if err == nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(statusCode)
		_, err = w.Write(json)
	}
	return err
}

func readPayload[T any](r *http.Request) (*T, error) {
	decoder := json.NewDecoder(r.Body)
	var payload T
	err := decoder.Decode(&payload)
	if err != nil {
		return nil, err
	}
	return &payload, nil
}

func sendStatus(w http.ResponseWriter, statusCode int) {
	w.WriteHeader(statusCode)
	_, err := w.Write(make([]byte, 0))
	if err != nil {
		panic(err)
	}
}
