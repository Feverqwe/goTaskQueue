package internal

import (
	"context"
	"math"
	"strings"
	"testing"

	"goTaskQueue/internal/cfg"
	"goTaskQueue/internal/taskQueue"
)

func useServiceValidationProfile(t *testing.T) {
	t.Helper()
	previous := cfg.PROFILE_PATH_CACHE
	cfg.PROFILE_PATH_CACHE = t.TempDir()
	taskQueue.FlushTemplateCache()
	t.Cleanup(func() {
		cfg.PROFILE_PATH_CACHE = previous
		taskQueue.FlushTemplateCache()
	})
}

func TestAddTaskRejectsInvalidValuesBeforeQueueMutation(t *testing.T) {
	useServiceValidationProfile(t)
	queue := taskQueue.NewQueue()
	config := &cfg.Config{}
	service := NewTaskService(queue, config)
	if _, err := service.CreateTemplate(taskQueue.Template{
		Place: "task", Name: "Task", Command: "true",
		Variables: []taskQueue.TemplateVariable{{Name: "Environment", Value: "environment", Type: "select", Options: []string{"staging", "production"}, DefaultValue: "staging"}},
	}); err != nil {
		t.Fatal(err)
	}
	for _, variables := range []map[string]string{{"environment": "typo"}, {"enviroment": "production"}} {
		if _, err := service.AddTask(AddTaskInput{TemplatePlace: "task", Variables: variables}); err == nil {
			t.Errorf("invalid variables were accepted: %v", variables)
		}
	}
	for _, ttl := range []int64{-1, taskQueue.MaxTTLSeconds + 1, math.MaxInt64} {
		if _, err := service.AddTask(AddTaskInput{TTL: &ttl}); err == nil {
			t.Errorf("invalid TTL was accepted: %d", ttl)
		}
	}
	if len(service.ListTasks()) != 0 {
		t.Fatal("invalid input added tasks to the queue")
	}
	for _, variables := range []map[string]string{nil, {"environment": "production"}} {
		task, err := service.AddTask(AddTaskInput{TemplatePlace: "task", Variables: variables})
		if err != nil {
			t.Fatal(err)
		}
		want := "staging"
		if variables != nil {
			want = "production"
		}
		if task.Variables["environment"] != want {
			t.Fatalf("resolved variables = %v, want environment %q", task.Variables, want)
		}
	}
}

func TestUpdateTemplateValidatesBeforeMoving(t *testing.T) {
	useServiceValidationProfile(t)
	service := NewTaskService(taskQueue.NewQueue(), &cfg.Config{})
	if _, err := service.CreateTemplate(taskQueue.Template{Place: "old", Name: "Keep", Command: "true"}); err != nil {
		t.Fatal(err)
	}
	if _, err := service.UpdateTemplate("old", taskQueue.Template{Place: "new", Name: ""}); err == nil {
		t.Fatal("invalid replacement was accepted")
	}
	original, err := service.GetTemplate("", "old")
	if err != nil || original.Name != "Keep" || original.Command != "true" {
		t.Fatalf("invalid update changed original: %v, %v", original, err)
	}
	if _, err := service.GetTemplate("", "new"); err == nil {
		t.Fatal("invalid update moved the template")
	}
}

func TestTaskServiceRejectsInvalidNumericInputs(t *testing.T) {
	queue := taskQueue.NewQueue()
	config := &cfg.Config{}
	task := queue.Add(config, taskQueue.TaskBase{NewTaskBase: taskQueue.NewTaskBase{IsPty: true}})
	task.IsStarted = true
	service := NewTaskService(queue, config)
	for _, cursor := range []int64{-2, math.MinInt64} {
		if _, err := service.TaskOutput(context.Background(), task.Id, cursor, 0, 0, 0); err == nil {
			t.Errorf("invalid cursor accepted: %d", cursor)
		}
	}
	for _, signal := range []int{-1, 65, math.MaxInt} {
		if err := service.SignalTask(task.Id, signal); err == nil || !strings.Contains(err.Error(), "signal must") {
			t.Errorf("invalid signal %d error = %v", signal, err)
		}
	}
	for _, size := range []taskQueue.PtyScreenSize{
		{Rows: 0, Cols: 80}, {Rows: 24, Cols: math.MaxInt},
		{Rows: 24, Cols: 80, X: -1}, {Rows: 24, Cols: 80, Y: 65536},
	} {
		if err := service.ResizeTask(task.Id, size); err == nil {
			t.Errorf("invalid terminal size accepted: %+v", size)
		}
	}
}
