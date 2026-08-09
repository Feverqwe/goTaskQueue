package taskQueue

import (
	"encoding/json"
	"errors"
	"goTaskQueue/internal/cfg"
	gzbuffer "goTaskQueue/internal/gzBuffer"
	logstore "goTaskQueue/internal/logStore"
	"goTaskQueue/internal/shared"
	"io"
	"log"
	"os"
	"os/exec"
	"path"
	"runtime"
	"sync"
	"syscall"
	"time"

	"github.com/creack/pty"
	xterm "github.com/gitpod-io/xterm-go"
)

const PtyLogSize = logstore.ChunkSize
const PtyTrimLimit = PtyLogSize * 2
const CombinedLogSize = logstore.ChunkSize
const CombinedLogTrimLimit = CombinedLogSize * 2
const MemBufSize = 256 * 1024
const HistorySize = 64 * 1024
const PtyInitialCols = 80
const PtyInitialRows = 24
const PtySnapshotScrollback = 0

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
	TTL              int64  `json:"ttl"`
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
	ExpiresAt      time.Time         `json:"expiresAt"`
	mu             sync.RWMutex
	cmu            sync.RWMutex
	qCh            []chan int
	isStarting     bool
	stdin          io.Writer
	combinedOffset int64
	ptyTerminal    *xterm.Terminal
	ptySnapshot    []byte
	Links          []TaskLink `json:"links"`
	queue          *Queue
	Assets         []TaskAsset `json:"assets"`
}

func (s *Task) MarshalJSON() ([]byte, error) {
	type taskJSON Task

	s.mu.RLock()
	defer s.mu.RUnlock()
	return json.Marshal((*taskJSON)(s))
}

func (s *Task) taskBaseSnapshot() TaskBase {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.TaskBase
}

func (s *Task) canDelete() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return !s.isStarting && (!s.IsStarted || s.IsFinished)
}

func (s *Task) isActiveInstance(templatePlace string) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.TemplatePlace == templatePlace && (s.isStarting || (s.IsStarted && !s.IsFinished))
}

func (s *Task) isExpired(now time.Time) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.IsStarted && s.IsFinished && !s.IsCanceled && !s.IsError &&
		!s.ExpiresAt.IsZero() && now.After(s.ExpiresAt)
}

func (s *Task) hasExactStatus(status string) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.State == status && (status == "CANCELED" || status == "ERROR" || status == "FINISHED")
}

func (s *Task) NeedsInitialPtyResize() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.IsPty && s.IsStarted && !s.IsFinished
}

func (s *Task) HasCombinedLog() bool {
	s.cmu.RLock()
	defer s.cmu.RUnlock()
	return s.Combined != nil
}

func (s *Task) GetLog(logType string) *shared.DataStore {
	if logType == LOG_COMBINED {
		s.cmu.RLock()
		defer s.cmu.RUnlock()
		return s.Combined
	}

	s.mu.RLock()
	defer s.mu.RUnlock()
	if logType == LOG_STDOUT {
		return s.Stdout
	}
	if logType == LOG_STDERR {
		return s.Stderr
	}
	return nil
}

func (s *Task) Run(config *cfg.Config, queue *Queue) error {
	if err := queue.beginRun(s); err != nil {
		return err
	}

	var err error
	if s.IsPty {
		err = s.RunPty(config)
	} else {
		err = s.RunDirect(config)
	}
	if err != nil {
		s.mu.Lock()
		s.isStarting = false
		s.mu.Unlock()
	}
	return err
}

