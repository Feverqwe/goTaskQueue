package internal

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"strings"
	"syscall"
	"time"

	"goTaskQueue/internal/cfg"
	"goTaskQueue/internal/taskQueue"
)

const (
	defaultTaskOutputBytes = 64 * 1024
	maxTaskOutputBytes     = 256 * 1024
	maxTaskFollowWait      = 30 * time.Second
	maxTaskOutputSettle    = 2 * time.Second
	maxTaskInputBytes      = 64 * 1024
	defaultTaskTailLines   = 100
	maxTaskTailLines       = 1000
)

type AddTaskInput struct {
	Command          *string           `json:"command,omitempty"`
	Label            *string           `json:"label,omitempty"`
	Group            *string           `json:"group,omitempty"`
	IsPty            *bool             `json:"isPty,omitempty"`
	IsOnlyCombined   *bool             `json:"isOnlyCombined,omitempty"`
	IsSingleInstance *bool             `json:"isSingleInstance,omitempty"`
	IsStartOnBoot    *bool             `json:"isStartOnBoot,omitempty"`
	IsWriteLogs      *bool             `json:"isWriteLogs,omitempty"`
	TemplatePlace    string            `json:"templatePlace,omitempty"`
	TemplateId       string            `json:"templateId,omitempty"`
	Variables        map[string]string `json:"variables,omitempty"`
	IsRun            bool              `json:"isRun,omitempty"`
	TTL              *int64            `json:"ttl,omitempty"`
}

type TaskOutput struct {
	Task       taskQueue.TaskSummary `json:"task"`
	Output     string                `json:"output"`
	Screen     string                `json:"screen,omitempty"`
	NextCursor int64                 `json:"next_cursor"`
	Snapshot   bool                  `json:"snapshot,omitempty"`
	Truncated  bool                  `json:"truncated,omitempty"`
	TimedOut   bool                  `json:"timed_out,omitempty"`
	Finished   bool                  `json:"finished"`
}

type TaskScreen struct {
	Task     taskQueue.TaskSummary `json:"task"`
	Screen   string                `json:"screen"`
	Finished bool                  `json:"finished"`
}

type TaskTail struct {
	Task        taskQueue.TaskSummary `json:"task"`
	Output      string                `json:"output"`
	StartCursor int64                 `json:"start_cursor"`
	NextCursor  int64                 `json:"next_cursor"`
	Truncated   bool                  `json:"truncated,omitempty"`
	Finished    bool                  `json:"finished"`
}

type TaskService struct {
	queue  *taskQueue.Queue
	config *cfg.Config
}

func NewTaskService(queue *taskQueue.Queue, config *cfg.Config) *TaskService {
	return &TaskService{queue: queue, config: config}
}

func (s *TaskService) ListTasks() []*taskQueue.Task {
	return s.queue.GetAll(s.config)
}

func (s *TaskService) GetTask(id string) (*taskQueue.Task, error) {
	return s.queue.Get(id)
}

func (s *TaskService) SearchTemplates(query string, limit int) []taskQueue.Template {
	return taskQueue.SearchTemplates(query, limit)
}

func (s *TaskService) GetTemplate(id, place string) (*taskQueue.Template, error) {
	if place != "" {
		template, err := taskQueue.ReadTemplate(place)
		if err != nil {
			return nil, fmt.Errorf("template not found by place %v", place)
		}
		return template, nil
	}
	if id != "" {
		template, err := taskQueue.GetTemplate(id)
		if err != nil {
			return nil, fmt.Errorf("template not found by id %v", id)
		}
		return template, nil
	}
	return nil, errors.New("template id or place is required")
}

func (s *TaskService) CreateTemplate(template taskQueue.Template) (*taskQueue.Template, error) {
	if err := taskQueue.WriteTemplate(template, true); err != nil {
		return nil, err
	}
	return taskQueue.ReadTemplate(template.Place)
}

func (s *TaskService) UpdateTemplate(currentPlace string, template taskQueue.Template) (*taskQueue.Template, error) {
	if currentPlace == "" {
		return nil, errors.New("current template place is required")
	}
	if currentPlace != template.Place {
		if err := taskQueue.MoveTemplate(currentPlace, template.Place); err != nil {
			return nil, err
		}
	}
	if err := taskQueue.WriteTemplate(template, false); err != nil {
		return nil, err
	}
	return taskQueue.ReadTemplate(template.Place)
}

func (s *TaskService) DeleteTemplate(place string) error {
	if place == "" {
		return errors.New("template place is required")
	}
	return taskQueue.RemoveTemplate(place)
}

