package internal

import (
	"encoding/json"
	"fmt"
	"goTaskQueue/internal/cfg"
	memstorage "goTaskQueue/internal/memStorage"
	"goTaskQueue/internal/shared"
	"goTaskQueue/internal/taskQueue"
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

	router.All("^/api/", gzipHandler.ServeHTTP)
}

func handleFobidden(router *Router) {
	router.Use(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(403)
	})
}

func handleAction(router *Router, config *cfg.Config, queue *taskQueue.Queue, callChan chan string) {
	type GetTaskPayload struct {
		Id string `json:"id"`
	}

	type CloneTaskPayload struct {
		Id    string `json:"id"`
		IsRun bool   `json:"isRun"`
	}

	type SignalTaskPayload struct {
		Id     string `json:"id"`
		Signal int    `json:"signal"`
	}

	type AddTaskPayload struct {
		Command          *string           `json:"command"`
		Label            *string           `json:"label"`
		Group            *string           `json:"group"`
		IsPty            *bool             `json:"isPty"`
		IsOnlyCombined   *bool             `json:"isOnlyCombined"`
		IsSingleInstance *bool             `json:"isSingleInstance"`
		IsStartOnBoot    *bool             `json:"isStartOnBoot"`
		IsWriteLogs      *bool             `json:"isWriteLogs"`
		TemplatePlace    string            `json:"templatePlace"`
		TemplateId       string            `json:"templateId"`
		Variables        map[string]string `json:"variables"`
		IsRun            bool              `json:"isRun"`
		TTL              *int64            `json:"ttl"`
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
			tasks := queue.GetAll(config)
			return tasks, nil
		})
	})

	router.Post("/api/delete", func(w http.ResponseWriter, r *http.Request) {
		apiCall(w, func() (string, error) {
			payload, err := utils.ParseJson[GetTaskPayload](r.Body)
			if err != nil {
				return "", err
			}

			err = queue.Del(config, payload.Id)

			return "ok", err
		})
	})

	router.Post("/api/add", func(w http.ResponseWriter, r *http.Request) {
		apiCall(w, func() (*taskQueue.Task, error) {
			payload, err := utils.ParseJson[AddTaskPayload](r.Body)
			if err != nil {
				return nil, err
			}

			var template *taskQueue.Template
			if payload.TemplatePlace != "" {
				template, err = taskQueue.ReadTemplate(payload.TemplatePlace)
				if err != nil {
					return nil, fmt.Errorf("template not found by place %v", payload.TemplatePlace)
				}
			}
			if template == nil && payload.TemplateId != "" {
				template, err = taskQueue.GetTemplate(payload.TemplateId)
				if err != nil {
					return nil, fmt.Errorf("template not found by id %v", payload.TemplateId)
				}
			}
			if template == nil {
				template = &taskQueue.Template{}
			}

			taskBase := taskQueue.TaskBase{}
			taskBase.TemplatePlace = template.Place

			taskBase.Command = setValue(payload.Command, template.Command)
			taskBase.Label = setValue(payload.Label, template.Label)
			taskBase.Group = setValue(payload.Group, template.Group)
			taskBase.IsPty = setValue(payload.IsPty, template.IsPty)
			taskBase.IsOnlyCombined = setValue(payload.IsOnlyCombined, template.IsOnlyCombined)
			taskBase.IsSingleInstance = setValue(payload.IsSingleInstance, template.IsSingleInstance)
			taskBase.IsStartOnBoot = setValue(payload.IsStartOnBoot, template.IsStartOnBoot)
			taskBase.IsWriteLogs = setValue(payload.IsWriteLogs, template.IsWriteLogs)
			taskBase.TTL = setValue(payload.TTL, template.TTL)

			for _, variable := range template.Variables {
				old := fmt.Sprintf("{%v}", variable.Value)
				value, ok := payload.Variables[variable.Value]
				if !ok {
					value = variable.DefaultValue
				}
				taskBase.Command = strings.ReplaceAll(taskBase.Command, old, value)
				taskBase.Label = strings.ReplaceAll(taskBase.Label, old, value)
			}

			task := queue.Add(config, taskBase)

			if payload.IsRun {
				err := task.Run(config, queue)
				if err != nil {
					return nil, err
				}
			}

			return task, err
		})
	})

	router.Post("/api/clone", func(w http.ResponseWriter, r *http.Request) {
		apiCall(w, func() (*taskQueue.Task, error) {
			payload, err := utils.ParseJson[CloneTaskPayload](r.Body)
			if err != nil {
				return nil, err
			}

			task, err := queue.Clone(config, payload.Id)

			if payload.IsRun {
				err = task.Run(config, queue)
				if err != nil {
					return nil, err
				}
			}

			return task, err
		})
	})

	router.Get("/api/task", func(w http.ResponseWriter, r *http.Request) {
		apiCall(w, func() (*taskQueue.Task, error) {
			id := r.URL.Query().Get("id")

			task, err := queue.Get(id)
			return task, err
		})
	})

	router.Post("/api/task/run", func(w http.ResponseWriter, r *http.Request) {
		apiCall(w, func() (string, error) {
			payload, err := utils.ParseJson[GetTaskPayload](r.Body)
			if err != nil {
				return "", err
			}

			task, err := queue.Get(payload.Id)
			if err != nil {
				return "", err
			}

			err = task.Run(config, queue)

			return "ok", err
		})
	})

	router.Post("/api/task/kill", func(w http.ResponseWriter, r *http.Request) {
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

	router.Post("/api/task/signal", func(w http.ResponseWriter, r *http.Request) {
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

	router.Post("/api/task/setLabel", func(w http.ResponseWriter, r *http.Request) {
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

	router.Post("/api/task/addLink", func(w http.ResponseWriter, r *http.Request) {
		apiCall(w, func() (string, error) {
			payload, err := utils.ParseJson[AddLinkPayload](r.Body)
			if err != nil {
				return "", err
			}

			task, err := queue.Get(payload.Id)
			if err != nil {
				return "", err
			}

			task.AddLink(payload.TaskLink)

			return "ok", err
		})
	})

	router.Post("/api/task/delLink", func(w http.ResponseWriter, r *http.Request) {
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

	router.Post("/api/task/addAsset", func(w http.ResponseWriter, r *http.Request) {
		apiCall(w, func() (*taskQueue.TaskAsset, error) {
			payload, err := utils.ParseJson[AddAssetPayload](r.Body)
			if err != nil {
				return nil, err
			}

			task, err := queue.Get(payload.Id)
			if err != nil {
				return nil, err
			}

			asset, err := task.AddAsset(payload.Path)

			return asset, err
		})
	})

	router.Post("/api/task/delAsset", func(w http.ResponseWriter, r *http.Request) {
		apiCall(w, func() (string, error) {
			payload, err := utils.ParseJson[DelAssetPayload](r.Body)
			if err != nil {
				return "", err
			}

			task, err := queue.Get(payload.Id)
			if err != nil {
				return "", err
			}

			task.DelAsset(payload.Path)

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

			config.TemplateOrder = payload.TemplateOrder
			cfg.SaveConfig(*config)

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

		task, err := queue.Get(id)
		if err != nil {
			sendStatus(w, 403)
			return
		}

		var data *shared.DataStore
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

	router.Get("/api/templates", func(w http.ResponseWriter, r *http.Request) {
		apiCall(w, func() ([]taskQueue.Template, error) {
			templates := taskQueue.GetTemplates()

			return templates, nil
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

			isNew := len(payload.PrevRelPlace) == 0

			if !isNew && payload.PrevRelPlace != payload.Template.Place {
				err = taskQueue.MoveTemplate(payload.PrevRelPlace, payload.Template.Place)
				if err != nil {
					return "", err
				}
			}

			err = taskQueue.WriteTemplate(payload.Template, isNew)
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

			err = taskQueue.RemoveTemplate(payload.RelPlace)
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
