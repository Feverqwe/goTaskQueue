package gzbuffer

import (
	"bytes"
	"errors"
	"io"
	"sync"
	"testing"
)

func TestGzBufferReadAndPipeAcrossChunks(t *testing.T) {
	data := patternedBytes(2*ChunkSize + 137)
	buffer := NewGzBuffer()
	if n, err := buffer.Write(data); err != nil || n != len(data) {
		t.Fatalf("Write() = %d, %v; want %d, nil", n, err, len(data))
	}
	if err := buffer.Close(); err != nil {
		t.Fatalf("Close(): %v", err)
	}

	if got := buffer.Len(); got != int64(len(data)) {
		t.Fatalf("Len() = %d, want %d", got, len(data))
	}
	for _, offset := range []int64{0, 1, ChunkSize - 1, ChunkSize, ChunkSize + 1, int64(len(data))} {
		got, err := buffer.ReadAt(offset)
		if err != nil {
			t.Fatalf("ReadAt(%d): %v", offset, err)
		}
		if want := data[offset:]; !bytes.Equal(got, want) {
			t.Fatalf("ReadAt(%d) returned %d bytes, want %d", offset, len(got), len(want))
		}
	}

	var piped bytes.Buffer
	if err := buffer.PipeTo(&piped); err != nil {
		t.Fatalf("PipeTo(): %v", err)
	}
	if !bytes.Equal(piped.Bytes(), data) {
		t.Fatalf("PipeTo() returned %d bytes, want %d", piped.Len(), len(data))
	}

	if n, err := buffer.Write([]byte("after close")); n != 0 || !errors.Is(err, io.ErrClosedPipe) {
		t.Fatalf("Write() after Close() = %d, %v; want 0, %v", n, err, io.ErrClosedPipe)
	}
	if err := buffer.Close(); err != nil {
		t.Fatalf("second Close(): %v", err)
	}
}

func TestGzBufferRejectsInvalidOffsets(t *testing.T) {
	buffer := NewGzBuffer()
	if _, err := buffer.Write([]byte("abc")); err != nil {
		t.Fatal(err)
	}

	for _, offset := range []int64{-1, 4} {
		if _, err := buffer.ReadAt(offset); err == nil {
			t.Errorf("ReadAt(%d) returned nil error", offset)
		}
		if _, err := buffer.Slice(offset, false); err == nil {
			t.Errorf("Slice(%d) returned nil error", offset)
		}
	}
}

func TestGzBufferSliceKeepsRightSide(t *testing.T) {
	data := patternedBytes(2*ChunkSize + 100)
	buffer := NewGzBuffer()
	if _, err := buffer.Write(data); err != nil {
		t.Fatal(err)
	}
	if err := buffer.Close(); err != nil {
		t.Fatal(err)
	}

	rightSize := int64(ChunkSize + 50)
	exact, err := buffer.Slice(rightSize, false)
	if err != nil {
		t.Fatalf("exact Slice(): %v", err)
	}
	assertBufferData(t, exact, data[len(data)-int(rightSize):])

	approx, err := buffer.Slice(rightSize, true)
	if err != nil {
		t.Fatalf("approximate Slice(): %v", err)
	}
	wantApprox := data[ChunkSize:]
	assertBufferData(t, approx, wantApprox)
}

func TestGzBufferSliceDoesNotAliasWritableBuffer(t *testing.T) {
	buffer := NewGzBuffer()
	if _, err := buffer.Write([]byte("abcdefghij")); err != nil {
		t.Fatal(err)
	}
	sliced, err := buffer.Slice(4, false)
	if err != nil {
		t.Fatal(err)
	}

	if _, err := buffer.Write([]byte("-original")); err != nil {
		t.Fatal(err)
	}
	if _, err := sliced.Write([]byte("-slice")); err != nil {
		t.Fatal(err)
	}
	assertBufferData(t, buffer, []byte("abcdefghij-original"))
	assertBufferData(t, sliced, []byte("ghij-slice"))
}

func TestGzBufferConcurrentCloseWriteAndRead(t *testing.T) {
	data := patternedBytes(4*ChunkSize + 123)
	buffer := NewGzBuffer()
	if _, err := buffer.Write(data); err != nil {
		t.Fatal(err)
	}

	start := make(chan struct{})
	var wg sync.WaitGroup
	for range 4 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			<-start
			for range 10 {
				var piped bytes.Buffer
				if err := buffer.PipeTo(&piped); err != nil {
					t.Errorf("PipeTo(): %v", err)
					return
				}
				if !bytes.Equal(piped.Bytes(), data) {
					t.Errorf("PipeTo() returned %d bytes, want %d", piped.Len(), len(data))
					return
				}
			}
		}()
	}
	close(start)
	if err := buffer.Close(); err != nil {
		t.Fatal(err)
	}
	wg.Wait()
	assertBufferData(t, buffer, data)

	writeBuffer := NewGzBuffer()
	start = make(chan struct{})
	wg.Add(2)
	go func() {
		defer wg.Done()
		<-start
		for range 1000 {
			if _, err := writeBuffer.Write([]byte("x")); errors.Is(err, io.ErrClosedPipe) {
				return
			} else if err != nil {
				t.Errorf("Write(): %v", err)
				return
			}
		}
	}()
	go func() {
		defer wg.Done()
		<-start
		if err := writeBuffer.Close(); err != nil {
			t.Errorf("Close(): %v", err)
		}
	}()
	close(start)
	wg.Wait()
}

func assertBufferData(t *testing.T, buffer *GzBuffer, want []byte) {
	t.Helper()
	got, err := buffer.ReadAt(0)
	if err != nil {
		t.Fatalf("ReadAt(0): %v", err)
	}
	if !bytes.Equal(got, want) {
		t.Fatalf("buffer contains %d bytes, want %d", len(got), len(want))
	}
}

func patternedBytes(size int) []byte {
	data := make([]byte, size)
	var value uint32 = 1
	for i := range data {
		value = value*1664525 + 1013904223
		data[i] = byte(value >> 24)
	}
	return data
}