func (s *Task) getEnvVariables(config *cfg.Config) []string {
	env := append([]string(nil), config.RunEnv...)
	return append(env,
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
	if len(runAs) == 0 || runAs[0] == "" {
		return errors.New("PTY run command is not configured")
	}
	runCommand := runAs[0]
	runArgs := make([]string, 0)
	if len(runAs) > 1 {
		runArgs = append(runArgs, runAs[1:]...)
	}
	runArgs = append(runArgs, s.Command)

	process := exec.Command(runCommand, runArgs...)
	process.SysProcAttr = &syscall.SysProcAttr{Setsid: true}
	process.Env = append(append(process.Env, config.PtyRunEnv...), s.getEnvVariables(config)...)
	process.Dir = s.getWorkingDir()

	f, err := pty.StartWithSize(process, &pty.Winsize{
		Rows: PtyInitialRows,
		Cols: PtyInitialCols,
	})
	if err != nil {
		return err
	}

	output, err := s.getStdWriter(config, s.IsWriteLogs, LOG_COMBINED, MemBufSize)
	if err != nil {
		_ = f.Close()
		_ = process.Process.Kill()
		_ = process.Wait()
		return err
	}
	s.cmu.Lock()
	s.Combined = output
	s.ptyTerminal = xterm.New(
		xterm.WithCols(PtyInitialCols),
		xterm.WithRows(PtyInitialRows),
		xterm.WithScrollback(PtySnapshotScrollback),
	)
	s.cmu.Unlock()

	var wg sync.WaitGroup
	wg.Add(1)

	go func() {
		chunk := make([]byte, 16*1024)
		for {
			b, err := f.Read(chunk)
			if b > 0 {
				s.cmu.Lock()

				n, writeErr := output.Write(chunk[0:b])
				if writeErr != nil {
					log.Println("Write output error", writeErr)
				}
				if n > 0 {
					if _, err := s.ptyTerminal.Write(chunk[0:n]); err != nil {
						log.Println("Update terminal state error", err)
					}
				}

				if output.Len() > PtyTrimLimit {
					if newOutput, err := output.Slice(PtyLogSize, true); err == nil {
						// log.Println("trim")
						approxOff := output.Len() - newOutput.Len()
						output = newOutput
						s.Combined = output
						s.combinedOffset += approxOff
					}
				}
				s.cmu.Unlock()

				s.pushChanges(1)
			}
			if err != nil {
				if !errors.Is(err, io.EOF) && !errors.Is(err, syscall.EIO) {
					log.Println("Read pipe ("+LOG_STDOUT+") error:", err)
				}
				break
			}
		}
		wg.Done()
	}()

	s.mu.Lock()
	s.stdin = f
	s.StartedAt = time.Now()
	s.process = process
	s.IsStarted = true
	s.isStarting = false
	s.syncStatusLocked()
	s.mu.Unlock()
	s.queue.Save()

	go func() {
		defer f.Close()

		wg.Wait()
		waitErr := process.Wait()

		s.cmu.Lock()
		if s.Combined != nil {
			s.freezePtyTerminalLocked()
			if err := s.Combined.Close(); err != nil {
				log.Println("Close combined error", err)
			}
		}
		s.cmu.Unlock()

		s.mu.Lock()
		s.FinishedAt = time.Now()
		s.IsFinished = true
		if waitErr != nil {
			s.IsError = true
			s.Error = waitErr.Error()
		}
		s.onFinishLocked()
		s.syncStatusLocked()
		s.mu.Unlock()
		s.queue.Save()

		s.pushChanges(0)
	}()

	return nil
}

func (s *Task) RunDirect(config *cfg.Config) error {
	runAs := config.Run
	if len(runAs) == 0 || runAs[0] == "" {
		return errors.New("run command is not configured")
	}
	runCommand := runAs[0]
	runArgs := make([]string, 0)
	if len(runAs) > 1 {
		runArgs = append(runArgs, runAs[1:]...)
	}
	runArgs = append(runArgs, s.Command)

	process := exec.Command(runCommand, runArgs...)
	process.SysProcAttr = &syscall.SysProcAttr{Setsid: true}
	process.Env = append(process.Env, s.getEnvVariables(config)...)
	process.Dir = s.getWorkingDir()

	const Out = LOG_STDOUT
	const Err = LOG_STDERR

	pipes := []string{Out, Err}

	output, err := s.getStdWriter(config, s.IsWriteLogs, LOG_COMBINED, MemBufSize)
	if err != nil {
		return err
	}
	s.cmu.Lock()
	s.Combined = output
	s.cmu.Unlock()

	stdin, _ := process.StdinPipe()

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
			s.mu.Lock()
			s.Stderr = buffer
			s.mu.Unlock()
		} else {
			pipe, _ = process.StdoutPipe()
			s.mu.Lock()
			s.Stdout = buffer
			s.mu.Unlock()
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
							// log.Println("trim")
							approxOff := output.Len() - newOutput.Len()
							output = newOutput
							s.Combined = output
							s.combinedOffset += approxOff
						}
					}
					s.cmu.Unlock()

					s.pushChanges(1)
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

	s.mu.Lock()
	s.stdin = stdin
	s.StartedAt = time.Now()
	s.process = process
	s.IsStarted = true
	s.isStarting = false
	s.syncStatusLocked()
	s.mu.Unlock()
	s.queue.Save()

	go func() {
		defer stdin.Close()

		wg.Wait()
		waitErr := process.Wait()

		s.mu.RLock()
		stderr := s.Stderr
		stdout := s.Stdout
		s.mu.RUnlock()
		if stderr != nil {
			if err := stderr.Close(); err != nil {
				log.Println("Close stderr error", err)
			}
		}
		if stdout != nil {
			if err := stdout.Close(); err != nil {
				log.Println("Close stdout error", err)
			}
		}
		s.cmu.Lock()
		if s.Combined != nil {
			if err := s.Combined.Close(); err != nil {
				log.Println("Close combined error", err)
			}
		}
		s.cmu.Unlock()

		s.mu.Lock()
		s.FinishedAt = time.Now()
		s.IsFinished = true
		if waitErr != nil {
			s.IsError = true
			s.Error = waitErr.Error()
		}
		s.onFinishLocked()
		s.syncStatusLocked()
		s.mu.Unlock()
		s.queue.Save()

		s.pushChanges(0)
	}()

	return nil
}