func (s *TaskService) AddTask(input AddTaskInput) (*taskQueue.Task, error) {
	var template *taskQueue.Template
	var err error
	if input.TemplatePlace != "" || input.TemplateId != "" {
		template, err = s.GetTemplate(input.TemplateId, input.TemplatePlace)
		if err != nil {
			return nil, err
		}
	}
	if template == nil {
		template = &taskQueue.Template{}
	}

	taskBase := taskQueue.TaskBase{TemplatePlace: template.Place}
	taskBase.Command = setValue(input.Command, template.Command)
	taskBase.Label = setValue(input.Label, template.Label)
	taskBase.Group = setValue(input.Group, template.Group)
	taskBase.IsPty = setValue(input.IsPty, template.IsPty)
	taskBase.IsOnlyCombined = setValue(input.IsOnlyCombined, template.IsOnlyCombined)
	taskBase.IsSingleInstance = setValue(input.IsSingleInstance, template.IsSingleInstance)
	taskBase.IsStartOnBoot = setValue(input.IsStartOnBoot, template.IsStartOnBoot)
	taskBase.IsWriteLogs = setValue(input.IsWriteLogs, template.IsWriteLogs)
	taskBase.TTL = setValue(input.TTL, template.TTL)
	taskBase.Variables = taskQueue.ResolveTemplateVariables(template.Variables, input.Variables)
	taskBase.Command = taskQueue.RenderLegacyCommand(taskBase.Command, taskBase.Variables)
	taskBase.Label, err = taskQueue.RenderTemplateText(taskBase.Label, taskBase.Variables)
	if err != nil {
		return nil, err
	}
	taskBase.Group, err = taskQueue.RenderTemplateText(taskBase.Group, taskBase.Variables)
	if err != nil {
		return nil, err
	}

	task := s.queue.Add(s.config, taskBase)
	if input.IsRun {
		if err := task.Run(s.config, s.queue); err != nil {
			return task, err
		}
	}
	return task, nil
}

func (s *TaskService) CloneTask(id string, run bool) (*taskQueue.Task, error) {
	task, err := s.queue.Clone(s.config, id)
	if err != nil {
		return nil, err
	}
	if run {
		if err := task.Run(s.config, s.queue); err != nil {
			return task, err
		}
	}
	return task, nil
}

func (s *TaskService) RunTask(id string) error {
	task, err := s.queue.Get(id)
	if err != nil {
		return err
	}
	return task.Run(s.config, s.queue)
}

func (s *TaskService) StopTask(id string) error {
	task, err := s.queue.Get(id)
	if err != nil {
		return err
	}
	return task.Kill()
}

func (s *TaskService) SignalTask(id string, signal int) error {
	task, err := s.queue.Get(id)
	if err != nil {
		return err
	}
	return task.Signal(syscall.Signal(signal))
}

func (s *TaskService) DeleteTask(id string) error {
	return s.queue.Del(s.config, id)
}

func (s *TaskService) CleanupTasks(statuses []string) error {
	for _, status := range statuses {
		switch status {
		case "FINISHED", "CANCELED", "ERROR":
		default:
			return fmt.Errorf("invalid cleanup status %q", status)
		}
	}
	s.queue.CleanupByStatuses(statuses, s.config)
	return nil
}

func (s *TaskService) SetTaskLabel(id, label string) error {
	task, err := s.queue.Get(id)
	if err != nil {
		return err
	}
	task.SetLabel(label)
	return nil
}

func (s *TaskService) AddTaskLink(id string, link taskQueue.TaskLink) error {
	task, err := s.queue.Get(id)
	if err != nil {
		return err
	}
	task.AddLink(link)
	return nil
}

func (s *TaskService) DeleteTaskLink(id, name string) error {
	task, err := s.queue.Get(id)
	if err != nil {
		return err
	}
	task.DelLink(name)
	return nil
}

func (s *TaskService) AddTaskAsset(id, path string) (*taskQueue.TaskAsset, error) {
	task, err := s.queue.Get(id)
	if err != nil {
		return nil, err
	}
	return task.AddAsset(path)
}

func (s *TaskService) DeleteTaskAsset(id, path string) error {
	task, err := s.queue.Get(id)
	if err != nil {
		return err
	}
	task.DelAsset(path)
	return nil
}

func (s *TaskService) TaskOutput(ctx context.Context, id string, cursor int64, wait, settle time.Duration, maxBytes int) (TaskOutput, error) {
	task, err := s.queue.Get(id)
	if err != nil {
		return TaskOutput{}, err
	}
	if maxBytes <= 0 {
		maxBytes = defaultTaskOutputBytes
	}
	if maxBytes > maxTaskOutputBytes {
		maxBytes = maxTaskOutputBytes
	}
	if wait < 0 {
		wait = 0
	}
	if wait > maxTaskFollowWait {
		wait = maxTaskFollowWait
	}
	if settle < 0 {
		settle = 0
	}
	if settle > maxTaskOutputSettle {
		settle = maxTaskOutputSettle
	}

	changes, unsubscribe := task.SubscribeChanges()
	defer unsubscribe()

	read := func() (TaskOutput, error) {
		output := TaskOutput{
			NextCursor: cursor,
		}
		if task.HasCombinedLog() {
			result, err := task.ReadCombinedChunk(cursor, maxBytes)
			if err != nil {
				return TaskOutput{}, err
			}
			output.Output = string(result.Data)
			output.NextCursor = result.Offset
			output.Snapshot = result.IsSnapshot
			output.Truncated = result.WasTrimmed
		}
		output.Task = task.Summary()
		output.Screen = task.TerminalScreen()
		output.Finished = task.IsDone()
		return output, nil
	}

	output, err := read()
	if err != nil || output.Finished || wait == 0 || !task.IsRunning() || (output.Output != "" && settle == 0) {
		return output, err
	}

	deadline := time.NewTimer(wait)
	defer deadline.Stop()

	if output.Output == "" {
		select {
		case <-ctx.Done():
			return TaskOutput{}, ctx.Err()
		case <-changes:
			if settle == 0 || task.IsDone() {
				return read()
			}
		case <-deadline.C:
			output, err := read()
			output.TimedOut = err == nil && output.Output == ""
			return output, err
		}
	}

	quiet := time.NewTimer(settle)
	defer quiet.Stop()
	for {
		select {
		case <-ctx.Done():
			return TaskOutput{}, ctx.Err()
		case <-deadline.C:
			return read()
		case <-quiet.C:
			return read()
		case <-changes:
			if task.IsDone() {
				return read()
			}
			if !quiet.Stop() {
				select {
				case <-quiet.C:
				default:
				}
			}
			quiet.Reset(settle)
		}
	}
}

