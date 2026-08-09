package logstore

import (
	"errors"
	"io"
	"os"
	"path/filepath"
	"sync"
	"testing"
)

func TestStoreReadWriteAndOpen(t *testing.T) {
	store, filename := newTestStore(t, 4)
	writer := NewLogWriter(store)
	data := []byte("abcdefghij")

	n, err := writer.Write(data)
	if err != nil {
		t.Fatalf("write: %v", err)
	}
	if n != len(data) {
		t.Fatalf("written %d bytes, want %d", n, len(data))
	}
	if got := store.Len(); got != int64(len(data)) {
		t.Fatalf("store length %d, want %d", got, len(data))
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("close writer: %v", err)
	}
	if err := store.Close(); err != nil {
		t.Fatalf("close store: %v", err)
	}

	opened, err := OpenLogStore(filename)
	if err != nil {
		t.Fatalf("open store: %v", err)
	}
	assertStoreData(t, opened, data)
	for _, chunk := range opened.GetChunks() {
		if !chunk.Compressed {
			t.Fatalf("chunk %q was not compressed on close", chunk.Name)
		}
	}
}

func TestOpenCompressedStoreAndAppend(t *testing.T) {
	store, filename := newTestStore(t, 4)
	writeStore(t, store, []byte("abc"))

	opened, err := OpenLogStore(filename)
	if err != nil {
		t.Fatalf("open store: %v", err)
	}
	writeStore(t, opened, []byte("defgh"))

	reopened, err := OpenLogStore(filename)
	if err != nil {
		t.Fatalf("reopen store: %v", err)
	}
	assertStoreData(t, reopened, []byte("abcdefgh"))

	names := make(map[string]struct{})
	for _, chunk := range reopened.GetChunks() {
		if _, exists := names[chunk.Name]; exists {
			t.Fatalf("duplicate chunk name %q", chunk.Name)
		}
		names[chunk.Name] = struct{}{}
	}
}

func TestOpenRawStoreAndAppendAcrossBoundary(t *testing.T) {
	store, filename := newTestStore(t, 4)
	writer := NewLogWriter(store)
	if _, err := writer.Write([]byte("abc")); err != nil {
		t.Fatalf("initial write: %v", err)
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("close initial writer: %v", err)
	}
	if err := store.Save(); err != nil {
		t.Fatalf("save raw store: %v", err)
	}

	opened, err := OpenLogStore(filename)
	if err != nil {
		t.Fatalf("open raw store: %v", err)
	}
	writeStore(t, opened, []byte("defgh"))

	reopened, err := OpenLogStore(filename)
	if err != nil {
		t.Fatalf("reopen store: %v", err)
	}
	assertStoreData(t, reopened, []byte("abcdefgh"))
}

func TestLogReaderSeek(t *testing.T) {
	store, _ := newTestStore(t, 4)
	writeStore(t, store, []byte("abcdefgh"))

	reader := NewLogReader(store)
	defer reader.Close()

	offset, err := reader.Seek(3, io.SeekStart)
	if err != nil || offset != 3 {
		t.Fatalf("SeekStart returned (%d, %v), want (3, nil)", offset, err)
	}
	buffer := make([]byte, 1)
	if _, err := io.ReadFull(reader, buffer); err != nil || string(buffer) != "d" {
		t.Fatalf("read after SeekStart returned (%q, %v)", buffer, err)
	}

	offset, err = reader.Seek(2, io.SeekCurrent)
	if err != nil || offset != 6 {
		t.Fatalf("SeekCurrent returned (%d, %v), want (6, nil)", offset, err)
	}
	assertReaderData(t, reader, []byte("gh"))

	offset, err = reader.Seek(-2, io.SeekEnd)
	if err != nil || offset != 6 {
		t.Fatalf("SeekEnd returned (%d, %v), want (6, nil)", offset, err)
	}
	assertReaderData(t, reader, []byte("gh"))

	offset, err = reader.Seek(0, io.SeekEnd)
	if err != nil || offset != 8 {
		t.Fatalf("seek to exact full-chunk end returned (%d, %v)", offset, err)
	}
	if _, err := reader.Read(buffer); !errors.Is(err, io.EOF) {
		t.Fatalf("read at end returned %v, want EOF", err)
	}

	for _, tc := range []struct {
		delta  int64
		whence int
	}{
		{delta: -1, whence: io.SeekStart},
		{delta: 1, whence: io.SeekEnd},
		{delta: 0, whence: 99},
	} {
		if _, err := reader.Seek(tc.delta, tc.whence); err == nil {
			t.Fatalf("Seek(%d, %d) unexpectedly succeeded", tc.delta, tc.whence)
		}
	}
}

