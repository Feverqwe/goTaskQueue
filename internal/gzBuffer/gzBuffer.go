package gzbuffer

import (
	"bytes"
	"compress/gzip"
	"fmt"
	"io"
	"sync"
)

const ChunkSize = 4 * 1024 * 1024
const UncompressSize = 1 * 1024 * 1024

type GzBuffer struct {
	buf      []byte
	offset   int
	mu       sync.Mutex
	gzChunks []bytes.Buffer
}

func (s *GzBuffer) Append(data []byte) {
	s.mu.Lock()
	s.buf = append(s.buf, data...)
	if len(s.buf) > ChunkSize+UncompressSize {
		s.compress(ChunkSize)
	}
	s.mu.Unlock()
}

func (s *GzBuffer) Read(offset int) []byte {
	// fmt.Println("read", offset, s.offset)
	buf := s.buf
	off := s.offset
	i := len(s.gzChunks) - 1
	for off > offset && i >= 0 {
		idx := i
		i -= 1
		ch := s.gzChunks[idx]
		// fmt.Println("read chunk idx", idx, ch.Len())
		r, err := gzip.NewReader(&ch)
		if err != nil {
			fmt.Println("gzip.NewReader error", idx, err)
			break
		}
		chunk, err := io.ReadAll(r)
		if err != nil {
			fmt.Println("io.ReadAll error", idx, err)
			break
		}
		// fmt.Println("append chunk", len(chunk))
		buf = append(chunk, buf...)
		off -= len(chunk)
	}
	return buf[offset-off:]
}

func (s *GzBuffer) PipeTo(w io.Writer) error {
	for _, chunk := range s.gzChunks {
		r, err := gzip.NewReader(&chunk)
		if err != nil {
			return err
		}
		_, err = io.Copy(w, r)
		if err != nil {
			return err
		}
	}
	if _, err := w.Write(s.buf); err != nil {
		return err
	}
	return nil
}

func (s *GzBuffer) Trim(offset int) {
	s.mu.Lock()
	s.buf = s.Read(offset)
	s.offset = 0
	s.gzChunks = make([]bytes.Buffer, 0)
	s.mu.Unlock()
}

func (s *GzBuffer) Len() int {
	return s.offset + len(s.buf)
}

func (s *GzBuffer) Finish() {
	// fmt.Println("finish")
	size := len(s.buf)
	if size > 0 {
		s.mu.Lock()
		s.compress(size)
		s.mu.Unlock()
	}
}

func (s *GzBuffer) compress(size int) {
	chunk, err := compress(s.buf[0:size])
	if err != nil {
		fmt.Println("Compress error", err)
	} else {
		s.gzChunks = append(s.gzChunks, chunk)
		s.buf = s.buf[size:]
		s.offset += size
	}
}

func compress(chunk []byte) (bytes.Buffer, error) {
	// fmt.Println("compress")
	var b bytes.Buffer
	gz := gzip.NewWriter(&b)
	if _, err := gz.Write(chunk); err != nil {
		return b, err
	}
	if err := gz.Close(); err != nil {
		return b, err
	}

	return b, nil
}

func NewGzBuffer() *GzBuffer {
	gzb := GzBuffer{}
	return &gzb
}
