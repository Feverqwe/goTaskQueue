package internal

import (
	"encoding/json"
	"goTaskQueue/internal/cfg"
	memstorage "goTaskQueue/internal/memStorage"
	"goTaskQueue/internal/shared"
	"goTaskQueue/internal/taskQueue"
	"goTaskQueue/internal/utils"
	"net/http"
	"strconv"

	"github.com/NYTimes/gziphandler"
)

type JsonFailResponse struct {
	Error string `json:"error"`
}

type JsonSuccessResponse struct {
	Result interface{} `json:"result"`
}

func HandleApi(router *Router, service *TaskService, memStorage *memstorage.MemStorage, config *cfg.Config, callChan chan string) {
	apiRouter := NewRouter()
	gzipHandler := gziphandler.GzipHandler(apiRouter)

	handleAction(apiRouter, config, service, callChan)
	handleMemStorage(apiRouter, memStorage)
	handleFobidden(apiRouter)

	router.All("^/api/", gzipHandler.ServeHTTP)
}

func handleFobidden(router *Router) {
	router.Use(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(403)
	})
}

func handleAction(router *Router, config *cfg.Config, service *TaskService, callChan chan string) {
	type GetTaskPayload struct {
		Id string `json:"id"`
	}

	type CleanupPayload struct {
		Statuses []string `json:"statuses"`
	}

	type CloneTaskPayload struct {
		Id    string `json:"id"`
		IsRun bool   `json:"isRun"`
	}

	type SignalTaskPayload struct {
		Id     string `json:"id"`
		Signal int    `json:"signal"`
	}

	type SetLabelPayload struct {
		Id    string `json:"id"`
		Label string `json:"label"`
	}

	type AddLinkPayload struct {
		Id string `json:"id"`
		taskQueue.TaskLink
	}

	type DelLinkPayload struct {
		Id   string `json:"id"`
		Name string `json:"name"`
	}

	type AddAssetPayload struct {
		Id   string `json:"id"`
		Path string `json:"path"`
	}

	type DelAssetPayload struct {
		Id   string `json:"id"`
		Path string `json:"path"`
	}

	router.Get("/api/tasks", func(w http.ResponseWriter, r *http.Request) {
		apiCall(w, func() ([]*taskQueue.Task, error) {
			tasks := service.ListTasks()
			return tasks, nil
		})
	})

	router.Post("/api/delete", func(w http.ResponseWriter, r *http.Request) {
		apiCall(w, func() (string, error) {
			payload, err := utils.ParseJson[GetTaskPayload](r.Body)
			if err != nil {
				return "", err
			}

			err = service.DeleteTask(payload.Id)

			return "ok", err
		})
	})

	router.Post("/api/add", func(w http.ResponseWriter, r *http.Request) {
		apiCall(w, func() (*taskQueue.Task, error) {
			payload, err := utils.ParseJson[AddTaskInput](r.Body)
			if err != nil {
				return nil, err
			}
			return service.AddTask(*payload)
		})
	})

	router.Post("/api/clone", func(w http.ResponseWriter, r *http.Request) {
		apiCall(w, func() (*taskQueue.Task, error) {
			payload, err := utils.ParseJson[CloneTaskPayload](r.Body)
			if err != nil {
				return nil, err
			}

			return service.CloneTask(payload.Id, payload.IsRun)
		})
	})

	router.Post("/api/cleanup", func(w http.ResponseWriter, r *http.Request) {
		apiCall(w, func() (*bool, error) {
			payload, err := utils.ParseJson[CleanupPayload](r.Body)
			if err != nil {
				return nil, err
			}

			statuses := payload.Statuses

			service.CleanupTasks(statuses)

			res := true

			return &res, err
		})
	})

	router.Get("/api/task", func(w http.ResponseWriter, r *http.Request) {
		apiCall(w, func() (*taskQueue.Task, error) {
			id := r.URL.Query().Get("id")

			task, err := service.GetTask(id)
			return task, err
		})
	})

	router.Post("/api/task/run", func(w http.ResponseWriter, r *http.Request) {
		apiCall(w, func() (string, error) {
			payload, err := utils.ParseJson[GetTaskPayload](r.Body)
			if err != nil {
				return "", err
			}

			err = service.RunTask(payload.Id)

			return "ok", err
		})
	})

	router.Post("/api/task/kill", func(w http.ResponseWriter, r *http.Request) {
		apiCall(w, func() (string, error) {
			payload, err := utils.ParseJson[GetTaskPayload](r.Body)
			if err != nil {
				return "", err
			}

			err = service.StopTask(payload.Id)

			return "ok", err
		})
	})

	router.Post("/api/task/signal", func(w http.ResponseWriter, r *http.Request) {
		apiCall(w, func() (string, error) {
			payload, err := utils.ParseJson[SignalTaskPayload](r.Body)
			if err != nil {
				return "", err
			}

			err = service.SignalTask(payload.Id, payload.Signal)

			return "ok", err
		})
	})

	router.Post("/api/task/setLabel", func(w http.ResponseWriter, r *http.Request) {
		apiCall(w, func() (string, error) {
			payload, err := utils.ParseJson[SetLabelPayload](r.Body)
			if err != nil {
				return "", err
			}

			err = service.SetTaskLabel(payload.Id, payload.Label)

			return "ok", err
		})
	})

	router.Post("/api/task/addLink", func(w http.ResponseWriter, r *http.Request) {
		apiCall(w, func() (string, error) {
			payload, err := utils.ParseJson[AddLinkPayload](r.Body)
			if err != nil {
				return "", err
			}

			err = service.AddTaskLink(payload.Id, payload.TaskLink)

			return "ok", err
		})
	})

	router.Post("/api/task/delLink", func(w http.ResponseWriter, r *http.Request) {
		apiCall(w, func() (string, error) {
			payload, err := utils.ParseJson[DelLinkPayload](r.Body)
			if err != nil {
				return "", err
			}

			err = service.DeleteTaskLink(payload.Id, payload.Name)

			return "ok", err
		})
	})

	router.Post("/api/task/addAsset", func(w http.ResponseWriter, r *http.Request) {
		apiCall(w, func() (*taskQueue.TaskAsset, error) {
			payload, err := utils.ParseJson[AddAssetPayload](r.Body)
			if err != nil {
				return nil, err
			}

			return service.AddTaskAsset(payload.Id, payload.Path)
		})
	})

	router.Post("/api/task/delAsset", func(w http.ResponseWriter, r *http.Request) {
		apiCall(w, func() (string, error) {
			payload, err := utils.ParseJson[DelAssetPayload](r.Body)
			if err != nil {
				return "", err
			}

			err = service.DeleteTaskAsset(payload.Id, payload.Path)

			return "ok", err
		})
	})

	router.Post("/api/reloadConfig", func(w http.ResponseWriter, r *http.Request) {
		apiCall(w, func() (string, error) {
			callChan <- "reload"

			return "ok", nil
		})
	})

	router.Post("/api/reloadTemplates", func(w http.ResponseWriter, r *http.Request) {
		apiCall(w, func() (string, error) {
			taskQueue.FlushTemplateCache()

			return "ok", nil
		})
	})

	type SetTemplateOrderPayload struct {
		TemplateOrder []string `json:"templateOrder"`
	}

	router.Post("/api/setTemplateOrder", func(w http.ResponseWriter, r *http.Request) {
		apiCall(w, func() (string, error) {
			payload, err := utils.ParseJson[SetTemplateOrderPayload](r.Body)
			if err != nil {
				return "", err
			}

			nextConfig := *config
			nextConfig.TemplateOrder = append([]string(nil), payload.TemplateOrder...)
			if err := cfg.SaveConfig(nextConfig); err != nil {
				return "", err
			}
			config.TemplateOrder = nextConfig.TemplateOrder

			return "ok", nil
		})
	})

	router.Get("/api/getTemplateOrder", func(w http.ResponseWriter, r *http.Request) {
		apiCall(w, func() ([]string, error) {
			templateOrder := config.TemplateOrder

			return templateOrder, nil
		})
	})

	router.Custom([]string{"GET"}, []string{"/api/task/stdout", "/api/task/stderr", "/api/task/combined"}, func(w http.ResponseWriter, r *http.Request) {
		logType := r.URL.Path[10:]
		id := r.URL.Query().Get("id")

		task, err := service.GetTask(id)
		if err != nil {
			sendStatus(w, 403)
			return
		}

		var data *shared.DataStore
		switch logType {
		case "stdout":
			data = task.GetLog(taskQueue.LOG_STDOUT)
		case "stderr":
			data = task.GetLog(taskQueue.LOG_STDERR)
		case "combined":
			data = task.GetLog(taskQueue.LOG_COMBINED)
		}
		if data == nil {
			sendStatus(w, 404)
			return
		}

		w.Header().Add("Content-type", "text/plain")
		w.WriteHeader(200)
		data.PipeTo(w)
	})

	router.Get("/api/templates", func(w http.ResponseWriter, r *http.Request) {
		apiCall(w, func() ([]taskQueue.Template, error) {
			templates := taskQueue.GetTemplates()

			return templates, nil
		})
	})

	router.Get("/api/templates/search", func(w http.ResponseWriter, r *http.Request) {
		apiCall(w, func() ([]taskQueue.Template, error) {
			query := r.URL.Query().Get("query")
			limit := 20
			if value := r.URL.Query().Get("limit"); value != "" {
				parsed, err := strconv.Atoi(value)
				if err != nil {
					return nil, err
				}
				limit = parsed
			}
			return service.SearchTemplates(query, limit), nil
		})
	})

	router.Get("/api/getTemplate", func(w http.ResponseWriter, r *http.Request) {
		apiCall(w, func() (*taskQueue.Template, error) {
			id := r.URL.Query().Get("id")

			template, err := taskQueue.GetTemplate(id)
			if err != nil {
				return nil, err
			}

			return template, nil
		})
	})

	type SetTemplatePayload struct {
		PrevRelPlace string             `json:"prevPlace"`
		Template     taskQueue.Template `json:"template"`
	}

	router.Post("/api/setTemplate", func(w http.ResponseWriter, r *http.Request) {
		apiCall(w, func() (string, error) {
			payload, err := utils.ParseJson[SetTemplatePayload](r.Body)
			if err != nil {
				return "", err
			}

			if payload.PrevRelPlace == "" {
				_, err = service.CreateTemplate(payload.Template)
			} else {
				_, err = service.UpdateTemplate(payload.PrevRelPlace, payload.Template)
			}
			if err != nil {
				return "", err
			}

			return "ok", nil
		})
	})

	router.Get("/api/readTemplate", func(w http.ResponseWriter, r *http.Request) {
		apiCall(w, func() (*taskQueue.Template, error) {
			relPlace := r.URL.Query().Get("place")

			template, err := taskQueue.ReadTemplate(relPlace)
			if err != nil {
				return nil, err
			}

			return template, nil
		})
	})

	type MoveTemplatePayload struct {
		RelFrom string `json:"from"`
		RelTo   string `json:"to"`
	}

	router.Post("/api/moveTemplate", func(w http.ResponseWriter, r *http.Request) {
		apiCall(w, func() (string, error) {
			payload, err := utils.ParseJson[MoveTemplatePayload](r.Body)
			if err != nil {
				return "", err
			}

			err = taskQueue.MoveTemplate(payload.RelFrom, payload.RelTo)
			if err != nil {
				return "", err
			}

			return "ok", nil
		})
	})

	router.Post("/api/moveTemplateFolder", func(w http.ResponseWriter, r *http.Request) {
		apiCall(w, func() (string, error) {
			payload, err := utils.ParseJson[MoveTemplatePayload](r.Body)
			if err != nil {
				return "", err
			}

			err = taskQueue.MoveTemplateFolder(payload.RelFrom, payload.RelTo)
			if err != nil {
				return "", err
			}

			return "ok", nil
		})
	})

	type RemoveTemplatePayload struct {
		RelPlace string `json:"place"`
	}

	router.Post("/api/removeTemplate", func(w http.ResponseWriter, r *http.Request) {
		apiCall(w, func() (string, error) {
			payload, err := utils.ParseJson[RemoveTemplatePayload](r.Body)
			if err != nil {
				return "", err
			}

			err = service.DeleteTemplate(payload.RelPlace)
			if err != nil {
				return "", err
			}

			return "ok", nil
		})
	})
}

