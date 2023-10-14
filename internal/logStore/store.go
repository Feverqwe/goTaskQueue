package logstore

import (
	"bytes"
	"encoding/json"
	"errors"
	"goTaskQueue/internal/shared"
	"io"
	"log"
	"os"
	"path"
	"sync"

	"github.com/natefinch/atomic"
)

type LogStore struct {
	Name   string      `json:"name"`
	Chunks []*LogChunk `json:"chunks"`
	place  string
	m      sync.RWMutex
}

func (s *LogStore) Len() int64 {
	s.m.Lock()
	defer s.m.Unlock()

	return s.len()
}

func (s *LogStore) len() int64 {
	return getChunksSize(s.Chunks)
}

func (s *LogStore) GetChunks() []*LogChunk {
	s.m.RLock()
	defer s.m.RUnlock()

	return s.Chunks
}

func (s *LogStore) PutChunk(chunk *LogChunk) {
	s.m.Lock()
	defer s.m.Unlock()

	s.Chunks = append(s.Chunks, chunk)
}

func (s *LogStore) OnChunkClose() (err error) {
	return s.Save()
}

func (s *LogStore) Save() (err error) {
	s.Compress()

	s.m.RLock()
	data, err := json.Marshal(s)
	s.m.RUnlock()

	if err != nil {
		return
	}
	filename := path.Join(s.place, s.Name+"-index")
	err = atomic.WriteFile(filename, bytes.NewReader(data))
	return
}

func (s *LogStore) Compress() {
	s.m.RLock()
	chunks := s.Chunks
	s.m.RUnlock()

	for _, chunk := range chunks {
		if chunk.CanCompress() {
			err := chunk.Compress(s.place)
			if err != nil {
				log.Println("Compress chunk error", err)
			}
		}
	}
}

func (s *LogStore) Slice(rightOffset int64, approx bool) (ls *LogStore, err error) {
	s.m.RLock()
	defer s.m.RUnlock()

	if !approx {
		return nil, errors.New("not_approximate_unsupported")
	}

	offset := s.Len() - rightOffset
	index := getChunkIndex(offset)

	ls = &LogStore{
		Name:   s.Name,
		place:  s.place,
		Chunks: s.Chunks[index:],
	}

	rmChunks := s.Chunks[0:index]
	go (func() {
		for _, ch := range rmChunks {
			filename := path.Join(s.place, ch.Name)
			err := os.Remove(filename)
			if err != nil {
				log.Println("Remove old chunk error", err)
			}
		}
	})()

	return
}

func (s *LogStore) GetDataStore() *shared.DataStore {
	w := NewLogWriter(s)

	return &shared.DataStore{
		Write: w.Write,
		ReadAt: func(i int64) (b []byte, err error) {
			// log.Println("ReadAt", i)

			r := NewLogReader(s)
			defer r.Close()

			_, err = r.Seek(i, 0)
			if err != nil {
				return
			}
			b, err = io.ReadAll(r)
			if err != nil {
				return
			}
			return
		},
		PipeTo: func(w io.Writer) (err error) {
			r := NewLogReader(s)
			defer r.Close()

			_, err = io.Copy(w, r)
			return
		},
		Slice: func(i int64, b bool) (ds *shared.DataStore, err error) {
			ls, err := s.Slice(i, b)
			if err != nil {
				return
			}
			ds = ls.GetDataStore()
			return
		},
		Len:   s.Len,
		Close: w.Close,
	}
}

func OpenLogStore(filename string) (ls *LogStore, err error) {
	data, err := os.ReadFile(filename + "-index")
	if err != nil {
		return
	}
	store := LogStore{}
	if err = json.Unmarshal(data, &store); err != nil {
		return
	}
	store.place = path.Dir(filename)
	ls = &store
	return
}

func NewLogStore(filename string) *LogStore {
	name := path.Base(filename)
	place := path.Dir(filename)
	return &LogStore{Name: name, place: place}
}
