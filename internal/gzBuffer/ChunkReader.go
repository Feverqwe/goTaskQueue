package gzbuffer

import (
	"io"
	"sync"
)

type Transfromer func(chunk []byte) io.ReadCloser

type ChunkReader struct {
	io.Reader
	index      int
	chunks     *[]CChunk
	chM        *sync.RWMutex
	tr         Transfromer
	lastReader io.ReadCloser
}

func (s *ChunkReader) Read(p []byte) (int, error) {
	s.chM.RLock()
	chunks := *s.chunks
	s.chM.RUnlock()

	if s.index < len(chunks) {
		if s.lastReader == nil {
			c := chunks[s.index]
			s.lastReader = s.tr(c.data)
		}
		n, err := s.lastReader.Read(p)
		if err == io.EOF {
			s.index++
			s.lastReader = nil
			err = nil
		}
		return n, err
	}
	return 0, io.EOF
}

func NewChunkReader(chunks *[]CChunk, t Transfromer, m *sync.RWMutex) *ChunkReader {
	if m == nil {
		m = &sync.RWMutex{}
	}
	r := &ChunkReader{
		chunks: chunks,
		tr:     t,
		chM:    m,
	}
	return r
}
