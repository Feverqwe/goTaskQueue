package taskqueue

import (
	"errors"
	"io"
	"os"
	"os/exec"
	"sync"
)

const LogSize = 4 * 1024 * 1024

type Task struct {
	Id         string `json:"id"`
	Command    string `json:"command"`
	process    *exec.Cmd
	IsStarted  bool    `json:"-"`
	IsFinished bool    `json:"-"`
	IsCanceled bool    `json:"-"`
	IsError    bool    `json:"-"`
	State      string  `json:"state"`
	Stdout     *[]byte `json:"-"`
	Stderr     *[]byte `json:"-"`
	Combined   *[]byte `json:"-"`
	Error      string  `json:"error"`
	mu         sync.Mutex
	qCh        []chan int
	stdin      io.WriteCloser
}

func (s *Task) Run() error {
	process := exec.Command("sh", "-c", s.Command)

	const Out = "out"
	const Err = "err"

	pipes := []string{Out, Err}

	output := make([]byte, 0)
	s.Combined = &output

	stdin, _ := process.StdinPipe()
	s.stdin = stdin

	for _, pT := range pipes {
		var pipe io.ReadCloser
		buffer := make([]byte, 0)
		if pT == Err {
			pipe, _ = process.StderrPipe()
			s.Stderr = &buffer
		} else {
			pipe, _ = process.StdoutPipe()
			s.Stdout = &buffer
		}

		go func() {
			chunk := make([]byte, 16*1024)
			for {
				len, err := pipe.Read(chunk)
				if err == io.EOF || err != nil {
					break
				}
				buffer = append(buffer, chunk[0:len]...)
				output = append(output, chunk[0:len]...)

				// n := len(buffer)
				// if n > LogSize {
				// 	buffer = buffer[n-LogSize:]
				// }

				// n = len(output)
				// if n > LogSize {
				// 	output = output[n-LogSize:]
				// }

				go s.pushChanges(1)
			}
		}()
	}

	err := process.Start()
	if err != nil {
		return err
	}

	s.process = process
	s.IsStarted = true
	s.syncStatus()

	go func() {
		defer stdin.Close()

		err = process.Wait()

		s.IsFinished = true
		if err != nil {
			s.IsError = true
			s.Error = err.Error()
		}

		s.syncStatus()

		go s.pushChanges(0)
	}()

	return nil
}

func (s *Task) Send(data string) error {
	if s.stdin == nil {
		return errors.New("stdin_is_empty")
	}
	_, err := io.WriteString(s.stdin, data)
	return err
}

func (s *Task) Wait() int {
	if s.IsFinished {
		return 0
	}
	s.mu.Lock()
	ch := make(chan int)
	s.qCh = append(s.qCh, ch)
	s.mu.Unlock()
	return <-ch
}

func (s *Task) Kill() error {
	err := s.process.Process.Kill()
	if err == nil {
		s.IsCanceled = true
		s.syncStatus()
	}
	return err
}

func (s *Task) Signal(sig os.Signal) error {
	err := s.process.Process.Signal(sig)
	return err
}

func (s *Task) pushChanges(value int) {
	s.mu.Lock()
	q := s.qCh
	s.qCh = make([]chan int, 0)
	s.mu.Unlock()
	for _, ch := range q {
		ch <- value
	}
}

func (s *Task) syncStatus() {
	if s.IsCanceled {
		s.State = "CANCELED"
	} else if s.IsError {
		s.State = "ERROR"
	} else if s.IsFinished {
		s.State = "FINISHED"
	} else if s.IsStarted {
		s.State = "STARTED"
	} else {
		s.State = "IDLE"
	}
}