func TestSlicePersistsIndexBeforeRemovingChunks(t *testing.T) {
	store, filename := newTestStore(t, 4)
	writer := NewLogWriter(store)
	if _, err := writer.Write([]byte("abcdefghij")); err != nil {
		t.Fatalf("write: %v", err)
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("close writer: %v", err)
	}

	sliced, err := store.Slice(4, true)
	if err != nil {
		t.Fatalf("slice: %v", err)
	}

	opened, err := OpenLogStore(filename)
	if err != nil {
		t.Fatalf("open immediately after slice: %v", err)
	}
	assertStoreData(t, opened, []byte("efghij"))

	writeStore(t, sliced, []byte("kl"))
	reopened, err := OpenLogStore(filename)
	if err != nil {
		t.Fatalf("open appended slice: %v", err)
	}
	assertStoreData(t, reopened, []byte("efghijkl"))
}

func TestSliceRejectsInvalidOffsets(t *testing.T) {
	store, _ := newTestStore(t, 4)
	writer := NewLogWriter(store)
	if _, err := writer.Write([]byte("abc")); err != nil {
		t.Fatalf("write: %v", err)
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("close writer: %v", err)
	}

	if _, err := store.Slice(-1, true); err == nil {
		t.Fatal("negative slice offset unexpectedly succeeded")
	}
	if _, err := store.Slice(4, true); err == nil {
		t.Fatal("slice offset beyond size unexpectedly succeeded")
	}
	if _, err := store.Slice(1, false); err == nil {
		t.Fatal("exact slice unexpectedly succeeded")
	}
}

func TestOpenStoreReportsMissingChunk(t *testing.T) {
	store, filename := newTestStore(t, 4)
	writeStore(t, store, []byte("abc"))

	chunks := store.GetChunks()
	if len(chunks) != 1 {
		t.Fatalf("got %d chunks, want 1", len(chunks))
	}
	if err := os.Remove(filepath.Join(filepath.Dir(filename), chunks[0].Name)); err != nil {
		t.Fatalf("remove chunk: %v", err)
	}
	if _, err := OpenLogStore(filename); err == nil {
		t.Fatal("opening a store with a missing chunk unexpectedly succeeded")
	}
}

func TestConcurrentReadAndWrite(t *testing.T) {
	store, _ := newTestStore(t, 32)
	dataStore := store.GetDataStore()

	var wg sync.WaitGroup
	errorsCh := make(chan error, 2)
	wg.Add(2)
	go func() {
		defer wg.Done()
		for i := 0; i < 200; i++ {
			if _, err := dataStore.Write([]byte("abcdefgh")); err != nil {
				errorsCh <- err
				return
			}
		}
	}()
	go func() {
		defer wg.Done()
		for i := 0; i < 200; i++ {
			offset := dataStore.Len()
			if offset > 8 {
				offset -= 8
			} else {
				offset = 0
			}
			if _, err := dataStore.ReadAt(offset); err != nil {
				errorsCh <- err
				return
			}
		}
	}()
	wg.Wait()
	close(errorsCh)
	for err := range errorsCh {
		t.Errorf("concurrent operation: %v", err)
	}
	if err := dataStore.Close(); err != nil {
		t.Fatalf("close data store: %v", err)
	}
}

func TestWriterRejectsWriteAfterClose(t *testing.T) {
	store, _ := newTestStore(t, 4)
	writer := NewLogWriter(store)
	if err := writer.Close(); err != nil {
		t.Fatalf("close writer: %v", err)
	}
	if _, err := writer.Write([]byte("x")); !errors.Is(err, os.ErrClosed) {
		t.Fatalf("write after close returned %v, want os.ErrClosed", err)
	}
}

func newTestStore(t *testing.T, chunkSize int) (*LogStore, string) {
	t.Helper()
	filename := filepath.Join(t.TempDir(), "store")
	store := NewLogStore(filename)
	store.ChunkSize = chunkSize
	return store, filename
}

func writeStore(t *testing.T, store *LogStore, data []byte) {
	t.Helper()
	writer := NewLogWriter(store)
	if _, err := writer.Write(data); err != nil {
		t.Fatalf("write store: %v", err)
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("close writer: %v", err)
	}
	if err := store.Close(); err != nil {
		t.Fatalf("close store: %v", err)
	}
}

func assertStoreData(t *testing.T, store *LogStore, want []byte) {
	t.Helper()
	if got := store.Len(); got != int64(len(want)) {
		t.Fatalf("store length %d, want %d", got, len(want))
	}
	reader := NewLogReader(store)
	defer reader.Close()
	assertReaderData(t, reader, want)
}

func assertReaderData(t *testing.T, reader io.Reader, want []byte) {
	t.Helper()
	got, err := io.ReadAll(reader)
	if err != nil {
		t.Fatalf("read: %v", err)
	}
	if string(got) != string(want) {
		t.Fatalf("read %q, want %q", got, want)
	}
}
