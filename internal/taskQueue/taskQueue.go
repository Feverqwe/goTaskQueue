package taskQueue

import (
	"bytes"
	"encoding/json"
	"errors"
	"goTaskQueue/internal/cfg"
	"log"
	"os"
	"path/filepath"

	"github.com/google/uuid"
	"github.com/natefinch/atomic"
)

type Queue struct {
	Tasks  []*Task `json:"tasks"`
	idTask map[string]*Task
	ch     chan int
}

func (s *Queue) GetAll() []*Task {
	return s.Tasks
}

func (s *Queue) Get(id string) (*Task, error) {
	task, ok := s.idTask[id]
	if !ok {
		return nil, errors.New("Task not found")
	}
	return task, nil
}

func (s *Queue) Add(command string, label string, isPty bool) *Task {
	id := s.getId()
	task := NewTask(id, command, label, isPty)
	s.Tasks = append(s.Tasks, task)
	s.idTask[task.Id] = task
	task.Init(s)
	s.Save()
	return task
}

func (s *Queue) Clone(id string) (*Task, error) {
	origTask, err := s.Get(id)
	if err != nil {
		return nil, err
	}

	task := s.Add(origTask.Command, origTask.Label, origTask.IsPty)

	return task, nil
}

func (s *Queue) Del(id string) error {
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

	return nil
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
	if data, err := json.Marshal(s); err == nil {
		reader := bytes.NewReader(data)
		path := getQueuePath()
		err = atomic.WriteFile(path, reader)
		return err
	}
	return nil
}

func LoadQueue() *Queue {
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
		task.Init(queue)
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