func (s *Task) ReadCombined(offset int64) (int64, []byte, error) {
	s.cmu.RLock()
	defer s.cmu.RUnlock()

	combined := s.Combined
	if combined == nil {
		return offset, nil, errors.New("combined log is not available")
	}
	combinedOffset := s.combinedOffset
	combinedLen := combined.Len()
	if offset == -1 && s.IsPty {
		if s.ptyTerminal != nil || s.ptySnapshot != nil || combinedLen == 0 {
			return combinedOffset + combinedLen, s.ptySnapshotLocked(), nil
		}
	}
	if offset == combinedLen+combinedOffset {
		return offset, make([]byte, 0), nil
	}
	if offset == -1 {
		offset = combinedOffset
		if combinedLen > HistorySize {
			offset = combinedOffset + combinedLen - HistorySize
		}
	}
	if offset < combinedOffset {
		log.Println("skip", combinedOffset-offset)
		offset = combinedOffset
	}
	fragment, err := combined.ReadAt(offset - combinedOffset)
	if err != nil {
		return 0, nil, err
	}
	offset += int64(len(fragment))
	return offset, fragment, nil
}

func (s *Task) ptySnapshotLocked() []byte {
	if s.ptyTerminal != nil {
		scrollback := PtySnapshotScrollback
		serializer := xterm.NewSerializeAddon(s.ptyTerminal)
		snapshot := serializer.Serialize(&xterm.SerializeOptions{Scrollback: &scrollback})

		// SerializeAddon restores mouse tracking, but currently omits the mouse
		// encoding. A fresh browser xterm needs both modes to emit mouse input.
		switch s.ptyTerminal.DecPrivateModes().MouseEncoding {
		case "SGR":
			snapshot = append(snapshot, "\x1b[?1006h"...)
		case "SGR_PIXELS":
			snapshot = append(snapshot, "\x1b[?1016h"...)
		}
		return snapshot
	}
	return append([]byte(nil), s.ptySnapshot...)
}

func (s *Task) freezePtyTerminalLocked() {
	if s.ptyTerminal == nil {
		return
	}
	s.ptySnapshot = s.ptySnapshotLocked()
	s.ptyTerminal.Dispose()
	s.ptyTerminal = nil
}

func (s *Task) Send(data string) error {
	s.mu.RLock()
	if !s.IsStarted || s.IsFinished {
		s.mu.RUnlock()
		return nil
	}
	stdin := s.stdin
	s.mu.RUnlock()
	if stdin == nil {
		return errors.New("process input is not available")
	}

	_, err := io.WriteString(stdin, data)
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
	s.cmu.Lock()
	if s.ptyTerminal != nil {
		s.ptyTerminal.Resize(screenSize.Cols, screenSize.Rows)
	}
	s.cmu.Unlock()
	s.mu.RLock()
	stdin := s.stdin
	s.mu.RUnlock()
	if f, ok := stdin.(*os.File); ok {
		return pty.Setsize(f, &ws)
	}
	return nil
}

func (s *Task) Wait() int {
	changes, unsubscribe := s.SubscribeChanges()
	defer unsubscribe()
	return <-changes
}

func (s *Task) SubscribeChanges() (<-chan int, func()) {
	s.mu.Lock()
	ch := make(chan int, 1)
	if s.IsFinished {
		ch <- 0
		s.mu.Unlock()
		return ch, func() {}
	}
	s.qCh = append(s.qCh, ch)
	s.mu.Unlock()

	var once sync.Once
	return ch, func() {
		once.Do(func() {
			s.mu.Lock()
			for index, candidate := range s.qCh {
				if candidate == ch {
					s.qCh = append(s.qCh[:index], s.qCh[index+1:]...)
					break
				}
			}
			s.mu.Unlock()
		})
	}
}

func (s *Task) Kill() error {
	return s.Signal(syscall.SIGKILL)
}

func (s *Task) Signal(sig syscall.Signal) error {
	s.mu.RLock()
	if !s.IsStarted || s.process == nil || s.process.Process == nil {
		s.mu.RUnlock()
		return errors.New("process_not_started")
	}
	if s.IsFinished {
		s.mu.RUnlock()
		return errors.New("process_finished")
	}
	process := s.process.Process
	s.mu.RUnlock()
	if runtime.GOOS == "linux" {
		if pids, err := GetProcessPids(process.Pid); err == nil {
			var err error
			for _, pid := range pids {
				suberr := syscall.Kill(pid, sig)
				err = errors.Join(err, suberr)
			}
			return err
		} else {
			log.Printf("Get child pids error, use default signal: %s\n", err)
			return process.Signal(sig)
		}
	} else {
		return process.Signal(sig)
	}
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
	s.mu.RLock()
	defer s.mu.RUnlock()
	index := s.getLinkIndex(name)
	if index != -1 {
		link := s.Links[index]
		return &link
	}
	return nil
}

