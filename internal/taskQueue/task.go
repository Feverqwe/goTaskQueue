package taskQueue

import (
	"errors"
	"fmt"
	"goTaskQueue/internal/cfg"
	gzbuffer "goTaskQueue/internal/gzBuffer"
	logstore "goTaskQueue/internal/logStore"
	"goTaskQueue/internal/shared"
	"io"
	"log"
	"os"
	"os/exec"
	"path"
	"sync"
	"syscall"
	"time"

	"github.com/creack/pty"
)

const PtyLogSize = 4 * 1024 * 1025
const PtyTrimLimit = PtyLogSize * 4
const CombinedLogSize = 1 * 1024 * 1025
const CombinedLogTrimLimit = CombinedLogSize * 5
const MemBufSize = 256 * 1024
const HistorySize = 64 * 1024

const LOG_COMBINED = "combined"
const LOG_STDOUT = "out"
const LOG_STDERR = "err"

type TaskLink struct {
	Name  string `json:"name"`
	Type  string `json:"type"`
	Url   string `json:"url"`
	Title string `json:"title"`
}

type TaskAsset struct {
	Path  string `json:"path"`
	IsDir bool   `json:"isDir"`
}

type PtyScreenSize struct {
	Rows int `json:"rows"`
	Cols int `json:"cols"`
	X    int `json:"x"`
	Y    int `json:"y"`
}

type NewTaskBase struct {
	Label            string `json:"label"`
	Group            string `json:"group"`
	IsPty            bool   `json:"isPty"`
	IsOnlyCombined   bool   `json:"isOnlyCombined"`
	IsSingleInstance bool   `json:"isSingleInstance"`
	IsStartOnBoot    bool   `json:"isStartOnBoot"`
	IsWriteLogs      bool   `json:"isWriteLogs"`
}

type TaskBase struct {
	Command       string `json:"command"`
	TemplatePlace string `json:"templatePlace"`
	NewTaskBase
}

type Task struct {
	TaskBase
	Id             string `json:"id"`
	process        *exec.Cmd
	IsStarted      bool              `json:"isStarted"`
	IsFinished     bool              `json:"isFinished"`
	IsCanceled     bool              `json:"isCanceled"`
	IsError        bool              `json:"isError"`
	State          string            `json:"state"`
	Stdout         *shared.DataStore `json:"-"`
	Stderr         *shared.DataStore `json:"-"`
	Combined       *shared.DataStore `json:"-"`
	Error          string            `json:"error"`
	CreatedAt      time.Time         `json:"createdAt"`
	StartedAt      time.Time         `json:"startedAt"`
	FinishedAt     time.Time         `json:"finishedAt"`
	mu             sync.Mutex
	cmu            sync.RWMutex
	qCh            []chan int
	stdin          io.Writer
	combinedOffset int64
	Links          []TaskLink `json:"links"`
	queue          *Queue
	Assets         []TaskAsset `json:"assets"`
}

func (s *Task) Run(config *cfg.Config, queue *Queue) error {
	if s.IsSingleInstance && s.TemplatePlace != "" && queue.HasInstance(s.TemplatePlace) {
		return fmt.Errorf("active instance exists %v", s.TemplatePlace)
	}

	if s.IsPty {
		return s.RunPty(config)
	} else {
		return s.RunDirect(config)
	}
}

func (s *Task) getEnvVariables(config *cfg.Config) []string {
	return append(config.RunEnv,
		"TASK_QUEUE_ID="+s.Id,
		"TASK_QUEUE_URL="+config.GetBrowserAddress(),
		"TASK_TEMPLATE_PLACE="+s.TemplatePlace,
		"TASK_TEMPLATES_PLACE="+GetTemplatesPath(),
	)
}

func (s *Task) getWorkingDir() string {
	var fullPlace string
	if s.TemplatePlace != "" {
		if place, err := GetPlace(s.TemplatePlace); err != nil {
			log.Println("Get working dir error", s.TemplatePlace, err)
		} else {
			fullPlace = place
		}
	}
	return fullPlace
}

