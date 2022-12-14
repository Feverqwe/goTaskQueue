package taskQueue

import (
	"errors"
	"fmt"
	"goTaskQueue/internal/cfg"
	gzbuffer "goTaskQueue/internal/gzBuffer"
	"io"
	"os"
	"os/exec"
	"sync"
	"syscall"
	"time"

	"github.com/creack/pty"
)

const PtyMaxLogSize = gzbuffer.ChunkSize * 4 * 4
const PtyTrimLogSize = PtyMaxLogSize / 4
const CombinedBufSize = 128 * 1024

type TaskLink struct {
	Name  string `json:"name"`
	Type  string `json:"type"`
	Url   string `json:"url"`
	Title string `json:"title"`
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
	IsStarted      bool               `json:"isStarted"`
	IsFinished     bool               `json:"isFinished"`
	IsCanceled     bool               `json:"isCanceled"`
	IsError        bool               `json:"isError"`
	State          string             `json:"state"`
	Stdout         *gzbuffer.GzBuffer `json:"-"`
	Stderr         *gzbuffer.GzBuffer `json:"-"`
	Combined       *gzbuffer.GzBuffer `json:"-"`
	Error          string             `json:"error"`
	CreatedAt      time.Time          `json:"createdAt"`
	StartedAt      time.Time          `json:"startedAt"`
	FinishedAt     time.Time          `json:"finishedAt"`
	IsPty          bool               `json:"isPty"`
	IsOnlyCombined bool               `json:"isOnlyCombined"`
	mu             sync.Mutex
	cmu            sync.RWMutex
	qCh            []chan int
	stdin          io.Writer
	combinedOffset int
	Links          []*TaskLink `json:"links"`
	queue          *Queue
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

	s.stdin = f

	output := gzbuffer.NewGzBuffer(CombinedBufSize)
	s.Combined = output
	s.Stdout = output

	go func() {
		chunk := make([]byte, 16*1024)
		for {
			bytes, err := f.Read(chunk)
			if bytes > 0 {
				output.Write(chunk[0:bytes])

				if output.Len() > PtyMaxLogSize {
					if newOutput, err := output.Slice(PtyTrimLogSize, true); err == nil {
						// fmt.Println("trim")
						approxOff := output.Len() - newOutput.Len()
						s.cmu.Lock()
						output = newOutput
						s.Stdout = newOutput
						s.Combined = newOutput
						s.combinedOffset += approxOff
						s.cmu.Unlock()
					}
				}

				go s.pushChanges(1)
			}
			if err == io.EOF || err != nil {
				break
			}
		}
	}()

	s.StartedAt = time.Now()

	s.process = process
	s.IsStarted = true
	s.syncStatusAndSave()

	go func() {
		defer f.Close()

		err = process.Wait()

		s.FinishedAt = time.Now()

		s.IsFinished = true
		if err != nil {
			s.IsError = true
			s.Error = err.Error()
		}

		s.syncStatusAndSave()

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

	output := gzbuffer.NewGzBuffer(CombinedBufSize)
	s.Combined = output

	stdin, _ := process.StdinPipe()
	s.stdin = stdin

	for _, pT := range pipes {
		var pipe io.ReadCloser
		var buffer *gzbuffer.GzBuffer
		if !s.IsOnlyCombined {
			buffer = gzbuffer.NewGzBuffer(0)
		}
		if pT == Err {
			pipe, _ = process.StderrPipe()
			s.Stderr = buffer
		} else {
			pipe, _ = process.StdoutPipe()
			s.Stdout = buffer
		}

		go func() {
			chunk := make([]byte, 16*1024)
			for {
				bytes, err := pipe.Read(chunk)
				if bytes > 0 {
					if buffer != nil {
						buffer.Write(chunk[0:bytes])
					}

					output.Write(chunk[0:bytes])

					go s.pushChanges(1)
				}
				if err == io.EOF || err != nil {
					break
				}
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
	s.syncStatusAndSave()

	go func() {
		defer stdin.Close()

		err = process.Wait()

		s.FinishedAt = time.Now()

		s.IsFinished = true
		if err != nil {
			s.IsError = true
			s.Error = err.Error()
		}

		if s.Stderr != nil {
			s.Stderr.Finish()
		}
		s.cmu.RLock()
		if s.Stdout != nil {
			s.Stdout.Finish()
		}
		if s.Combined != nil {
			s.Combined.Finish()
		}
		s.cmu.RUnlock()

		s.syncStatusAndSave()

		go s.pushChanges(0)
	}()

	return nil
}

func (s *Task) ReadCombined(offset int) (int, []byte, error) {
	s.cmu.RLock()
	combined := s.Combined
	combinedOffset := s.combinedOffset
	s.cmu.RUnlock()
	if offset == combined.Len()+combinedOffset {
		return offset, make([]byte, 0), nil
	}
	if offset == -1 {
		if combined.Len() > CombinedBufSize {
			offset = combinedOffset + combined.Len() - CombinedBufSize
		} else {
			offset = combinedOffset
		}
	}
	if offset < combinedOffset {
		fmt.Println("skip", combinedOffset-offset)
		offset = combinedOffset
	}
	fragment, err := combined.Read(offset - combinedOffset)
	if err != nil {
		return 0, nil, err
	}
	offset += len(fragment)
	return offset, fragment, nil
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
	if f, ok := s.stdin.(*os.File); ok {
		return pty.Setsize(f, &ws)
	}
	return nil
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
		s.syncStatusAndSave()
	}
	return err
}

func (s *Task) Signal(sig syscall.Signal) error {
	if s.IsFinished {
		return errors.New("process_finished")
	}
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

func (s *Task) AddLink(Name string, Type string, Url string, Title string) {
	link, _ := s.GetLink(Name)
	if link == nil {
		link := TaskLink{
			Name:  Name,
			Type:  Type,
			Url:   Url,
			Title: Title,
		}
		s.Links = append(s.Links, &link)
	} else {
		link.Type = Type
		link.Url = Url
		link.Title = Title
	}
	s.queue.Save()
}

func (s *Task) DelLink(name string) {
	_, index := s.GetLink(name)
	if index != -1 {
		s.Links = append(s.Links[:index], s.Links[:index+1]...)
	}
	s.queue.Save()
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

func (s *Task) syncStatusAndSave() {
	s.syncStatus()
	s.queue.Save()
}

func (s *Task) Init(queue *Queue) {
	s.queue = queue
	if s.IsStarted && !s.IsFinished {
		s.IsCanceled = true
		s.IsFinished = true
		s.syncStatus()
	}
}

func (s *Task) SetLabel(label string) {
	s.Label = label
	s.queue.Save()
}

func NewTask(id string, command string, label string, isPty bool, isOnlyCombined bool) *Task {
	task := Task{
		Id:             id,
		Label:          label,
		Command:        command,
		CreatedAt:      time.Now(),
		IsPty:          isPty,
		IsOnlyCombined: isOnlyCombined,
		Links:          make([]*TaskLink, 0),
	}

	task.syncStatus()

	return &task
}
