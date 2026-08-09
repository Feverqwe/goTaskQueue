package taskQueue

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"goTaskQueue/internal/cfg"
	"log"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/natefinch/atomic"
)

type Queue struct {
	Tasks  []*Task `json:"tasks"`
	idTask map[string]*Task
	ch     chan int
	mu     sync.RWMutex
}

func (s *Queue) GetAll(config *cfg.Config) []*Task {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return append([]*Task(nil), s.Tasks...)
}

func (s *Queue) Get(id string) (*Task, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	task, ok := s.idTask[id]
	if !ok {
		return nil, errors.New("Task not found")
	}
	return task, nil
}

func (s *Queue) Add(config *cfg.Config, taskBase TaskBase) *Task {
	s.mu.Lock()
	id := s.getIdLocked()
	task := NewTask(id, taskBase)
	task.Init(config, s)
	s.Tasks = append(s.Tasks, task)
	s.idTask[task.Id] = task
	s.mu.Unlock()

	s.Save()
	return task
}

func (s *Queue) Clone(config *cfg.Config, id string) (*Task, error) {
	origTask, err := s.Get(id)
	if err != nil {
		return nil, err
	}

	task := s.Add(config, origTask.taskBaseSnapshot())

	return task, nil
}

func (s *Queue) Del(config *cfg.Config, id string) error {
	s.mu.Lock()
	task, ok := s.idTask[id]
	if !ok {
		s.mu.Unlock()
		return errors.New("Task not found")
	}
	if !task.canDelete() {
		s.mu.Unlock()
		return errors.New("Task is not finished")
	}

	index := -1
	for i, t := range s.Tasks {
		if t == task {
			index = i
			break
		}
	}
	if index == -1 {
		s.mu.Unlock()
		return errors.New("Task not found in queue")
	}

	s.Tasks = append(s.Tasks[:index], s.Tasks[index+1:]...)
	delete(s.idTask, task.Id)
	s.mu.Unlock()

	s.Save()

	if task.taskBaseSnapshot().IsWriteLogs {
		err := CleanTaskLogs(config, task.Id)
		if err != nil {
			log.Println("Clean task logs error", err)
		}
	}

	return nil
}

func (s *Queue) HasInstance(templatePlace string) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, t := range s.Tasks {
		if t.isActiveInstance(templatePlace) {
			return true
		}
	}
	return false
}

func (s *Queue) beginRun(task *Task) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	queuedTask, ok := s.idTask[task.Id]
	if !ok || queuedTask != task {
		return errors.New("Task not found")
	}

	task.mu.Lock()
	defer task.mu.Unlock()
	if task.IsStarted || task.isStarting {
		return errors.New("Task already started")
	}

	if task.IsSingleInstance && task.TemplatePlace != "" {
		for _, other := range s.Tasks {
			if other == task {
				continue
			}
			if other.isActiveInstance(task.TemplatePlace) {
				return fmt.Errorf("active instance exists %v", task.TemplatePlace)
			}
		}
	}

	task.isStarting = true
	return nil
}

func (s *Queue) getIdLocked() string {
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
	select {
	case s.ch <- 1:
	default:
	}
}

func (s *Queue) WriteQueue() error {
	s.mu.RLock()
	tasks := append([]*Task(nil), s.Tasks...)
	s.mu.RUnlock()

	data, err := json.Marshal(struct {
		Tasks []*Task `json:"tasks"`
	}{Tasks: tasks})
	if err != nil {
		return err
	}
	return atomic.WriteFile(getQueuePath(), bytes.NewReader(data))
}

func (s *Queue) RunOnBoot(config *cfg.Config) {
	unic := map[string]bool{}
	ids := make([]string, 0)

	for _, task := range s.GetAll(config) {
		taskBase := task.taskBaseSnapshot()
		if taskBase.IsStartOnBoot && !unic[taskBase.TemplatePlace] {
			unic[taskBase.TemplatePlace] = true
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

	now := time.Now()
	for _, task := range s.GetAll(config) {
		if task.isExpired(now) {
			delIds = append(delIds, task.Id)
		}
	}

	for _, id := range delIds {
		if err := s.Del(config, id); err != nil {
			log.Printf("Unable clenup task %s, cause: %s\n", id, err.Error())
		}
	}
}

func (s *Queue) CleanupByStatuses(statuses []string, config *cfg.Config) {
	var delIds []string

	for _, t := range s.GetAll(config) {
		for _, s := range statuses {
			if t.hasExactStatus(s) {
				delIds = append(delIds, t.Id)
				break
			}
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
		var persisted struct {
			Tasks []*Task `json:"tasks"`
		}
		err = json.Unmarshal(data, &persisted)
		if err == nil {
			queue.Tasks = persisted.Tasks
		}
	}
	if err != nil && !os.IsNotExist(err) {
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
