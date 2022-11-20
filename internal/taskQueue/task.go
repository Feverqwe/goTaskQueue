package taskQueue

import (
	"fmt"
	"goTaskQueue/internal/cfg"
	"io"
	"os"
	"os/exec"
	"sync"
	"syscall"
	"time"

	"github.com/creack/pty"
)

const PtyLogSize = 4 * 1024 * 1024

type TaskLink struct {
	Name string `json:"name"`
	Type string `json:"type"`
	Url  string `json:"url"`
}

type PtyScreenSize struct {
	Rows int `json:"rows"`
	Cols int `json:"cols"`
	X    int `json:"x"`
	Y    int `json:"y"`
}

type Task struct {
	Id             string `json:"id"`
	Label          string `json:"label"`
	Command        string `json:"command"`
	process        *exec.Cmd
	IsStarted      bool      `json:"-"`
	IsFinished     bool      `json:"-"`
	IsCanceled     bool      `json:"-"`
	IsError        bool      `json:"-"`
	State          string    `json:"state"`
	Stdout         *[]byte   `json:"-"`
	Stderr         *[]byte   `json:"-"`
	Combined       *[]byte   `json:"-"`
	Error          string    `json:"error"`
	CreatedAt      time.Time `json:"createdAt"`
	StartedAt      time.Time `json:"startedAt"`
	FinishedAt     time.Time `json:"finishedAt"`
	IsPty          bool      `json:"isPty"`
	mu             sync.Mutex
	combinedMu     sync.Mutex
	qCh            []chan int
	stdin          io.WriteCloser
	pty            *os.File
	combinedOffset int
	Links          []*TaskLink `json:"links"`
}

func (s *Task) Run(runAs []string, config *cfg.Config) error {
	if s.IsPty {
		return s.RunPty(runAs, config)
	} else {
		return s.RunDirect(runAs, config)
	}
}

func (s *Task) RunPty(runAs []string, config *cfg.Config) error {
	runCommand := runAs[0]
	runArgs := make([]string, 0)
	if len(runAs) > 1 {
		runArgs = append(runArgs, runAs[1:]...)
	}
	runArgs = append(runArgs, s.Command)

	process := exec.Command(runCommand, runArgs...)
	process.Env = append(append(process.Env, config.PtyRunEnv...), "TASK_QUEUE_ID="+s.Id, "TASK_QUEUE_URL="+config.GetBrowserAddress())

	f, err := pty.Start(process)
	if err != nil {
		return err
	}

	s.pty = f

	output := make([]byte, 0)
	s.Combined = &output
	s.Stdout = &output

	s.stdin = &closeOnce{File: f}

	go func() {
		chunk := make([]byte, 16*1024)
		for {
			bytes, err := f.Read(chunk)
			if err == io.EOF || err != nil {
				break
			}
			output = append(output, chunk[0:bytes]...)

			if len(output) > PtyLogSize {
				off := len(output) - PtyLogSize
				output = output[off:]
				s.combinedOffset += off
			}

			go s.pushChanges(1)
		}
	}()

	s.StartedAt = time.Now()

	s.process = process
	s.IsStarted = true
	s.syncStatus()

	go func() {
		defer f.Close()

		err = process.Wait()

		s.FinishedAt = time.Now()

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

func (s *Task) RunDirect(runAs []string, config *cfg.Config) error {
	runCommand := runAs[0]
	runArgs := make([]string, 0)
	if len(runAs) > 1 {
		runArgs = append(runArgs, runAs[1:]...)
	}
	runArgs = append(runArgs, s.Command)

	process := exec.Command(runCommand, runArgs...)
	process.Env = append(process.Env, "TASK_QUEUE_ID="+s.Id, "TASK_QUEUE_URL="+config.GetBrowserAddress())

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
				bytes, err := pipe.Read(chunk)
				if err == io.EOF || err != nil {
					break
				}
				buffer = append(buffer, chunk[0:bytes]...)

				s.combinedMu.Lock()
				output = append(output, chunk[0:bytes]...)
				s.combinedMu.Unlock()

				go s.pushChanges(1)
			}
		}()
	}

	err := process.Start()
	if err != nil {
		return err
	}

	s.StartedAt = time.Now()

	s.process = process
	s.IsStarted = true
	s.syncStatus()

	go func() {
		defer stdin.Close()

		err = process.Wait()

		s.FinishedAt = time.Now()

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

func (s *Task) ReadCombined(offset int) (int, []byte) {
	if offset == -1 {
		offset = s.combinedOffset
		if len(*s.Combined) > 100*1024 {
			offset += len(*s.Combined) - 100*1024
		}
	}
	if offset < s.combinedOffset {
		fmt.Println("skip", s.combinedOffset-offset)
		offset = s.combinedOffset
	}
	fragment := (*s.Combined)[offset-s.combinedOffset:]
	offset += len(fragment)
	return offset, fragment
}

func (s *Task) Send(data string) error {
	if !s.IsStarted || s.IsFinished {
		return nil
	}

	_, err := io.WriteString(s.stdin, data)
	return err
}

func (s *Task) Resize(screenSize *PtyScreenSize) error {
	if !s.IsPty {
		return nil
	}

	ws := pty.Winsize{
		Rows: uint16(screenSize.Rows),
		Cols: uint16(screenSize.Cols),
		X:    uint16(screenSize.X),
		Y:    uint16(screenSize.Y),
	}
	return pty.Setsize(s.pty, &ws)
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
	err := s.Signal(syscall.SIGKILL)
	if err == nil {
		s.IsCanceled = true
		s.syncStatus()
	}
	return err
}

func (s *Task) Signal(sig syscall.Signal) error {
	return s.process.Process.Signal(sig)
}

func (s *Task) GetLink(name string) (*TaskLink, int) {
	for pos, link := range s.Links {
		if link.Name == name {
			return link, pos
		}
	}
	return nil, -1
}

func (s *Task) AddLink(Name string, Type string, Url string) {
	link, _ := s.GetLink(Name)
	if link == nil {
		link := TaskLink{
			Name: Name,
			Type: Type,
			Url:  Url,
		}
		s.Links = append(s.Links, &link)
	} else {
		link.Type = Type
		link.Url = Url
	}
}

func (s *Task) DelLink(name string) {
	_, index := s.GetLink(name)
	if index != -1 {
		s.Links = append(s.Links[:index], s.Links[:index+1]...)
	}
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

type closeOnce struct {
	*os.File

	once sync.Once
	err  error
}

func (c *closeOnce) Close() error {
	c.once.Do(c.close)
	return c.err
}

func (c *closeOnce) close() {
	c.err = c.File.Close()
}

func NewTask(id string, command string, label string, isPty bool) *Task {
	task := Task{
		Id:        id,
		Label:     label,
		Command:   command,
		CreatedAt: time.Now(),
		IsPty:     isPty,
		Links:     make([]*TaskLink, 0),
	}

	task.syncStatus()

	return &task
}
