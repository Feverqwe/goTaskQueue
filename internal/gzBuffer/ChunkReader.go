package gzbuffer

import (
	"errors"
	"io"
	"sync"
)

type Transfromer func(chunk []byte) io.ReadCloser

type ChunkReader struct {
	io.ReadCloser
	index      int
	offset     int
	chunks     *[]CChunk
	size       *int
	chM        *sync.RWMutex
	tr         Transfromer
	lastReader io.ReadCloser
}

func (s *ChunkReader) Read(p []byte) (int, error) {
	// log.Println("read")
	if s.lastReader == nil {
		s.chM.RLock()
		chunks := *s.chunks
		s.chM.RUnlock()

		if s.index >= len(chunks) {
			return 0, io.EOF
		}

		c := chunks[s.index]
		s.lastReader = s.tr(c.data)
	}

	n, err := s.lastReader.Read(p)
	if err == io.EOF {
		s.index++
		err = s.resetLastReader()
	}
	s.offset += n
	return n, err
}

func (s *ChunkReader) Seek(delta int, whense int) error {
	// log.Println("seek", delta, whense)
	s.chM.RLock()
	chunks := *s.chunks
	size := *s.size
	s.chM.RUnlock()

	var off int
	switch whense {
	case 0:
		// 0 means relative to the origin of the file
		off = delta
	case 1:
		// 1 means relative to the current offset
		off = s.offset + delta
	case 2:
		// 2 means relative to the end
		off = size - delta
	}
	if size < off {
		return errors.New("offset_more_than_size")
	}

	var left int
	if off > size/2 {
		left = size
		i := len(chunks) - 1
		for i >= 0 {
			left -= chunks[i].size
			if left < off {
				s.index = i
				break
			}
			i--
		}
	} else {
		left = 0
		for i, c := range chunks {
			nextLeft := left + c.size
			if nextLeft >= off {
				s.index = i
				break
			}
			left = nextLeft
		}
	}

	chunk := chunks[s.index]
	s.offset = off

	err := s.resetLastReader()
	if err != nil {
		return err
	}
	s.lastReader = s.tr(chunk.data)

	chunkOffset := off - left
	for chunkOffset > 0 {
		n, err := s.lastReader.Read(make([]byte, chunkOffset))
		chunkOffset -= n
		if err != nil {
			return err
		}
	}

	return nil
}

func (s *ChunkReader) Close() error {
	// log.Println("close")
	return s.resetLastReader()
}

func (s *ChunkReader) resetLastReader() error {
	var err error
	if s.lastReader != nil {
		err = s.lastReader.Close()
		s.lastReader = nil
	}
	return err
}

func NewChunkReader(chunks *[]CChunk, chunksSize *int, t Transfromer, m *sync.RWMutex) *ChunkReader {
	if m == nil {
		m = &sync.RWMutex{}
	}
	r := &ChunkReader{
		chunks: chunks,
		size:   chunksSize,
		tr:     t,
		chM:    m,
	}
	return r
}
