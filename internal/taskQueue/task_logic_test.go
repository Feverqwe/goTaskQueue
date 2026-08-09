package taskQueue

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strconv"
	"sync"
	"testing"
	"time"

	"goTaskQueue/internal/cfg"
)

func newTestTask(queue *Queue) *Task {
	task := NewTask("test-id", TaskBase{})
	task.queue = queue
	return task
}

func TestTaskLinkOperationsReplaceAndDelete(t *testing.T) {
	task := newTestTask(NewQueue())
	task.Links = []TaskLink{
		{Name: "first", Url: "old"},
		{Name: "second", Url: "keep"},
	}

	task.AddLink(TaskLink{Name: "first", Url: "new"})
	if len(task.Links) != 2 || task.Links[0].Url != "new" || task.Links[1].Name != "second" {
		t.Fatalf("replace corrupted links: %#v", task.Links)
	}

	task.DelLink("first")
	if len(task.Links) != 1 || task.Links[0].Name != "second" {
		t.Fatalf("delete corrupted links: %#v", task.Links)
	}
}

func TestTaskAssetOperationsReplaceAndDelete(t *testing.T) {
	queue := NewQueue()
	task := newTestTask(queue)
	first := filepath.Join(t.TempDir(), "first")
	second := filepath.Join(t.TempDir(), "second")
	if err := os.WriteFile(first, []byte("first"), 0600); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(second, []byte("second"), 0600); err != nil {
		t.Fatal(err)
	}
	task.Assets = []TaskAsset{{Path: first, IsDir: true}, {Path: second}}

	if _, err := task.AddAsset(first); err != nil {
		t.Fatal(err)
	}
	if len(task.Assets) != 2 || task.Assets[0].IsDir || task.Assets[1].Path != second {
		t.Fatalf("replace corrupted assets: %#v", task.Assets)
	}

	task.DelAsset(first)
	if len(task.Assets) != 1 || task.Assets[0].Path != second {
		t.Fatalf("delete corrupted assets: %#v", task.Assets)
	}
}

func TestSignalIdleTaskReturnsError(t *testing.T) {
	task := newTestTask(NewQueue())
	if err := task.Kill(); err == nil || err.Error() != "process_not_started" {
		t.Fatalf("Kill() error = %v, want process_not_started", err)
	}
}

func TestBeginRunReservesTaskAndSingleInstance(t *testing.T) {
	queue := NewQueue()
	config := &cfg.Config{}
	base := TaskBase{TemplatePlace: "group/task", NewTaskBase: NewTaskBase{IsSingleInstance: true}}
	first := queue.Add(config, base)
	second := queue.Add(config, base)

	if err := queue.beginRun(first); err != nil {
		t.Fatal(err)
	}
	if err := queue.beginRun(first); err == nil {
		t.Fatal("second reservation of the same task succeeded")
	}
	if err := queue.beginRun(second); err == nil {
		t.Fatal("second single-instance task reservation succeeded")
	}
}

func TestRunValidationReleasesReservation(t *testing.T) {
	queue := NewQueue()
	config := &cfg.Config{}
	task := queue.Add(config, TaskBase{})

	for attempt := 0; attempt < 2; attempt++ {
		if err := task.Run(config, queue); err == nil || err.Error() != "run command is not configured" {
			t.Fatalf("Run() error = %v, want configuration error", err)
		}
	}
}

func TestQueueAndTaskConcurrentAccess(t *testing.T) {
	queue := NewQueue()
	config := &cfg.Config{}
	task := queue.Add(config, TaskBase{})

	var wg sync.WaitGroup
	wg.Add(4)
	go func() {
		defer wg.Done()
		for i := 0; i < 200; i++ {
			task.SetLabel(strconv.Itoa(i))
			task.AddLink(TaskLink{Name: "link", Title: strconv.Itoa(i)})
		}
	}()
	go func() {
		defer wg.Done()
		for i := 0; i < 200; i++ {
			if _, err := json.Marshal(task); err != nil {
				t.Errorf("marshal task: %v", err)
				return
			}
		}
	}()
	go func() {
		defer wg.Done()
		for i := 0; i < 200; i++ {
			_ = queue.GetAll(config)
			_, _ = queue.Get(task.Id)
			_ = queue.HasInstance("")
		}
	}()
	go func() {
		defer wg.Done()
		for i := 0; i < 50; i++ {
			added := queue.Add(config, TaskBase{})
			if err := queue.Del(config, added.Id); err != nil {
				t.Errorf("delete task: %v", err)
				return
			}
		}
	}()
	wg.Wait()
}