func (s *Task) AddLink(taskLink TaskLink) {
	s.mu.Lock()
	idx := s.getLinkIndex(taskLink.Name)
	if idx == -1 {
		s.Links = append(s.Links, taskLink)
	} else {
		s.Links[idx] = taskLink
	}
	s.mu.Unlock()
	s.queue.Save()
}

func (s *Task) DelLink(name string) {
	s.mu.Lock()
	index := s.getLinkIndex(name)
	if index != -1 {
		s.Links = append(s.Links[:index], s.Links[index+1:]...)
	}
	s.mu.Unlock()
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
	s.mu.Lock()
	idx := s.getAssetIndex(path)
	if idx == -1 {
		s.Assets = append(s.Assets, asset)
	} else {
		s.Assets[idx] = asset
	}
	s.mu.Unlock()
	s.queue.Save()
	return &asset, nil
}

func (s *Task) DelAsset(path string) {
	s.mu.Lock()
	index := s.getAssetIndex(path)
	if index != -1 {
		s.Assets = append(s.Assets[:index], s.Assets[index+1:]...)
	}
	s.mu.Unlock()
	s.queue.Save()
}

func (s *Task) pushChanges(value int) {
	s.mu.RLock()
	q := append([]chan int(nil), s.qCh...)
	s.mu.RUnlock()
	for _, ch := range q {
		select {
		case ch <- value:
		default:
			if value == 0 {
				select {
				case <-ch:
				default:
				}
				ch <- value
			}
		}
	}
}

func (s *Task) syncStatusLocked() {
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

func (s *Task) Init(config *cfg.Config, queue *Queue) {
	s.queue = queue

	s.cmu.Lock()
	if s.IsWriteLogs {
		if combined, err := s.openStdWriter(config, LOG_COMBINED); err == nil {
			s.Combined = combined
		} else if !os.IsNotExist(err) {
			log.Println("Open combined log error", err)
		}
		if !s.IsOnlyCombined {
			if stdout, err := s.openStdWriter(config, LOG_STDOUT); err == nil {
				s.Stdout = stdout
			} else if !os.IsNotExist(err) {
				log.Println("Open stdout log error", err)
			}
			if stderr, err := s.openStdWriter(config, LOG_STDERR); err == nil {
				s.Stderr = stderr
			} else if !os.IsNotExist(err) {
				log.Println("Open stderr log error", err)
			}
		}
	}
	s.cmu.Unlock()

	recovered := false
	s.mu.Lock()
	if s.IsStarted && !s.IsFinished {
		s.IsCanceled = true
		s.IsFinished = true
		if s.FinishedAt.IsZero() {
			s.FinishedAt = time.Now()
		}
		s.onFinishLocked()
		s.syncStatusLocked()
		recovered = true
	}
	s.mu.Unlock()
	if recovered {
		queue.Save()
	}
}

func (s *Task) SetLabel(label string) {
	s.mu.Lock()
	s.Label = label
	s.mu.Unlock()
	s.queue.Save()
}

func (s *Task) openStdWriter(config *cfg.Config, postfix string) (*shared.DataStore, error) {
	l, err := logstore.OpenLogStore(s.getLogFilename(config, postfix))
	if err != nil {
		return nil, err
	}
	return l.GetDataStore(), nil
}

func (s *Task) getStdWriter(config *cfg.Config, inLog bool, postfix string, bufSize int) (dataStore *shared.DataStore, err error) {
	if inLog {
		l := logstore.NewLogStore(s.getLogFilename(config, postfix))
		dataStore = l.GetDataStore()
	} else {
		l := gzbuffer.NewGzBuffer()
		dataStore = l.GetDataStore()
	}
	if bufSize > 0 {
		dataStore = WrapQuickBuf(dataStore, bufSize)
	}
	return
}

func (s *Task) getLogFilename(c *cfg.Config, t string) string {
	return path.Join(c.GetLogsFolder(), s.Id+"-"+t)
}

func (s *Task) onFinishLocked() {
	if s.IsCanceled || s.IsError {
		return
	}

	if s.TTL > 0 {
		s.ExpiresAt = time.Now().Add(time.Duration(s.TTL) * time.Second)
	}
}

func NewTask(id string, taskBase TaskBase) *Task {
	task := Task{
		TaskBase:  taskBase,
		Id:        id,
		CreatedAt: time.Now(),
		Links:     make([]TaskLink, 0),
	}

	task.syncStatusLocked()

	return &task
}
