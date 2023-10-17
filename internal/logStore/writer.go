package logstore

import (
	"io"
	"os"
)

type LogWriter struct {
	io.WriteCloser
	store  *LogStore
	chunk  *LogChunk
	inited bool
	file   *os.File
}

func (s *LogWriter) Write(data []byte) (n int, err error) {
	// log.Println("w Write", len(data))
	if !s.inited {
		s.inited = true
		chunks := s.store.GetChunks()
		if len(chunks) > 0 {
			chunk := chunks[len(chunks)-1]
			if getAvailableSize(chunk, s.store.ChunkSize) > 0 {
				s.chunk = chunk
				if err = s.openChunk(); err != nil {
					return
				}
				s.chunk.Closed = false
			}
		}
	}

	var cn int
	for len(data) > 0 {
		if s.chunk == nil {
			s.chunk = NewLogChunk(s.store)
			if err = s.openChunk(); err != nil {
				return
			}

			s.store.AppendChunk(s.chunk)
		}

		l := s.chunk.Len
		avail := getAvailableSize(s.chunk, s.store.ChunkSize)
		size := min(len(data), avail)

		cn, err = s.file.Write(data[0:size])
		s.chunk.Len = l + cn
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
		s.chunk.Closed = true
	}
	s.chunk = nil
	return
}

func NewLogWriter(store *LogStore) *LogWriter {
	return &LogWriter{
		store: store,
	}
}
