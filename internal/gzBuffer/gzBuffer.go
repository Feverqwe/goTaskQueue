package gzbuffer

import (
	"bytes"
	"compress/gzip"
	"io"
	"sync"
)

const ChunkSize = 4 * 1024 * 1024
const UncompressSize = 1 * 1024 * 1024

type GzBuffer struct {
	gzChunks [][]byte
	gzOffset int
	buf      []byte
	mu       sync.Mutex
}

func (s *GzBuffer) Append(data []byte) {
	s.mu.Lock()
	s.buf = append(s.buf, data...)
	s.mu.Unlock()
	if len(s.buf) > ChunkSize+UncompressSize {
		s.compress(ChunkSize)
	}
}

func (s *GzBuffer) Read(offset int) []byte {
	buf := s.buf
	goff := s.gzOffset
	i := len(s.gzChunks) - 1
	for goff > offset && i >= 0 {
		ch := s.gzChunks[i]
		i -= 1
		r, err := gzip.NewReader(bytes.NewReader(ch))
		if err != nil {
			break
		}
		chunk := make([]byte, 0)
		b := make([]byte, 16*1024)
		for {
			bytes, err := r.Read(b)
			if err == io.EOF || err != nil {
				break
			}
			chunk = append(chunk, b[0:bytes]...)
		}
		buf = append(chunk, buf...)
		goff -= len(chunk)
	}
	return buf[offset-goff:]
}

func (s *GzBuffer) PipeTo(w io.Writer) error {
	for _, chunk := range s.gzChunks {
		r, err := gzip.NewReader(bytes.NewReader(chunk))
		if err != nil {
			return err
		}
		b := make([]byte, 16*1024)
		for {
			bytes, err := r.Read(b)
			if err == io.EOF {
				break
			}
			if err != nil {
				return err
			}
			if _, err := w.Write(b[0:bytes]); err != nil {
				return err
			}
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
	s.gzChunks = make([][]byte, 0)
	s.gzOffset = 0
	s.buf = buf
	s.mu.Unlock()
}

func (s *GzBuffer) Len() int {
	return s.gzOffset + len(s.buf)
}

func (s *GzBuffer) Finish() {
	s.compress(len(s.buf))
}

func (s *GzBuffer) compress(size int) {
	var b bytes.Buffer
	gz := gzip.NewWriter(&b)
	_, err := gz.Write(s.buf[0:size])
	if err == nil {
		err = gz.Close()
	}
	if err == nil {
		s.mu.Lock()
		s.buf = s.buf[size:]
		s.gzChunks = append(s.gzChunks, b.Bytes())
		s.gzOffset += size
		s.mu.Unlock()
	}
}

func NewGzBuffer() *GzBuffer {
	gzb := GzBuffer{}
	return &gzb
}
