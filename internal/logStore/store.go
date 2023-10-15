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
	"strconv"
	"sync"
	"time"

	"github.com/natefinch/atomic"
)

type LogStore struct {
	Name         string      `json:"name"`
	Chunks       []*LogChunk `json:"chunks"`
	chunkIndex   int
	place        string
	lastChangeAt time.Time
	lastSaveAt   time.Time
	sliced       bool
	cm           sync.Mutex
	chunksM      sync.Mutex
	static       bool
}

func (s *LogStore) Len() int64 {
	return getChunksSize(s.Chunks)
}

func (s *LogStore) AppendChunk(chunk *LogChunk) {
	s.chunksM.Lock()
	defer s.chunksM.Unlock()

	s.Chunks = append(s.Chunks, chunk)
}

func (s *LogStore) GetChunkName() string {
	s.chunkIndex++
	return s.Name + "-chunk-" + strconv.Itoa(s.chunkIndex)
}

func (s *LogStore) EmitChange() {
	s.lastChangeAt = time.Now()

	s.Save()

	if s.static {
		s.TryCompress()
	}
}

func (s *LogStore) Save() (err error) {
	if s.sliced {
		return
	}

	if s.lastSaveAt.After(s.lastChangeAt) {
		return
	}

	t := time.Now()

	data, err := json.Marshal(s.Clone(0))
	if err != nil {
		return
	}

	filename := path.Join(s.place, s.Name+"-index")
	err = atomic.WriteFile(filename, bytes.NewReader(data))
	if err == nil {
		s.lastSaveAt = t
	}
	return
}

func (s *LogStore) TryCompress() {
	if ok := s.cm.TryLock(); !ok {
		return
	}

	go func() {
		defer s.cm.Unlock()

		var n int
		for {
			if c := s.compress(false); !c {
				break
			}
			n++
		}
		if n > 0 {
			s.EmitChange()
		}
	}()
}

func (s *LogStore) compress(isClose bool) (c bool) {
	if s.sliced {
		return
	}

	chunks := s.Chunks
	if !isClose {
		if len(chunks) < 2 {
			return
		}
		chunks = chunks[0 : len(chunks)-1]
	}

	for idx, chunk := range chunks {
		if !chunk.CanCompress() {
			continue
		}
		cChunk, err := chunk.Compress()
		if err != nil {
			log.Println("Compress chunk error", err)
			continue
		}

		if s.sliced {
			return
		}

		s.chunksM.Lock()
		s.Chunks[idx] = cChunk
		s.chunksM.Unlock()

		c = true

		if err := chunk.Remove(); err != nil {
			log.Println("Remove raw chunk error", err)
		}
	}
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
			s.sliced = true
			err = w.Close()
			if err != nil {
				return
			}

			ls, err := s.Slice(i, b)
			if err != nil {
				return
			}

			ds = ls.GetDataStore()
			return
		},
		Len: s.Len,
		Close: func() (err error) {
			err = w.Close()
			s.Close()
			return
		},
	}
}

func (s *LogStore) Slice(rightOffset int64, approx bool) (ls *LogStore, err error) {
	if !approx {
		return nil, errors.New("not_approximate_unsupported")
	}

	s.sliced = true

	offset := s.Len() - rightOffset
	index := getChunkIndex(offset)

	rmChunks := s.Chunks[0:index]
	ls = s.Clone(index)

	go (func() {
		for _, ch := range rmChunks {
			if err := ch.Remove(); err != nil {
				log.Println("Remove sliced chunk error", err)
			}
		}
	})()

	return
}

func (s *LogStore) Clone(chunkIndex int) (ls *LogStore) {
	chunks := s.Chunks[chunkIndex:]

	ls = &LogStore{
		Name:       s.Name,
		place:      s.place,
		chunkIndex: s.chunkIndex,
		static:     s.static,
	}

	for _, chunk := range chunks {
		chunkCopy := chunk.Clone(ls)
		ls.Chunks = append(ls.Chunks, chunkCopy)
	}
	return
}

func (s *LogStore) Close() (err error) {
	s.cm.Lock()
	if s.compress(true) {
		s.lastChangeAt = time.Now()
	}
	s.cm.Unlock()

	return s.Save()
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
	for _, chunk := range store.Chunks {
		chunk.store = &store
		if err := chunk.SyncLen(); err != nil {
			log.Println("Sync chunk len error", err)
		}
	}

	ls = &store
	return
}

func NewLogStore(filename string, static bool) *LogStore {
	name := path.Base(filename)
	place := path.Dir(filename)
	return &LogStore{Name: name, place: place, static: static}
}
