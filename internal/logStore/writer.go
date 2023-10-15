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
	var cn int
	for len(data) > 0 {
		if !s.inited {
			s.inited = true
			chunks := s.store.Chunks
			if len(chunks) > 0 {
				chunk := chunks[len(chunks)-1]
				if chunk.GetAvailableLen() > 0 {
					s.chunk = chunk
					if err = s.openChunk(); err != nil {
						return
					}
				}
			}
		}

		if s.chunk == nil {
			name := s.store.GetChunkName()
			s.chunk = NewLogChunk(s.store, name)
			if err = s.openChunk(); err != nil {
				return
			}

			s.store.AppendChunk(s.chunk)
			s.store.EmitChange()
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
		s.chunk.Close()
		s.store.EmitChange()
	}
	s.chunk = nil
	return
}

func NewLogWriter(store *LogStore) *LogWriter {
	return &LogWriter{
		store: store,
	}
}
