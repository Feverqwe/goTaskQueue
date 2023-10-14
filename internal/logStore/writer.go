package logstore

import (
	"io"
	"os"
	"strconv"
)

type LogWriter struct {
	io.WriteCloser
	store *LogStore
	chunk *LogChunk
	file  *os.File
}

func (s *LogWriter) Write(data []byte) (n int, err error) {
	// log.Println("Write", len(data))
	var cn int
	for len(data) > 0 {
		if s.chunk == nil {
			index := len(s.store.GetChunks())
			name := s.store.Name + "-chunk-" + strconv.Itoa(index)
			s.chunk = NewLogChunk(name)
			if err = s.openChunk(); err != nil {
				return
			}

			s.store.PutChunk(s.chunk)
		}

		avail := s.chunk.GetAvailableLen()
		size := min(len(data), avail)

		cn, err = s.file.Write(data[0:size])
		s.chunk.IncLen(cn)
		n += cn
		if err != nil {
			return
		}

		data = data[size:]

		if avail-cn == 0 {
			if err = s.closeChunk(); err != nil {
				return
			}
		}
	}
	return
}

func (s *LogWriter) Close() (err error) {
	// log.Println("w Close")
	return s.closeChunk()
}

func (s *LogWriter) openChunk() (err error) {
	f, err := s.chunk.OpenForWriting(s.store.place)
	if err != nil {
		return
	}
	s.file = f
	return
}

func (s *LogWriter) closeChunk() (err error) {
	if s.file != nil {
		if err = s.file.Close(); err != nil {
			return
		}
	}
	s.file = nil
	if s.chunk != nil {
		s.chunk.Close()
	}
	s.chunk = nil
	return s.store.OnChunkClose()
}

func NewLogWriter(store *LogStore) *LogWriter {
	return &LogWriter{
		store: store,
	}
}
