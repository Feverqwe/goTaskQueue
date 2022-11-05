package taskqueue

import (
	"errors"

	"github.com/google/uuid"
)

type Queue struct {
	tasks  []*Task
	idTask map[string]*Task
}

func (s *Queue) GetAll() []*Task {
	return s.tasks
}

func (s *Queue) Get(id string) (*Task, error) {
	task, ok := s.idTask[id]
	if !ok {
		return nil, errors.New("Task not found")
	}
	return task, nil
}

func (s *Queue) Add(command string, label string) *Task {
	task := &Task{
		Id:      uuid.New().String()[:7],
		Label:   label,
		Command: command,
	}
	task.syncStatus()
	s.idTask[task.Id] = task
	s.tasks = append(s.tasks, task)
	return task
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
	for i, t := range s.tasks {
		if t.Id == id {
			index = i
			break
		}
	}

	s.tasks = append(s.tasks[:index], s.tasks[index+1:]...)
	delete(s.idTask, task.Id)

	return nil
}

func NewQueue() *Queue {
	queue := &Queue{
		tasks:  make([]*Task, 0),
		idTask: make(map[string]*Task),
	}
	return queue
}
