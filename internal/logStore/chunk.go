package logstore

import (
	"compress/flate"
	"errors"
	"io"
	"log"
	"os"
	"path"
	"sync"
)

type LogChunk struct {
	Name       string `json:"name"`
	Len        int    `json:"len"`
	Closed     bool   `json:"closed"`
	Compressed bool   `json:"compressed"`
	m          sync.RWMutex
	cm         sync.Mutex
}

func (s *LogChunk) OpenForReading(place string) (f *os.File, r io.ReadCloser, err error) {
	s.m.RLock()
	defer s.m.RUnlock()

	filename := path.Join(place, s.Name)
	f, err = os.OpenFile(filename, os.O_RDONLY, 0600)
	if err != nil {
		return
	}
	r = s.getReader(f)
	return
}

func (s *LogChunk) OpenForWriting(place string) (f *os.File, err error) {
	s.m.RLock()
	defer s.m.RUnlock()

	filename := path.Join(place, s.Name)
	f, err = os.OpenFile(filename, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0600)
	if err != nil {
		return
	}
	return
}

func (s *LogChunk) GetLen() int {
	s.m.RLock()
	defer s.m.RUnlock()

	return s.Len
}

func (s *LogChunk) GetAvailableLen() int {
	s.m.RLock()
	defer s.m.RUnlock()

	return ChunkSize - s.Len
}

func (s *LogChunk) IncLen(n int) {
	s.m.Lock()
	defer s.m.Unlock()

	s.Len += n
}

func (s *LogChunk) CanCompress() bool {
	s.m.RLock()
	defer s.m.RUnlock()

	return !s.Compressed && s.Closed
}

func (s *LogChunk) Compress(place string) (err error) {
	s.cm.Lock()
	defer s.cm.Unlock()

	s.m.RLock()
	if s.Compressed {
		return errors.New("chunk_already_compressed")
	}
	if !s.Closed {
		return errors.New("chunk_is_not_closed")
	}
	name := s.Name
	s.m.RUnlock()

	cName := name + ".gz"
	sPath := path.Join(place, name)
	sf, err := os.OpenFile(sPath, os.O_RDONLY, 0600)
	if err != nil {
		return
	}
	defer sf.Close()

	tPath := path.Join(place, cName)
	tf, err := os.OpenFile(tPath, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, 0600)
	if err != nil {
		return
	}
	defer tf.Close()

	cw, err := flate.NewWriter(tf, flate.BestCompression)
	if err != nil {
		return
	}

	if _, err = io.Copy(cw, sf); err != nil {
		return
	}

	if err = cw.Close(); err != nil {
		return
	}

	s.m.Lock()
	s.Compressed = true
	s.Name = cName
	s.m.Unlock()

	rmErr := os.Remove(sPath)
	if rmErr != nil {
		log.Println("Rm raw chunk error", rmErr)
	}
	return
}

func (s *LogChunk) Close() {
	s.m.Lock()
	defer s.m.Unlock()

	s.Closed = true
}

func (s *LogChunk) getReader(f *os.File) io.ReadCloser {
	if !s.Compressed {
		return f
	}
	return flate.NewReader(f)
}

func NewLogChunk(name string) *LogChunk {
	return &LogChunk{
		Name: name,
	}
}