func TestCleanupByStatusesUsesExactState(t *testing.T) {
	queue := NewQueue()
	config := &cfg.Config{}
	finished := queue.Add(config, TaskBase{})
	failed := queue.Add(config, TaskBase{})
	canceled := queue.Add(config, TaskBase{})

	setState := func(task *Task, isError, isCanceled bool) {
		task.mu.Lock()
		task.IsStarted = true
		task.IsFinished = true
		task.IsError = isError
		task.IsCanceled = isCanceled
		task.syncStatusLocked()
		task.mu.Unlock()
	}
	setState(finished, false, false)
	setState(failed, true, false)
	setState(canceled, false, true)

	queue.CleanupByStatuses([]string{"FINISHED"}, config)
	if _, err := queue.Get(finished.Id); err == nil {
		t.Fatal("finished task was not deleted")
	}
	if _, err := queue.Get(failed.Id); err != nil {
		t.Fatal("error task was deleted by FINISHED cleanup")
	}
	if _, err := queue.Get(canceled.Id); err != nil {
		t.Fatal("canceled task was deleted by FINISHED cleanup")
	}
}

func TestInitPersistsRecoveredCancellation(t *testing.T) {
	queue := NewQueue()
	task := NewTask("recovered", TaskBase{})
	task.IsStarted = true
	task.syncStatusLocked()

	task.Init(&cfg.Config{}, queue)
	if !task.IsCanceled || !task.IsFinished || task.State != "CANCELED" {
		t.Fatalf("recovered state = canceled:%v finished:%v state:%q", task.IsCanceled, task.IsFinished, task.State)
	}
	if task.FinishedAt.IsZero() {
		t.Fatal("recovered task has no finish time")
	}
	select {
	case <-queue.ch:
	default:
		t.Fatal("recovered state was not scheduled for persistence")
	}
}

func TestWaitObservesFinishWithoutLostNotification(t *testing.T) {
	task := newTestTask(NewQueue())
	done := make(chan int, 1)
	go func() {
		done <- task.Wait()
	}()

	deadline := time.Now().Add(time.Second)
	for {
		task.mu.RLock()
		waiting := len(task.qCh) == 1
		task.mu.RUnlock()
		if waiting {
			break
		}
		if time.Now().After(deadline) {
			t.Fatal("Wait did not register its notification channel")
		}
	}

	task.mu.Lock()
	task.IsFinished = true
	task.syncStatusLocked()
	task.mu.Unlock()
	task.pushChanges(0)

	select {
	case value := <-done:
		if value != 0 {
			t.Fatalf("Wait() = %d, want 0", value)
		}
	case <-time.After(time.Second):
		t.Fatal("Wait blocked after task finish")
	}
}

func TestFinishNotificationReplacesPendingOutput(t *testing.T) {
	task := newTestTask(NewQueue())
	changes, unsubscribe := task.SubscribeChanges()
	defer unsubscribe()

	task.pushChanges(1)
	task.pushChanges(0)
	select {
	case value := <-changes:
		if value != 0 {
			t.Fatalf("notification = %d, want finish", value)
		}
	case <-time.After(time.Second):
		t.Fatal("finish notification was lost")
	}
}

func TestTaskMarshalJSONKeepsPublicShape(t *testing.T) {
	task := newTestTask(NewQueue())
	data, err := json.Marshal(task)
	if err != nil {
		t.Fatal(err)
	}
	var payload map[string]any
	if err := json.Unmarshal(data, &payload); err != nil {
		t.Fatal(err)
	}
	for _, field := range []string{"id", "command", "state", "links", "assets"} {
		if _, ok := payload[field]; !ok {
			t.Errorf("JSON is missing %q", field)
		}
	}
}
