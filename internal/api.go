package internal

import (
	"encoding/json"
	"fmt"
	"goTaskQueue/internal/cfg"
	gzbuffer "goTaskQueue/internal/gzBuffer"
	memstorage "goTaskQueue/internal/memStorage"
	"goTaskQueue/internal/taskQueue"
	templatectr "goTaskQueue/internal/templateCtr"
	"goTaskQueue/internal/utils"
	"net/http"
	"strings"
	"syscall"

	"github.com/NYTimes/gziphandler"
)

type JsonFailResponse struct {
	Error string `json:"error"`
}

type JsonSuccessResponse struct {
	Result interface{} `json:"result"`
}

func HandleApi(router *Router, queue *taskQueue.Queue, memStorage *memstorage.MemStorage, config *cfg.Config, callChan chan string) {
	apiRouter := NewRouter()
	gzipHandler := gziphandler.GzipHandler(apiRouter)

	handleAction(apiRouter, config, queue, callChan)
	handleMemStorage(apiRouter, memStorage)
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

func handleAction(router *Router, config *cfg.Config, queue *taskQueue.Queue, callChan chan string) {
	type GetTaskPayload struct {
		Id string `json:"id"`
	}

	type SignalTaskPayload struct {
		Id     string `json:"id"`
		Signal int    `json:"signal"`
	}

	type AddTaskPayload struct {
		TemplateId     string            `json:"templateId"`
		Variables      map[string]string `json:"variables"`
		Command        string            `json:"command"`
		Label          string            `json:"label"`
		Group          string            `json:"group"`
		IsPty          bool              `json:"isPty"`
		IsOnlyCombined bool              `json:"isOnlyCombined"`
		IsRun          bool              `json:"isRun"`
	}

	type SetLabelPayload struct {
		Id    string `json:"id"`
		Label string `json:"label"`
	}

	type AddLinkPayload struct {
		Id    string `json:"id"`
		Name  string `json:"name"`
		Type  string `json:"type"`
		Url   string `json:"url"`
		Title string `json:"title"`
	}

	type DelLinkPayload struct {
		Id   string `json:"id"`
		Name string `json:"name"`
	}

	router.Get("/api/tasks", func(w http.ResponseWriter, r *http.Request, next RouteNextFn) {
		apiCall(w, func() ([]*taskQueue.Task, error) {
			tasks := queue.GetAll()
			return tasks, nil
		})
	})

	router.Post("/api/delete", func(w http.ResponseWriter, r *http.Request, next RouteNextFn) {
		apiCall(w, func() (string, error) {
			payload, err := utils.ParseJson[GetTaskPayload](r.Body)
			if err != nil {
				return "", err
			}

			err = queue.Del(payload.Id)

			return "ok", err
		})
	})

	router.Post("/api/add", func(w http.ResponseWriter, r *http.Request, next RouteNextFn) {
		apiCall(w, func() (*taskQueue.Task, error) {
			payload, err := utils.ParseJson[AddTaskPayload](r.Body)
			if err != nil {
				return nil, err
			}

			if payload.TemplateId != "" {
				template, err := templatectr.GetTemplate(payload.TemplateId)
				if err != nil {
					return nil, fmt.Errorf("template not found %v", payload.TemplateId)
				}

				if payload.Command == "" {
					payload.Command = template.Command
				}
				if payload.Label == "" {
					payload.Label = template.Label
				}
				if payload.Group == "" {
					payload.Group = template.Group
				}
				if !payload.IsPty {
					payload.IsPty = template.IsPty
				}
				if !payload.IsOnlyCombined {
					payload.IsOnlyCombined = template.IsOnlyCombined
				}

				for _, variable := range template.Variables {
					old := fmt.Sprintf("{%v}", variable.Value)
					value, ok := payload.Variables[variable.Value]
					if !ok {
						value = variable.DefaultValue
					}
					payload.Command = strings.ReplaceAll(payload.Command, old, value)
					payload.Label = strings.ReplaceAll(payload.Label, old, value)
				}
			}

			task := queue.Add(payload.Command, payload.Label, payload.Group, payload.IsPty, payload.IsOnlyCombined)

			if payload.IsRun {
				task.Run(config)
			}

			return task, err
		})
	})

	router.Post("/api/clone", func(w http.ResponseWriter, r *http.Request, next RouteNextFn) {
		apiCall(w, func() (*taskQueue.Task, error) {
			payload, err := utils.ParseJson[GetTaskPayload](r.Body)
			if err != nil {
				return nil, err
			}

			task, err := queue.Clone(payload.Id)

			return task, err
		})
	})

	router.Get("/api/task", func(w http.ResponseWriter, r *http.Request, next RouteNextFn) {
		apiCall(w, func() (*taskQueue.Task, error) {
			id := r.URL.Query().Get("id")

			task, err := queue.Get(id)
			return task, err
		})
	})

	router.Post("/api/task/run", func(w http.ResponseWriter, r *http.Request, next RouteNextFn) {
		apiCall(w, func() (string, error) {
			payload, err := utils.ParseJson[GetTaskPayload](r.Body)
			if err != nil {
				return "", err
			}

			task, err := queue.Get(payload.Id)
			if err != nil {
				return "", err
			}

			err = task.Run(config)

			return "ok", err
		})
	})

	router.Post("/api/task/kill", func(w http.ResponseWriter, r *http.Request, next RouteNextFn) {
		apiCall(w, func() (string, error) {
			payload, err := utils.ParseJson[GetTaskPayload](r.Body)
			if err != nil {
				return "", err
			}

			task, err := queue.Get(payload.Id)
			if err != nil {
				return "", err
			}

			err = task.Kill()

			return "ok", err
		})
	})

	router.Post("/api/task/signal", func(w http.ResponseWriter, r *http.Request, next RouteNextFn) {
		apiCall(w, func() (string, error) {
			payload, err := utils.ParseJson[SignalTaskPayload](r.Body)
			if err != nil {
				return "", err
			}

			task, err := queue.Get(payload.Id)
			if err != nil {
				return "", err
			}

			sig := syscall.Signal(payload.Signal)

			err = task.Signal(sig)

			return "ok", err
		})
	})

	router.Post("/api/task/setLabel", func(w http.ResponseWriter, r *http.Request, next RouteNextFn) {
		apiCall(w, func() (string, error) {
			payload, err := utils.ParseJson[SetLabelPayload](r.Body)
			if err != nil {
				return "", err
			}

			task, err := queue.Get(payload.Id)
			if err != nil {
				return "", err
			}

			task.SetLabel(payload.Label)

			return "ok", err
		})
	})

	router.Post("/api/task/addLink", func(w http.ResponseWriter, r *http.Request, next RouteNextFn) {
		apiCall(w, func() (string, error) {
			payload, err := utils.ParseJson[AddLinkPayload](r.Body)
			if err != nil {
				return "", err
			}

			task, err := queue.Get(payload.Id)
			if err != nil {
				return "", err
			}

			task.AddLink(payload.Name, payload.Type, payload.Url, payload.Title)

			return "ok", err
		})
	})

	router.Post("/api/task/delLink", func(w http.ResponseWriter, r *http.Request, next RouteNextFn) {
		apiCall(w, func() (string, error) {
			payload, err := utils.ParseJson[DelLinkPayload](r.Body)
			if err != nil {
				return "", err
			}

			task, err := queue.Get(payload.Id)
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

	type SetTemplateOrderPayload struct {
		TemplateOrder []string `json:"templateOrder"`
	}

	router.Post("/api/setTemplateOrder", func(w http.ResponseWriter, r *http.Request, next RouteNextFn) {
		apiCall(w, func() (string, error) {
			payload, err := utils.ParseJson[SetTemplateOrderPayload](r.Body)
			if err != nil {
				return "", err
			}

			config.TemplateOrder = payload.TemplateOrder
			cfg.SaveConfig(*config)

			return "ok", nil
		})
	})

	router.Get("/api/getTemplateOrder", func(w http.ResponseWriter, r *http.Request, next RouteNextFn) {
		apiCall(w, func() ([]string, error) {
			templateOrder := config.TemplateOrder

			return templateOrder, nil
		})
	})

	router.Custom([]string{"GET"}, []string{"/api/task/stdout", "/api/task/stderr", "/api/task/combined"}, func(w http.ResponseWriter, r *http.Request, next RouteNextFn) {
		logType := r.URL.Path[10:]
		id := r.URL.Query().Get("id")

		task, err := queue.Get(id)
		if err != nil {
			sendStatus(w, 403)
			return
		}

		var data *gzbuffer.GzBuffer
		if logType == "stdout" && task.Stdout != nil {
			data = task.Stdout
		} else if logType == "stderr" && task.Stderr != nil {
			data = task.Stderr
		} else if logType == "combined" && task.Combined != nil {
			data = task.Combined
		}
		if data == nil {
			sendStatus(w, 404)
			return
		}

		w.Header().Add("Content-type", "text/plain")
		w.WriteHeader(200)
		data.PipeTo(w)
	})

	router.Get("/api/templates", func(w http.ResponseWriter, r *http.Request, next RouteNextFn) {
		apiCall(w, func() ([]templatectr.Template, error) {
			templates := templatectr.GetTemplates()

			return templates, nil
		})
	})

	router.Get("/api/getTemplate", func(w http.ResponseWriter, r *http.Request, next RouteNextFn) {
		apiCall(w, func() (*templatectr.Template, error) {
			id := r.URL.Query().Get("id")

			template, err := templatectr.GetTemplate(id)
			if err != nil {
				return nil, err
			}

			return template, nil
		})
	})

	type SetTemplatePayload struct {
		PrevRelPlace string               `json:"prevPlace"`
		Template     templatectr.Template `json:"template"`
	}

	router.Post("/api/setTemplate", func(w http.ResponseWriter, r *http.Request, next RouteNextFn) {
		apiCall(w, func() (string, error) {
			payload, err := utils.ParseJson[SetTemplatePayload](r.Body)
			if err != nil {
				return "", err
			}

			isNew := len(payload.PrevRelPlace) == 0

			if !isNew && payload.PrevRelPlace != payload.Template.Place {
				err = templatectr.MoveTemplate(payload.PrevRelPlace, payload.Template.Place)
				if err != nil {
					return "", err
				}
			}

			err = templatectr.WriteTemplate(payload.Template, isNew)
			if err != nil {
				return "", err
			}

			return "ok", nil
		})
	})

	router.Get("/api/readTemplate", func(w http.ResponseWriter, r *http.Request, next RouteNextFn) {
		apiCall(w, func() (*templatectr.Template, error) {
			relPlace := r.URL.Query().Get("place")

			template, err := templatectr.ReadTemplate(relPlace)
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

	router.Post("/api/moveTemplate", func(w http.ResponseWriter, r *http.Request, next RouteNextFn) {
		apiCall(w, func() (string, error) {
			payload, err := utils.ParseJson[MoveTemplatePayload](r.Body)
			if err != nil {
				return "", err
			}

			err = templatectr.MoveTemplate(payload.RelFrom, payload.RelTo)
			if err != nil {
				return "", err
			}

			return "ok", nil
		})
	})

	type RemoveTemplatePayload struct {
		RelPlace string `json:"place"`
	}

	router.Post("/api/removeTemplate", func(w http.ResponseWriter, r *http.Request, next RouteNextFn) {
		apiCall(w, func() (string, error) {
			payload, err := utils.ParseJson[RemoveTemplatePayload](r.Body)
			if err != nil {
				return "", err
			}

			err = templatectr.RemoveTemplate(payload.RelPlace)
			if err != nil {
				return "", err
			}

			return "ok", nil
		})
	})

	router.Get("/api/migrateTemplates", func(w http.ResponseWriter, r *http.Request, next RouteNextFn) {
		apiCall(w, func() (string, error) {
			templatectr.MigrateTemplates(*config)

			return "ok", nil
		})
	})
}

func handleMemStorage(router *Router, memStorage *memstorage.MemStorage) {
	router.Post("/api/memStorage/get", func(w http.ResponseWriter, r *http.Request, next RouteNextFn) {
		apiCall(w, func() (map[string]interface{}, error) {
			keys, err := utils.ParseJson[[]string](r.Body)
			if err != nil {
				return nil, err
			}
			result := memStorage.GetKeys(*keys)
			return result, nil
		})
	})

	router.Post("/api/memStorage/set", func(w http.ResponseWriter, r *http.Request, next RouteNextFn) {
		apiCall(w, func() (string, error) {
			keyValue, err := utils.ParseJson[map[string]interface{}](r.Body)
			if err == nil {
				err = memStorage.SetObject(*keyValue)
			}
			return "ok", err
		})
	})

	router.Post("/api/memStorage/del", func(w http.ResponseWriter, r *http.Request, next RouteNextFn) {
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
