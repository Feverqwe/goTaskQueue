package logstore

import (
	"compress/flate"
	"errors"
	"io"
	"os"
	"path"
	"sync"
)

type LogChunk struct {
	Name       string `json:"name"`
	Len        int    `json:"len"`
	Closed     bool   `json:"closed"`
	Compressed bool   `json:"compressed"`
	store      *LogStore
	wg         sync.WaitGroup
}

func (s *LogChunk) OpenForReading() (f *os.File, r io.ReadCloser, err error) {
	filename := path.Join(s.store.place, s.Name)
	f, err = os.OpenFile(filename, os.O_RDONLY, 0600)
	if err != nil {
		return
	}
	s.wg.Add(1)
	r = s.GetReader(f)
	return
}

func (s *LogChunk) OpenForWriting() (f *os.File, err error) {
	filename := path.Join(s.store.place, s.Name)
	f, err = os.OpenFile(filename, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0600)
	if err != nil {
		return
	}
	s.Closed = false
	s.wg.Add(1)
	return
}

func (s *LogChunk) CanCompress() bool {
	return !s.Compressed && s.Closed
}

func (s *LogChunk) Compress() (lc *LogChunk, err error) {
	if s.Compressed {
		return lc, errors.New("chunk_already_compressed")
	}
	if !s.Closed {
		return lc, errors.New("chunk_is_not_closed")
	}

	name := s.Name
	cName := name + ".gz"
	sPath := path.Join(s.store.place, name)
	sf, err := os.OpenFile(sPath, os.O_RDONLY, 0600)
	if err != nil {
		return
	}
	defer sf.Close()

	tPath := path.Join(s.store.place, cName)
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

	lc = s.Clone(s.store)
	lc.Name = cName
	lc.Compressed = true

	return
}

func (s *LogChunk) Clone(store *LogStore) *LogChunk {
	return &LogChunk{
		Name:       s.Name,
		Len:        s.Len,
		Closed:     s.Closed,
		Compressed: s.Compressed,
		store:      store,
	}
}

func (s *LogChunk) Close(f *os.File, isWriter bool) (err error) {
	err = f.Close()
	if isWriter {
		s.Closed = true
	}
	s.wg.Done()
	return
}

func (s *LogChunk) Remove() error {
	s.wg.Wait()
	filename := path.Join(s.store.place, s.Name)
	return os.Remove(filename)
}

func (s *LogChunk) GetReader(f *os.File) io.ReadCloser {
	if !s.Compressed {
		return nil
	}
	return flate.NewReader(f)
}

func (s *LogChunk) SyncLen() (err error) {
	if s.Compressed {
		return
	}

	sPath := path.Join(s.store.place, s.Name)
	stat, err := os.Stat(sPath)
	if err != nil {
		return
	}

	s.Len = int(stat.Size())

	return
}

func NewLogChunk(store *LogStore) *LogChunk {
	return &LogChunk{
		Name:  store.GetChunkName(),
		store: store,
	}
}