func handleMemStorage(router *Router, memStorage *memstorage.MemStorage) {
	router.Post("/api/memStorage/get", func(w http.ResponseWriter, r *http.Request) {
		apiCall(w, func() (map[string]interface{}, error) {
			keys, err := utils.ParseJson[[]string](r.Body)
			if err != nil {
				return nil, err
			}
			result := memStorage.GetKeys(*keys)
			return result, nil
		})
	})

	router.Post("/api/memStorage/set", func(w http.ResponseWriter, r *http.Request) {
		apiCall(w, func() (string, error) {
			keyValue, err := utils.ParseJson[map[string]interface{}](r.Body)
			if err == nil {
				err = memStorage.SetObject(*keyValue)
			}
			return "ok", err
		})
	})

	router.Post("/api/memStorage/del", func(w http.ResponseWriter, r *http.Request) {
		apiCall(w, func() (string, error) {
			keys, err := utils.ParseJson[[]string](r.Body)
			if err == nil {
				err = memStorage.DelKeys(*keys)
			}
			return "ok", err
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

func sendStatus(w http.ResponseWriter, statusCode int) {
	w.WriteHeader(statusCode)
	_, err := w.Write(make([]byte, 0))
	if err != nil {
		panic(err)
	}
}

func setValue[T int64 | string | bool](val *T, def T) T {
	if val == nil {
		return def
	}
	return *val
}
