package internal

import (
	"encoding/json"
	"errors"
	taskqueue "goTaskQueue/internal/taskQueue"
	"io"
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

	type AddTaskPayload struct {
		Command string `json:"command"`
		Label   string `json:"label"`
		IsPty   bool   `json:"isPty"`
	}

	type SetLabelPayload struct {
		Id    string `json:"id"`
		Label string `json:"label"`
	}

	type AddLinkPayload struct {
		Id   string `json:"taskId"`
		Name string `json:"name"`
		Type string `json:"type"`
		Url  string `json:"url"`
	}

	type DelLinkPayload struct {
		Id   string `json:"id"`
		Name string `json:"name"`
	}

	router.Get("/api/tasks", func(w http.ResponseWriter, r *http.Request, next RouteNextFn) {
		apiCall(w, func() ([]*taskqueue.Task, error) {
			tasks := taskQueue.GetAll()
			return tasks, nil
		})
	})

	router.Post("/api/delete", func(w http.ResponseWriter, r *http.Request, next RouteNextFn) {
		apiCall(w, func() (string, error) {
			payload, err := ParseJson[GetTaskPayload](r.Body)
			if err != nil {
				return "", err
			}

			err = taskQueue.Del(payload.Id)

			return "ok", err
		})
	})

	router.Post("/api/add", func(w http.ResponseWriter, r *http.Request, next RouteNextFn) {
		apiCall(w, func() (*taskqueue.Task, error) {
			payload, err := ParseJson[AddTaskPayload](r.Body)
			if err != nil {
				return nil, err
			}

			task := taskQueue.Add(payload.Command, payload.Label, payload.IsPty)

			return task, err
		})
	})

	router.Post("/api/clone", func(w http.ResponseWriter, r *http.Request, next RouteNextFn) {
		apiCall(w, func() (*taskqueue.Task, error) {
			payload, err := ParseJson[GetTaskPayload](r.Body)
			if err != nil {
				return nil, err
			}

			task, err := taskQueue.Clone(payload.Id)

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
			payload, err := ParseJson[GetTaskPayload](r.Body)
			if err != nil {
				return "", err
			}

			task, err := taskQueue.Get(payload.Id)
			if err != nil {
				return "", err
			}

			if task.IsPty {
				err = task.Run(config.PtyRun, config.PtyRunEnv)
			} else {
				err = task.Run(config.Run, config.RunEnv)
			}

			return "ok", err
		})
	})

	router.Post("/api/task/kill", func(w http.ResponseWriter, r *http.Request, next RouteNextFn) {
		apiCall(w, func() (string, error) {
			payload, err := ParseJson[GetTaskPayload](r.Body)
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
			payload, err := ParseJson[SignalTaskPayload](r.Body)
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

	router.Post("/api/task/setLabel", func(w http.ResponseWriter, r *http.Request, next RouteNextFn) {
		apiCall(w, func() (string, error) {
			payload, err := ParseJson[SetLabelPayload](r.Body)
			if err != nil {
				return "", err
			}

			task, err := taskQueue.Get(payload.Id)
			if err != nil {
				return "", err
			}

			task.Label = payload.Label

			return "ok", err
		})
	})

	router.Post("/api/task/addLink", func(w http.ResponseWriter, r *http.Request, next RouteNextFn) {
		apiCall(w, func() (string, error) {
			payload, err := ParseJson[AddLinkPayload](r.Body)
			if err != nil {
				return "", err
			}

			task, err := taskQueue.Get(payload.Id)
			if err != nil {
				return "", err
			}

			task.AddLink(payload.Name, payload.Type, payload.Url)

			return "ok", err
		})
	})

	router.Post("/api/task/delLink", func(w http.ResponseWriter, r *http.Request, next RouteNextFn) {
		apiCall(w, func() (string, error) {
			payload, err := ParseJson[DelLinkPayload](r.Body)
			if err != nil {
				return "", err
			}

			task, err := taskQueue.Get(payload.Id)
			if err != nil {
				return "", err
			}

			task.DelLink(payload.Name)

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

	type SetTemplatesPayload struct {
		Templates []interface{} `json:"templates"`
	}

	router.Post("/api/setTemplates", func(w http.ResponseWriter, r *http.Request, next RouteNextFn) {
		apiCall(w, func() (string, error) {
			payload, err := ParseJson[SetTemplatesPayload](r.Body)
			if err != nil {
				return "", err
			}

			config.Templates = payload.Templates

			SaveConfig(*config)

			return "ok", nil
		})
	})

	router.Get("/api/templates", func(w http.ResponseWriter, r *http.Request, next RouteNextFn) {
		apiCall(w, func() ([]interface{}, error) {
			var err error

			templates := config.Templates

			return templates, err
		})
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

func ParseJson[T any](data io.Reader) (*T, error) {
	decoder := json.NewDecoder(data)
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
