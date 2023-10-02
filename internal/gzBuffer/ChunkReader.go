package gzbuffer

import (
	"io"
	"sync"
)

type Transfromer func(chunk []byte) io.ReadCloser

type ChunkReader struct {
	io.ReadCloser
	index      int
	chunks     *[][]byte
	chM        *sync.RWMutex
	tr         Transfromer
	lastReader io.ReadCloser
	m          sync.Mutex
	reverse    bool
	delta      int
}

func (s *ChunkReader) Read(p []byte) (int, error) {
	s.m.Lock()
	defer s.m.Unlock()

	s.chM.RLock()
	chunks := *s.chunks
	s.chM.RUnlock()

	var ok bool
	if s.reverse {
		ok = s.index >= 0
	} else {
		ok = s.index < len(chunks)
	}

	if ok {
		if s.lastReader == nil {
			c := chunks[s.index]
			s.lastReader = s.tr(c)
		}
		n, err := s.lastReader.Read(p)
		if err == io.EOF {
			s.index += s.delta
			s.lastReader = nil
			err = nil
		}
		return n, err
	}
	return 0, io.EOF
}

func (s *ChunkReader) Close() error {
	s.m.Lock()
	defer s.m.Unlock()

	s.lastReader = nil
	return nil
}

func NewChunkReader(chunks *[][]byte, t Transfromer, m *sync.RWMutex, reverse bool) *ChunkReader {
	if m == nil {
		m = &sync.RWMutex{}
	}
	delta := 1
	index := 0
	if reverse {
		delta = -1
		m.RLock()
		index = len(*chunks) - 1
		m.RUnlock()
	}

	r := &ChunkReader{
		chunks:  chunks,
		tr:      t,
		chM:     m,
		reverse: reverse,
		index:   index,
		delta:   delta,
	}
	return r
}
