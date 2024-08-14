package taskQueue

import (
	"bytes"
	"encoding/json"
	"errors"
	"goTaskQueue/internal/cfg"
	"log"
	"os"
	"path/filepath"
	"time"

	"github.com/google/uuid"
	"github.com/natefinch/atomic"
)

type Queue struct {
	Tasks  []*Task `json:"tasks"`
	idTask map[string]*Task
	ch     chan int
}

func (s *Queue) GetAll(config *cfg.Config) []*Task {
	return s.Tasks
}

func (s *Queue) Get(id string) (*Task, error) {
	task, ok := s.idTask[id]
	if !ok {
		return nil, errors.New("Task not found")
	}
	return task, nil
}

func (s *Queue) Add(config *cfg.Config, taskBase TaskBase) *Task {
	id := s.getId()
	task := NewTask(id, taskBase)
	s.Tasks = append(s.Tasks, task)
	s.idTask[task.Id] = task
	task.Init(config, s)
	s.Save()
	return task
}

func (s *Queue) Clone(config *cfg.Config, id string) (*Task, error) {
	origTask, err := s.Get(id)
	if err != nil {
		return nil, err
	}

	task := s.Add(config, origTask.TaskBase)

	return task, nil
}

func (s *Queue) Del(config *cfg.Config, id string) error {
	task, err := s.Get(id)
	if err != nil {
		return err
	}
	if task.IsStarted && !task.IsFinished {
		return errors.New("Task is not finished")
	}

	var index int
	for i, t := range s.Tasks {
		if t.Id == id {
			index = i
			break
		}
	}

	s.Tasks = append(s.Tasks[:index], s.Tasks[index+1:]...)
	delete(s.idTask, task.Id)

	s.Save()

	if task.IsWriteLogs {
		err := CleanTaskLogs(config, task.Id)
		if err != nil {
			log.Println("Clean task logs error", err)
		}
	}

	return nil
}

func (s *Queue) HasInstance(templatePlace string) bool {
	for _, t := range s.Tasks {
		if t.IsStarted && !t.IsFinished && t.TemplatePlace == templatePlace {
			return true
		}
	}
	return false
}

func (s *Queue) getId() string {
	var id string
	for {
		id = uuid.New().String()[:7]
		_, ok := s.idTask[id]
		if !ok {
			break
		}
	}
	return id
}

func (s *Queue) Save() {
	if len(s.ch) == 0 {
		s.ch <- 1
	}
}

func (s *Queue) WriteQueue() error {
	reader := bytes.NewReader(nil)
	if data, err := json.Marshal(s); err == nil {
		reader.Reset(data)
		path := getQueuePath()
		err = atomic.WriteFile(path, reader)
		return err
	}
	return nil
}

func (s *Queue) RunOnBoot(config *cfg.Config) {
	unic := map[string]bool{}
	ids := make([]string, 0)
	for _, task := range s.Tasks {
		if task.IsStartOnBoot && !unic[task.TemplatePlace] {
			unic[task.TemplatePlace] = true
			ids = append(ids, task.Id)
		}
	}

	for _, id := range ids {
		task, err := s.Clone(config, id)
		if err == nil {
			err = task.Run(config, s)
		}
		if err != nil {
			log.Println("run task on boot error", id, err)
		}
	}
}

func (s *Queue) Cleanup(config *cfg.Config) {
	var delIds []string
	for _, task := range s.Tasks {
		if !task.IsStarted ||
			!task.IsFinished ||
			task.IsCanceled ||
			task.IsError ||
			task.ExpiresAt.IsZero() {
			continue
		}

		if time.Now().After(task.ExpiresAt) {
			delIds = append(delIds, task.Id)
		}
	}

	for _, id := range delIds {
		if err := s.Del(config, id); err != nil {
			log.Printf("Unable clenup task %s, cause: %s\n", id, err.Error())
		}
	}
}

func LoadQueue(config *cfg.Config) *Queue {
	queue := NewQueue()

	path := getQueuePath()
	data, err := os.ReadFile(path)
	if err == nil {
		err = json.Unmarshal(data, &queue)
	}
	if err != nil && os.IsNotExist(err) {
		log.Println("Load queue error", err)
	}

	for _, task := range queue.Tasks {
		queue.idTask[task.Id] = task
		task.Init(config, queue)
	}

	go func() {
		for {
			<-queue.ch
			err := queue.WriteQueue()
			if err != nil {
				log.Println("Write queue error", err)
			}
		}
	}()

	return queue
}

func getQueuePath() string {
	return filepath.Join(cfg.GetProfilePath(), "queue.json")
}

func NewQueue() *Queue {
	queue := &Queue{
		Tasks:  make([]*Task, 0),
		idTask: make(map[string]*Task),
		ch:     make(chan int, 1),
	}
	return queue
}
