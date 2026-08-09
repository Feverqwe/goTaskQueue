package logstore

import (
	"errors"
	"io"
	"os"
	"sync"
)

type LogWriter struct {
	io.WriteCloser
	store  *LogStore
	chunk  *LogChunk
	inited bool
	file   *os.File
	closed bool
	mu     sync.Mutex
}

func (s *LogWriter) Write(data []byte) (n int, err error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.closed {
		return 0, os.ErrClosed
	}

	// log.Println("w Write", len(data))
	if !s.inited {
		s.inited = true
		if chunk := s.store.getAppendableChunk(); chunk != nil {
			s.chunk = chunk
			if err = s.openChunk(); err != nil {
				return
			}
			s.store.setChunkClosed(s.chunk, false)
		}
	}

	var cn int
	for len(data) > 0 {
		if s.chunk == nil {
			s.chunk = NewLogChunk(s.store)
			if err = s.openChunk(); err != nil {
				return
			}

			if err = s.store.AppendChunk(s.chunk); err != nil {
				_ = s.file.Close()
				s.file = nil
				s.store.rollbackAppendedChunk(s.chunk)
				_ = s.chunk.Remove()
				s.chunk = nil
				return
			}
		}

		avail := s.store.getChunkAvailableSize(s.chunk)
		if avail <= 0 {
			return n, errors.New("invalid_chunk_available_size")
		}
		size := min(len(data), avail)

		cn, err = s.file.Write(data[0:size])
		s.store.addChunkLen(s.chunk, cn)
		n += cn
		if err != nil {
			return
		}
		if cn != size {
			return n, io.ErrShortWrite
		}

		data = data[cn:]

		if avail == cn {
			if err = s.closeChunk(); err != nil {
				return
			}
		}
	}
	return
}

func (s *LogWriter) Close() (err error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.closed {
		return nil
	}
	s.closed = true
	// log.Println("w Close")
	return s.closeChunk()
}

func (s *LogWriter) openChunk() (err error) {
	// log.Println("w openChunk", s.chunk.Name)
	f, err := s.chunk.OpenForWriting()
	if err != nil {
		return
	}
	s.file = f
	return
}

func (s *LogWriter) closeChunk() (err error) {
	// log.Println("w closeChunk")
	if s.file != nil {
		if err = s.file.Close(); err != nil {
			return
		}
	}
	s.file = nil
	if s.chunk != nil {
		s.store.setChunkClosed(s.chunk, true)
	}
	s.chunk = nil
	return
}

func NewLogWriter(store *LogStore) *LogWriter {
	return &LogWriter{
		store: store,
	}
}
