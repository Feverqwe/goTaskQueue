package gzbuffer

import (
	"fmt"
	"io"
	"sync"
)

type Transformer func(chunk []byte) (io.ReadCloser, error)

type ChunkReader struct {
	index      int
	offset     int64
	chunks     *[]CChunk
	size       *int64
	chM        *sync.RWMutex
	tr         Transformer
	lastReader io.ReadCloser
}

func (s *ChunkReader) Read(p []byte) (int, error) {
	if len(p) == 0 {
		return 0, nil
	}
	for {
		if s.lastReader == nil {
			s.chM.RLock()
			chunks := *s.chunks
			s.chM.RUnlock()

			if s.index >= len(chunks) {
				return 0, io.EOF
			}

			c := chunks[s.index]
			reader, err := s.tr(c.data)
			if err != nil {
				if reader != nil {
					_ = reader.Close()
				}
				return 0, err
			}
			s.lastReader = reader
		}

		n, err := s.lastReader.Read(p)
		s.offset += int64(n)
		if err != io.EOF {
			return n, err
		}

		s.index++
		closeErr := s.resetLastReader()
		if n > 0 || closeErr != nil {
			return n, closeErr
		}
	}
}

func (s *ChunkReader) Seek(delta int64, whence int) (int64, error) {
	s.chM.RLock()
	chunks := *s.chunks
	size := *s.size
	s.chM.RUnlock()

	var off int64
	switch whence {
	case io.SeekStart:
		off = delta
	case io.SeekCurrent:
		off = s.offset + delta
	case io.SeekEnd:
		off = size + delta
	default:
		return s.offset, fmt.Errorf("invalid seek whence %d", whence)
	}
	if off < 0 || off > size {
		return s.offset, fmt.Errorf("seek offset %d outside chunk size %d", off, size)
	}

	if err := s.resetLastReader(); err != nil {
		return s.offset, err
	}
	if off == size {
		s.index = len(chunks)
		s.offset = off
		return off, nil
	}

	left := int64(0)
	index := len(chunks)
	for i, chunk := range chunks {
		right := left + int64(chunk.size)
		if off < right {
			index = i
			break
		}
		left = right
	}
	if index == len(chunks) {
		return s.offset, fmt.Errorf("seek offset %d not covered by chunks", off)
	}

	reader, err := s.tr(chunks[index].data)
	if err != nil {
		if reader != nil {
			_ = reader.Close()
		}
		return s.offset, err
	}
	chunkOffset := off - left
	if chunkOffset > 0 {
		if _, err := io.CopyN(io.Discard, reader, chunkOffset); err != nil {
			_ = reader.Close()
			return s.offset, err
		}
	}

	s.index = index
	s.offset = off
	s.lastReader = reader
	return off, nil
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

func NewChunkReader(chunks *[]CChunk, chunksSize *int64, t Transformer, m *sync.RWMutex) *ChunkReader {
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
