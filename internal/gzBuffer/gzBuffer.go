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
	gzChunks []*bytes.Buffer
	gzOffset int
	buf      []byte
	mu       sync.Mutex
}

func (s *GzBuffer) Append(data []byte) {
	s.mu.Lock()
	s.buf = append(s.buf, data...)
	s.mu.Unlock()
	if len(s.buf) > ChunkSize+UncompressSize {
		s.compress(UncompressSize)
	}
}

func (s *GzBuffer) Read(offset int) []byte {
	s.mu.Lock()
	buf := s.buf
	goff := s.gzOffset
	i := len(s.gzChunks) - 1
	for goff > offset && i >= 0 {
		idx := i
		i -= 1
		ch := s.gzChunks[idx]
		r, err := gzip.NewReader(ch)
		if err != nil {
			fmt.Println("gzip.NewReader error", idx, err)
			break
		}
		chunk, err := io.ReadAll(r)
		if err != nil {
			fmt.Println("io.ReadAll error", idx, err)
			break
		}
		buf = append(chunk, buf...)
		goff -= len(chunk)
	}
	s.mu.Unlock()
	return buf[offset-goff:]
}

func (s *GzBuffer) PipeTo(w io.Writer) error {
	for _, chunk := range s.gzChunks {
		r, err := gzip.NewReader(chunk)
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
	buf := s.Read(offset)
	s.mu.Lock()
	s.buf = buf
	s.gzChunks = make([]*bytes.Buffer, 0)
	s.gzOffset = 0
	s.mu.Unlock()
}

func (s *GzBuffer) Len() int {
	return s.gzOffset + len(s.buf)
}

func (s *GzBuffer) Finish() {
	s.compress(0)
}

func (s *GzBuffer) compress(minSize int) {
	s.mu.Lock()
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
			fmt.Println("gz.Write Close", err)
			break
		}
		s.buf = s.buf[size:]

		s.gzChunks = append(s.gzChunks, &b)
		s.gzOffset += size
	}
	s.mu.Unlock()
}

func NewGzBuffer() *GzBuffer {
	gzb := GzBuffer{}
	return &gzb
}