func (s *Task) RunPty(config *cfg.Config) error {
	runAs := config.PtyRun
	runCommand := runAs[0]
	runArgs := make([]string, 0)
	if len(runAs) > 1 {
		runArgs = append(runArgs, runAs[1:]...)
	}
	runArgs = append(runArgs, s.Command)

	process := exec.Command(runCommand, runArgs...)
	process.Env = append(append(process.Env, config.PtyRunEnv...), s.getEnvVariables(config)...)
	process.Dir = s.getWorkingDir()

	f, err := pty.Start(process)
	if err != nil {
		return err
	}

	s.stdin = f

	output, err := s.getStdWriter(config, s.IsWriteLogs, LOG_COMBINED, MemBufSize)
	if err != nil {
		return err
	}
	s.Combined = output

	var wg sync.WaitGroup
	wg.Add(1)

	go func() {
		chunk := make([]byte, 16*1024)
		for {
			bytes, err := f.Read(chunk)
			if bytes > 0 {
				s.cmu.Lock()
				output.Write(chunk[0:bytes])

				if output.Len() > PtyTrimLimit {
					if newOutput, err := output.Slice(PtyLogSize, true); err == nil {
						// fmt.Println("trim")
						approxOff := output.Len() - newOutput.Len()
						output = newOutput
						s.Combined = output
						s.combinedOffset += approxOff
					}
				}
				s.cmu.Unlock()

				go s.pushChanges(1)
			}
			if err != nil {
				if err != io.EOF {
					log.Println("Read pipe ("+LOG_STDOUT+") error:", err)
				}
				break
			}
		}
		wg.Done()
	}()

	s.StartedAt = time.Now()

	s.process = process
	s.IsStarted = true
	s.syncStatusAndSave()

	go func() {
		defer f.Close()

		wg.Wait()
		err = process.Wait()

		s.FinishedAt = time.Now()

		if s.Combined != nil {
			s.cmu.RLock()
			if err := s.Combined.Close(); err != nil {
				log.Println("Close combined error", err)
			}
			s.cmu.RUnlock()
		}

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

func (s *Task) RunDirect(config *cfg.Config) error {
	runAs := config.Run
	runCommand := runAs[0]
	runArgs := make([]string, 0)
	if len(runAs) > 1 {
		runArgs = append(runArgs, runAs[1:]...)
	}
	runArgs = append(runArgs, s.Command)

	process := exec.Command(runCommand, runArgs...)
	process.Env = append(process.Env, s.getEnvVariables(config)...)
	process.Dir = s.getWorkingDir()

	const Out = LOG_STDOUT
	const Err = LOG_STDERR

	pipes := []string{Out, Err}

	output, err := s.getStdWriter(config, s.IsWriteLogs, LOG_COMBINED, MemBufSize)
	if err != nil {
		return err
	}
	s.Combined = output

	stdin, _ := process.StdinPipe()
	s.stdin = stdin

	var wg sync.WaitGroup
	for _, pt := range pipes {
		pT := pt
		wg.Add(1)

		var pipe io.Reader
		var buffer *shared.DataStore
		if !s.IsOnlyCombined {
			b, err := s.getStdWriter(config, s.IsWriteLogs, pT, 0)
			if err != nil {
				return err
			}
			buffer = b
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

					s.cmu.Lock()
					output.Write(chunk[0:bytes])

					if !s.IsOnlyCombined && output.Len() > CombinedLogTrimLimit {
						if newOutput, err := output.Slice(CombinedLogSize, true); err == nil {
							// fmt.Println("trim")
							approxOff := output.Len() - newOutput.Len()
							output = newOutput
							s.Combined = output
							s.combinedOffset += approxOff
						}
					}
					s.cmu.Unlock()

					go s.pushChanges(1)
				}
				if err != nil {
					if err != io.EOF {
						log.Println("Read pipe ("+pT+") error:", err)
					}
					break
				}
			}
			wg.Done()
		}()
	}

	err = process.Start()
	if err != nil {
		return err
	}

	s.StartedAt = time.Now()

	s.process = process
	s.IsStarted = true
	s.syncStatusAndSave()

	go func() {
		defer stdin.Close()

		wg.Wait()
		err = process.Wait()

		s.FinishedAt = time.Now()

		if s.Stderr != nil {
			if err := s.Stderr.Close(); err != nil {
				log.Println("Close stderr error", err)
			}
		}
		if s.Stdout != nil {
			if err := s.Stdout.Close(); err != nil {
				log.Println("Close stdout error", err)
			}
		}
		if s.Combined != nil {
			s.cmu.RLock()
			if err := s.Combined.Close(); err != nil {
				log.Println("Close combined error", err)
			}
			s.cmu.RUnlock()
		}

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

func (s *Task) ReadCombined(offset int64) (int64, []byte, error) {
	s.cmu.RLock()
	combined := s.Combined
	combinedOffset := s.combinedOffset
	s.cmu.RUnlock()
	if offset == combined.Len()+combinedOffset {
		return offset, make([]byte, 0), nil
	}
	if offset == -1 {
		if combined.Len() > HistorySize {
			offset = combinedOffset + combined.Len() - HistorySize
		} else {
			offset = combinedOffset
		}
	}
	if offset < combinedOffset {
		fmt.Println("skip", combinedOffset-offset)
		offset = combinedOffset
	}
	fragment, err := combined.ReadAt(offset - combinedOffset)
	if err != nil {
		return 0, nil, err
	}
	offset += int64(len(fragment))
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

func (s *Task) getLinkIndex(name string) int {
	for idx, link := range s.Links {
		if link.Name == name {
			return idx
		}
	}
	return -1
}

func (s *Task) GetLink(name string) *TaskLink {
	index := s.getLinkIndex(name)
	if index != -1 {
		return &s.Links[index]
	}
	return nil
}

func (s *Task) AddLink(taskLink TaskLink) {
	idx := s.getLinkIndex(taskLink.Name)
	if idx == -1 {
		s.Links = append(s.Links, taskLink)
	} else {
		s.Links = append(append(s.Links[:idx], taskLink), s.Links[:idx+1]...)
	}
	s.queue.Save()
}

func (s *Task) DelLink(name string) {
	index := s.getLinkIndex(name)
	if index != -1 {
		s.Links = append(s.Links[:index], s.Links[:index+1]...)
	}
	s.queue.Save()
}

func (s *Task) getAssetIndex(path string) int {
	for idx, asset := range s.Assets {
		if asset.Path == path {
			return idx
		}
	}
	return -1
}

func (s *Task) AddAsset(path string) (*TaskAsset, error) {
	info, err := os.Stat(path)
	if err != nil {
		return nil, err
	}
	asset := TaskAsset{Path: path, IsDir: info.IsDir()}
	idx := s.getAssetIndex(path)
	if idx == -1 {
		s.Assets = append(s.Assets, asset)
	} else {
		s.Assets = append(append(s.Assets[:idx], asset), s.Assets[:idx+1]...)
	}
	s.queue.Save()
	return &asset, nil
}

func (s *Task) DelAsset(path string) {
	index := s.getAssetIndex(path)
	if index != -1 {
		s.Assets = append(s.Assets[:index], s.Assets[:index+1]...)
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

func (s *Task) Init(config *cfg.Config, queue *Queue) {
	s.queue = queue

	if s.IsWriteLogs {
		s.Combined, _ = s.openStdWriter(config, LOG_COMBINED)
		if !s.IsOnlyCombined {
			s.Stdout, _ = s.openStdWriter(config, LOG_STDOUT)
			s.Stderr, _ = s.openStdWriter(config, LOG_STDERR)
		}
	}

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

func (s *Task) openStdWriter(config *cfg.Config, postfix string) (*shared.DataStore, error) {
	l, err := logstore.OpenLogStore(s.getLogFilename(config, postfix))
	if err != nil {
		return nil, err
	}
	return l.GetDataStore(), nil
}

func (s *Task) getStdWriter(config *cfg.Config, inLog bool, postfix string, bufSize int) (*shared.DataStore, error) {
	if inLog {
		l := logstore.NewLogStore(s.getLogFilename(config, postfix))
		return l.GetDataStore(), nil
	} else {
		l := gzbuffer.NewGzBuffer(bufSize)
		return l.GetDataStore(), nil
	}
}

func (s *Task) getLogFilename(c *cfg.Config, t string) string {
	return path.Join(c.GetLogsFolder(), s.Id+"-"+t+".log")
}

func NewTask(id string, taskBase TaskBase) *Task {
	task := Task{
		TaskBase:  taskBase,
		Id:        id,
		CreatedAt: time.Now(),
		Links:     make([]TaskLink, 0),
	}

	task.syncStatus()

	return &task
}
