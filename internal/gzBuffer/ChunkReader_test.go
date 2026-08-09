package gzbuffer

import (
	"bytes"
	"compress/flate"
	"io"
	"testing"
)

func TestChunkReaderReadAndSeek(t *testing.T) {
	chunks := compressedChunks(t, []byte("abc"), []byte("defg"), []byte("hij"))
	size := int64(10)
	reader := NewChunkReader(&chunks, &size, getChunkExtractor(), nil)
	defer reader.Close()

	assertReaderData(t, reader, []byte("abcdefghij"))
	assertSeekData(t, reader, 3, io.SeekStart, 3, []byte("defghij"))
	assertSeekData(t, reader, -2, io.SeekEnd, 8, []byte("ij"))

	if offset, err := reader.Seek(2, io.SeekStart); err != nil || offset != 2 {
		t.Fatalf("Seek(2, SeekStart) = %d, %v", offset, err)
	}
	buf := make([]byte, 2)
	if _, err := io.ReadFull(reader, buf); err != nil {
		t.Fatal(err)
	}
	assertSeekData(t, reader, 2, io.SeekCurrent, 6, []byte("ghij"))
	assertSeekData(t, reader, 0, io.SeekEnd, size, nil)
}

func TestChunkReaderSeekRejectsInvalidOffsets(t *testing.T) {
	chunks := compressedChunks(t, []byte("abc"))
	size := int64(3)
	reader := NewChunkReader(&chunks, &size, getChunkExtractor(), nil)
	defer reader.Close()

	for _, tc := range []struct {
		delta  int64
		whence int
	}{
		{-1, io.SeekStart},
		{4, io.SeekStart},
		{-4, io.SeekEnd},
		{1, io.SeekEnd},
		{0, 99},
	} {
		if _, err := reader.Seek(tc.delta, tc.whence); err == nil {
			t.Errorf("Seek(%d, %d) returned nil error", tc.delta, tc.whence)
		}
	}
}

func TestChunkReaderSeekEmpty(t *testing.T) {
	chunks := make([]CChunk, 0)
	var size int64
	reader := NewChunkReader(&chunks, &size, getChunkExtractor(), nil)
	defer reader.Close()

	if offset, err := reader.Seek(0, io.SeekStart); err != nil || offset != 0 {
		t.Fatalf("Seek(0, SeekStart) = %d, %v", offset, err)
	}
	buf := make([]byte, 1)
	if n, err := reader.Read(buf); n != 0 || err != io.EOF {
		t.Fatalf("Read() = %d, %v; want 0, EOF", n, err)
	}
}

func assertSeekData(t *testing.T, reader *ChunkReader, delta int64, whence int, wantOffset int64, want []byte) {
	t.Helper()
	offset, err := reader.Seek(delta, whence)
	if err != nil {
		t.Fatalf("Seek(%d, %d): %v", delta, whence, err)
	}
	if offset != wantOffset {
		t.Fatalf("Seek(%d, %d) offset = %d, want %d", delta, whence, offset, wantOffset)
	}
	assertReaderData(t, reader, want)
}

func assertReaderData(t *testing.T, reader io.Reader, want []byte) {
	t.Helper()
	got, err := io.ReadAll(reader)
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(got, want) {
		t.Fatalf("reader returned %q, want %q", got, want)
	}
}

func compressedChunks(t *testing.T, parts ...[]byte) []CChunk {
	t.Helper()
	writer, err := flate.NewWriter(nil, flate.BestSpeed)
	if err != nil {
		t.Fatal(err)
	}
	chunks := make([]CChunk, 0, len(parts))
	for _, part := range parts {
		data, err := compress(writer, part)
		if err != nil {
			t.Fatal(err)
		}
		chunks = append(chunks, CChunk{data: data, size: len(part)})
	}
	return chunks
}
