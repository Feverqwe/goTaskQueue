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
	ChunkSize    int         `json:"chunkSize"`
	Chunks       []*LogChunk `json:"chunks"`
	chunkIndex   int
	place        string
	lastChangeAt time.Time
	lastSaveAt   time.Time
	cm           sync.Mutex
	cwg          sync.WaitGroup
	chunksM      sync.RWMutex
	qBuf         []byte
	maxBufSize   int
}

func (s *LogStore) Len() int64 {
	return getChunksSize(s.GetChunks(), s.ChunkSize)
}

func (s *LogStore) GetChunks() []*LogChunk {
	s.chunksM.RLock()
	defer s.chunksM.RUnlock()
	return s.Chunks
}

func (s *LogStore) AppendChunk(chunk *LogChunk) {
	s.chunksM.Lock()
	s.Chunks = append(s.Chunks, chunk)
	s.chunksM.Unlock()

	s.EmitChange()
}

func (s *LogStore) GetChunkName() string {
	s.chunkIndex++
	return s.Name + "-chunk-" + strconv.Itoa(s.chunkIndex)
}

func (s *LogStore) EmitChange() {
	s.lastChangeAt = time.Now()

	s.Save()

	s.TryCompress()
}

func (s *LogStore) Save() (err error) {
	if s.lastSaveAt.After(s.lastChangeAt) {
		return
	}

	t := time.Now()

	chunks := s.GetChunks()

	data, err := json.Marshal(s.Clone(chunks))
	if err != nil {
		return
	}

	filename := path.Join(s.place, s.Name+"-index")
	if err = atomic.WriteFile(filename, bytes.NewReader(data)); err != nil {
		return
	}

	s.lastSaveAt = t
	return
}

func (s *LogStore) TryCompress() {
	if ok := s.cm.TryLock(); !ok {
		return
	}

	s.cwg.Add(1)
	go func() {
		defer s.cm.Unlock()
		defer s.cwg.Done()

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
	chunks := s.GetChunks()
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

		s.chunksM.Lock()
		s.Chunks[idx] = cChunk
		s.chunksM.Unlock()

		c = true

		go func(chunk *LogChunk) {
			if err := chunk.Remove(); err != nil {
				log.Println("Remove raw chunk error", err)
			}
		}(chunk)
	}
	return
}

func (s *LogStore) GetDataStore() *shared.DataStore {
	w := NewLogWriter(s)

	return &shared.DataStore{
		Write: func(b []byte) (n int, err error) {
			n, err = w.Write(b)

			s.qBuf = append(s.qBuf, b...)
			if len(s.qBuf) > s.maxBufSize {
				off := len(s.qBuf) - s.maxBufSize
				s.qBuf = s.qBuf[off:]
			}

			return
		},
		ReadAt: func(i int64) (b []byte, err error) {
			// log.Println("ReadAt", i)
			size := s.Len()
			readSize := int(size - i)
			if len(s.qBuf) >= readSize {
				off := len(s.qBuf) - readSize
				return s.qBuf[off:], nil
			}

			r := NewLogReader(s)
			defer r.Close()

			if _, err = r.Seek(i, 0); err != nil {
				return
			}

			return io.ReadAll(r)
		},
		PipeTo: func(w io.Writer) (err error) {
			r := NewLogReader(s)
			defer r.Close()

			_, err = io.Copy(w, r)
			return
		},
		Slice: func(i int64, b bool) (ds *shared.DataStore, err error) {
			if err = w.Close(); err != nil {
				return
			}
			s.cwg.Wait()

			ls, err := s.Slice(i, b)
			if err != nil {
				return
			}

			ds = ls.GetDataStore()
			return
		},
		Len: s.Len,
		Close: func() (err error) {
			s.qBuf = make([]byte, 0)

			if err = w.Close(); err != nil {
				return
			}
			return s.Close()
		},
	}
}

func (s *LogStore) Slice(rightOffset int64, approx bool) (ls *LogStore, err error) {
	if !approx {
		return nil, errors.New("not_approximate_unsupported")
	}

	offset := s.Len() - rightOffset
	index := getChunkIndex(offset, s.ChunkSize)

	chunks := s.GetChunks()

	ls = s.Clone(chunks[index:])
	rmChunks := chunks[0:index]

	go func() {
		for _, ch := range rmChunks {
			if err := ch.Remove(); err != nil {
				log.Println("Remove sliced chunk error", err)
			}
		}
	}()

	return
}

func (s *LogStore) Clone(chunks []*LogChunk) (ls *LogStore) {
	ls = &LogStore{
		Name:       s.Name,
		ChunkSize:  s.ChunkSize,
		place:      s.place,
		chunkIndex: s.chunkIndex,
		maxBufSize: s.maxBufSize,
	}

	for _, chunk := range chunks {
		chunkCopy := chunk.Clone(ls)
		ls.Chunks = append(ls.Chunks, chunkCopy)
	}
	return
}

func (s *LogStore) Close() (err error) {
	s.cwg.Wait()
	if s.compress(true) {
		s.lastChangeAt = time.Now()
	}

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
	if store.ChunkSize == 0 {
		store.ChunkSize = ChunkSize
	}
	for _, chunk := range store.Chunks {
		chunk.store = &store
		if err := chunk.SyncLen(); err != nil {
			log.Println("Sync chunk len error", err)
		}
	}

	ls = &store
	return
}

func NewLogStore(filename string, bufferSize int) *LogStore {
	name := path.Base(filename)
	place := path.Dir(filename)
	return &LogStore{
		Name:       name,
		ChunkSize:  ChunkSize,
		place:      place,
		maxBufSize: bufferSize,
	}
}
