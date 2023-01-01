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
	gzChunks []bytes.Buffer
	gzOffset int
	buf      []byte
	mu       sync.Mutex
}

func (s *GzBuffer) Append(data []byte) {
	s.mu.Lock()
	s.buf = append(s.buf, data...)
	if len(s.buf) > ChunkSize+UncompressSize {
		s.compress(UncompressSize)
	}
	s.mu.Unlock()
}

func (s *GzBuffer) Read(offset int) []byte {
	// fmt.Println("read", offset)
	buf := s.buf
	goff := s.gzOffset
	i := len(s.gzChunks) - 1
	for goff > offset && i >= 0 {
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
		goff -= len(chunk)
	}
	return buf[offset-goff:]
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
	buf := s.Read(offset)
	s.buf = buf
	s.gzChunks = make([]bytes.Buffer, 0)
	s.gzOffset = 0
	s.mu.Unlock()
}

func (s *GzBuffer) Len() int {
	return s.gzOffset + len(s.buf)
}

func (s *GzBuffer) Finish() {
	s.mu.Lock()
	s.compress(0)
	s.mu.Unlock()
}

func (s *GzBuffer) compress(minSize int) {
	// fmt.Println("compress", minSize)
	for len(s.buf) > minSize {
		size := len(s.buf) - minSize
		if size > ChunkSize {
			size = ChunkSize
		}

		chunk := s.buf[0:size]

		var b bytes.Buffer
		gz := gzip.NewWriter(&b)
		if _, err := gz.Write(chunk); err != nil {
			fmt.Println("gz.Write error", err)
			break
		}
		if err := gz.Close(); err != nil {
			fmt.Println("gz.Close error", err)
			break
		}

		s.buf = s.buf[size:]
		// fmt.Println("add chunk", b.Len(), size)
		s.gzChunks = append(s.gzChunks, b)
		s.gzOffset += size
	}
}

func NewGzBuffer() *GzBuffer {
	gzb := GzBuffer{}
	return &gzb
}
