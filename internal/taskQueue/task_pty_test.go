package taskQueue

import (
	"bytes"
	"fmt"
	"testing"

	gzbuffer "goTaskQueue/internal/gzBuffer"

	xterm "github.com/gitpod-io/xterm-go"
)

func TestReadCombinedReturnsPtySnapshotAndThenLiveOutput(t *testing.T) {
	const cols = 20
	const rows = 4

	combined := gzbuffer.NewGzBuffer().GetDataStore()
	terminal := xterm.New(
		xterm.WithCols(cols),
		xterm.WithRows(rows),
		xterm.WithScrollback(PtySnapshotScrollback),
	)
	t.Cleanup(terminal.Dispose)

	task := &Task{
		TaskBase:    TaskBase{NewTaskBase: NewTaskBase{IsPty: true}},
		Combined:    combined,
		ptyTerminal: terminal,
	}

	initial := []byte("shell prompt\r\n\x1b[?1049h\x1b[2J\x1b[H\x1b[31mMC screen\x1b[0m\x1b[3;4H\x1b[?1002h\x1b[?1006h")
	for i := 0; i < 2000; i++ {
		initial = append(initial, []byte(fmt.Sprintf("\x1b[2;1Hprogress %04d", i))...)
	}
	if _, err := combined.Write(initial); err != nil {
		t.Fatal(err)
	}
	if _, err := terminal.Write(initial); err != nil {
		t.Fatal(err)
	}

	offset, snapshot, err := task.ReadCombined(-1)
	if err != nil {
		t.Fatal(err)
	}
	if offset != int64(len(initial)) {
		t.Fatalf("snapshot offset = %d, want %d", offset, len(initial))
	}
	if len(snapshot) >= len(initial)/10 {
		t.Fatalf("snapshot is unexpectedly large: snapshot=%d raw=%d", len(snapshot), len(initial))
	}

	replayed := xterm.New(
		xterm.WithCols(cols),
		xterm.WithRows(rows),
		xterm.WithScrollback(PtySnapshotScrollback),
	)
	defer replayed.Dispose()
	if _, err := replayed.Write(snapshot); err != nil {
		t.Fatal(err)
	}
	if replayed.IsAltBufferActive() != terminal.IsAltBufferActive() {
		t.Fatalf("alternate buffer state was not restored")
	}
	if replayed.DecPrivateModes().MouseTrackingMode != terminal.DecPrivateModes().MouseTrackingMode {
		t.Fatalf("mouse tracking mode was not restored")
	}
	if replayed.DecPrivateModes().MouseEncoding != terminal.DecPrivateModes().MouseEncoding {
		t.Fatalf("mouse encoding was not restored")
	}
	if replayed.String() != terminal.String() {
		t.Fatalf("screen was not restored:\n got: %q\nwant: %q", replayed.String(), terminal.String())
	}

	live := []byte("\x1b[4;1Hlive")
	if _, err := combined.Write(live); err != nil {
		t.Fatal(err)
	}
	if _, err := terminal.Write(live); err != nil {
		t.Fatal(err)
	}
	newOffset, fragment, err := task.ReadCombined(offset)
	if err != nil {
		t.Fatal(err)
	}
	if newOffset != offset+int64(len(live)) {
		t.Fatalf("live offset = %d, want %d", newOffset, offset+int64(len(live)))
	}
	if !bytes.Equal(fragment, live) {
		t.Fatalf("live fragment = %q, want %q", fragment, live)
	}
}

func TestReadCombinedFallsBackToHistoryForRestoredPtyTask(t *testing.T) {
	combined := gzbuffer.NewGzBuffer().GetDataStore()
	raw := bytes.Repeat([]byte("x"), HistorySize+100)
	if _, err := combined.Write(raw); err != nil {
		t.Fatal(err)
	}

	task := &Task{
		TaskBase: TaskBase{NewTaskBase: NewTaskBase{IsPty: true}},
		Combined: combined,
	}
	offset, history, err := task.ReadCombined(-1)
	if err != nil {
		t.Fatal(err)
	}
	if offset != int64(len(raw)) {
		t.Fatalf("history offset = %d, want %d", offset, len(raw))
	}
	if len(history) != HistorySize {
		t.Fatalf("history size = %d, want %d", len(history), HistorySize)
	}
}