func (s *TaskService) TaskScreen(id string) (TaskScreen, error) {
	task, err := s.queue.Get(id)
	if err != nil {
		return TaskScreen{}, err
	}
	if !task.IsPtyTask() {
		return TaskScreen{}, errors.New("task does not use a pseudo-terminal")
	}
	return TaskScreen{
		Task:     task.Summary(),
		Screen:   task.TerminalScreen(),
		Finished: task.IsDone(),
	}, nil
}

func (s *TaskService) TaskTail(id string, lines, maxBytes int) (TaskTail, error) {
	task, err := s.queue.Get(id)
	if err != nil {
		return TaskTail{}, err
	}
	if lines <= 0 {
		lines = defaultTaskTailLines
	}
	if lines > maxTaskTailLines {
		return TaskTail{}, fmt.Errorf("tail lines must not exceed %d", maxTaskTailLines)
	}
	if maxBytes <= 0 {
		maxBytes = defaultTaskOutputBytes
	}
	if maxBytes > maxTaskOutputBytes {
		maxBytes = maxTaskOutputBytes
	}

	result, err := task.ReadCombinedTail(maxBytes)
	if err != nil {
		return TaskTail{}, err
	}
	start := tailLineStart(result.Data, lines)
	data := result.Data[start:]
	return TaskTail{
		Task:        task.Summary(),
		Output:      string(data),
		StartCursor: result.Offset - int64(len(result.Data)-start),
		NextCursor:  result.Offset,
		Truncated:   result.WasTrimmed || start > 0,
		Finished:    task.IsDone(),
	}, nil
}

func tailLineStart(data []byte, lines int) int {
	position := len(data)
	if position > 0 && data[position-1] == '\n' {
		position--
	}
	start := 0
	for range lines {
		index := bytes.LastIndexByte(data[:position], '\n')
		if index < 0 {
			return 0
		}
		start = index + 1
		position = index
	}
	return start
}

var taskInputKeys = map[string]string{
	"ENTER":       "\r",
	"TAB":         "\t",
	"ESCAPE":      "\x1b",
	"BACKSPACE":   "\x7f",
	"CTRL_C":      "\x03",
	"CTRL_D":      "\x04",
	"ARROW_UP":    "\x1b[A",
	"ARROW_DOWN":  "\x1b[B",
	"ARROW_RIGHT": "\x1b[C",
	"ARROW_LEFT":  "\x1b[D",
}

func (s *TaskService) SendTaskInput(id, text, key string, submit bool) error {
	task, err := s.queue.Get(id)
	if err != nil {
		return err
	}
	if !task.IsRunning() {
		return errors.New("task is not running")
	}
	if text != "" && key != "" {
		return errors.New("use either text or key, not both")
	}
	data := text
	if key != "" {
		var ok bool
		data, ok = taskInputKeys[strings.ToUpper(key)]
		if !ok {
			return fmt.Errorf("unsupported input key %q", key)
		}
	}
	if submit {
		if key != "" {
			return errors.New("submit cannot be combined with key")
		}
		if task.IsPtyTask() {
			data += "\r"
		} else {
			data += "\n"
		}
	}
	if data == "" {
		return errors.New("input text or key is required")
	}
	if len(data) > maxTaskInputBytes {
		return fmt.Errorf("task input exceeds %d bytes", maxTaskInputBytes)
	}
	return task.Send(data)
}

func (s *TaskService) ResizeTask(id string, screenSize taskQueue.PtyScreenSize) error {
	task, err := s.queue.Get(id)
	if err != nil {
		return err
	}
	if !task.IsRunning() {
		return errors.New("task is not running")
	}
	if !task.IsPtyTask() {
		return errors.New("task does not use a pseudo-terminal")
	}
	if screenSize.Rows < 1 || screenSize.Rows > 1000 || screenSize.Cols < 1 || screenSize.Cols > 1000 {
		return errors.New("terminal rows and cols must be between 1 and 1000")
	}
	return task.Resize(&screenSize)
}
