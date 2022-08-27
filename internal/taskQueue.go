package internal

import (
	"errors"
	"io"
	"os/exec"

	"github.com/google/uuid"
)

const LogSize = 4 * 1024 * 1024

type TaskQueue struct {
	tasks  []*Task
	idTask map[string]*Task
}

func (self *TaskQueue) GetAll() []*Task {
	return self.tasks
}

func (self *TaskQueue) Get(id string) (*Task, error) {
	task, ok := self.idTask[id]
	if !ok {
		return nil, errors.New("Task not found")
	}
	return task, nil
}

func (self *TaskQueue) Add(command string) {
	task := &Task{
		Id:      self.getId(),
		Command: command,
	}
	self.idTask[task.Id] = task
	self.tasks = append(self.tasks, task)
}

func (self *TaskQueue) getId() string {
	var id string
	for {
		id = uuid.New().String()
		if _, ok := self.idTask[id]; !ok {
			break
		}
	}
	return id
}

func (self *TaskQueue) Del(id string) error {
	task, err := self.Get(id)
	if err != nil {
		return err
	}
	if !task.IsFinished {
		return errors.New("Task is not finished")
	}

	var index int
	for i, t := range self.tasks {
		if t.Id == id {
			index = i
			break
		}
	}

	self.tasks = append(self.tasks[:index], self.tasks[index+1:]...)
	delete(self.idTask, task.Id)

	return nil
}

type Task struct {
	Id         string
	Command    string
	process    *exec.Cmd
	IsStarted  bool
	IsFinished bool
	Stdout     *[]byte
	Stderr     *[]byte
	Err        error
}

func (self *Task) run() error {
	process := exec.Command(self.Command)

	const Out = "out"
	const Err = "err"

	pipes := []string{Out, Err}

	for _, pT := range pipes {
		var pipe io.ReadCloser
		var buffer []byte
		if pT == Err {
			pipe, _ = process.StderrPipe()
			self.Stderr = &buffer
		} else {
			pipe, _ = process.StdoutPipe()
			self.Stdout = &buffer
		}

		go func() {
			chunk := make([]byte, 4)
			for {
				_, err := pipe.Read(chunk)
				if err == io.EOF || err != nil {
					break
				}
				buffer = append(buffer, chunk...)

				n := len(buffer)
				if n > LogSize {
					buffer = buffer[n-LogSize:]
				}
			}
		}()
	}

	err := process.Start()
	if err != nil {
		return err
	}

	self.process = process
	self.IsStarted = true

	go func() {
		err = process.Wait()

		self.IsFinished = true
		if err != nil {
			self.Err = err
		}
	}()

	return nil
}

func (self *Task) Send(data []byte) error {
	pipe, err := self.process.StdinPipe()
	if err != nil {
		return err
	}
	defer pipe.Close()
	_, err = pipe.Write(data)
	if err != nil {
		return err
	}
	return nil
}

func (self *Task) kill() error {
	return self.process.Process.Kill()
}
