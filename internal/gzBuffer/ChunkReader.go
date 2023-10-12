package gzbuffer

import (
	"errors"
	"io"
	"sync"
)

type Transfromer func(chunk []byte) (io.ReadCloser, error)

type ChunkReader struct {
	io.ReadCloser
	index      int
	offset     int64
	chunks     *[]CChunk
	size       *int64
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
		var err error
		s.lastReader, err = s.tr(c.data)
		if err != nil {
			return 0, err
		}
	}

	n, err := s.lastReader.Read(p)
	if err == io.EOF {
		s.index++
		err = s.resetLastReader()
	}
	s.offset += int64(n)
	return n, err
}

func (s *ChunkReader) Seek(delta int64, whense int) error {
	// log.Println("seek", delta, whense)
	s.chM.RLock()
	chunks := *s.chunks
	size := *s.size
	s.chM.RUnlock()

	var off int64
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

	var left int64
	if off > size/2 {
		left = size
		i := len(chunks) - 1
		for i >= 0 {
			left -= int64(chunks[i].size)
			if left < off {
				s.index = i
				break
			}
			i--
		}
	} else {
		left = 0
		for i, c := range chunks {
			nextLeft := left + int64(c.size)
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
	s.lastReader, err = s.tr(chunk.data)
	if err != nil {
		return err
	}

	chunkOffset := off - left
	if chunkOffset > 0 {
		_, err := io.ReadFull(s.lastReader, make([]byte, chunkOffset))
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

func NewChunkReader(chunks *[]CChunk, chunksSize *int64, t Transfromer, m *sync.RWMutex) *ChunkReader {
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
