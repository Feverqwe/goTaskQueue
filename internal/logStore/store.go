package logstore

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"goTaskQueue/internal/shared"
	"io"
	"log"
	"os"
	"path"
	"strconv"
	"strings"
	"sync"

	"github.com/natefinch/atomic"
)

type LogStore struct {
	Name      string      `json:"name"`
	ChunkSize int         `json:"chunkSize"`
	Chunks    []*LogChunk `json:"chunks"`

	chunkIndex int
	place      string
	cm         sync.Mutex
	chunksM    sync.RWMutex
	filesM     sync.RWMutex
	saveM      sync.Mutex
}

func (s *LogStore) Len() int64 {
	s.chunksM.RLock()
	defer s.chunksM.RUnlock()
	return getChunksSize(s.Chunks)
}

// GetChunks returns an immutable snapshot of the chunk metadata.
func (s *LogStore) GetChunks() []*LogChunk {
	s.chunksM.RLock()
	defer s.chunksM.RUnlock()

	chunks := make([]*LogChunk, 0, len(s.Chunks))
	for _, chunk := range s.Chunks {
		chunks = append(chunks, chunk.Clone(s))
	}
	return chunks
}

func (s *LogStore) AppendChunk(chunk *LogChunk) error {
	s.chunksM.Lock()
	s.Chunks = append(s.Chunks, chunk)
	s.chunksM.Unlock()

	return s.EmitChange()
}

func (s *LogStore) GetChunkName() string {
	s.chunksM.Lock()
	defer s.chunksM.Unlock()

	used := make(map[string]struct{}, len(s.Chunks))
	for _, chunk := range s.Chunks {
		used[strings.TrimSuffix(chunk.Name, ".gz")] = struct{}{}
	}

	for {
		s.chunkIndex++
		name := s.Name + "-chunk-" + strconv.Itoa(s.chunkIndex)
		if _, ok := used[name]; ok {
			continue
		}
		if _, err := os.Stat(path.Join(s.place, name)); err == nil || !os.IsNotExist(err) {
			continue
		}
		if _, err := os.Stat(path.Join(s.place, name+".gz")); err == nil || !os.IsNotExist(err) {
			continue
		}
		return name
	}
}

func (s *LogStore) EmitChange() error {
	if err := s.Save(); err != nil {
		return err
	}
	s.TryCompress()
	return nil
}

func (s *LogStore) Save() error {
	s.saveM.Lock()
	defer s.saveM.Unlock()

	s.chunksM.RLock()
	snapshot := s.cloneLocked(s.Chunks)
	s.chunksM.RUnlock()

	data, err := json.Marshal(snapshot)
	if err != nil {
		return err
	}

	filename := path.Join(s.place, s.Name+"-index")
	return atomic.WriteFile(filename, bytes.NewReader(data))
}

func (s *LogStore) TryCompress() {
	if ok := s.cm.TryLock(); !ok {
		return
	}

	go func() {
		defer s.cm.Unlock()

		for {
			compressed, err := s.compressOne(false)
			if err != nil {
				log.Println("Compress chunk error", err)
				return
			}
			if !compressed {
				return
			}
		}
	}()
}

// compressOne commits the new index before removing the raw chunk. A crash can
// therefore leave an orphan file, but never an index that points to a removed
// chunk.
func (s *LogStore) compressOne(isClose bool) (bool, error) {
	var index int
	var original *LogChunk
	var candidate *LogChunk

	s.chunksM.RLock()
	limit := len(s.Chunks)
	if !isClose {
		limit--
	}
	for idx := 0; idx < limit; idx++ {
		chunk := s.Chunks[idx]
		if chunk.CanCompress() {
			index = idx
			original = chunk
			candidate = chunk.Clone(s)
			break
		}
	}
	s.chunksM.RUnlock()

	if candidate == nil {
		return false, nil
	}

	compressed, err := candidate.Compress()
	if err != nil {
		return false, err
	}

	s.filesM.Lock()
	defer s.filesM.Unlock()

	s.chunksM.Lock()
	if index >= len(s.Chunks) || s.Chunks[index] != original || !original.CanCompress() {
		s.chunksM.Unlock()
		_ = compressed.Remove()
		return false, nil
	}
	s.Chunks[index] = compressed
	s.chunksM.Unlock()

	if err := s.Save(); err != nil {
		s.chunksM.Lock()
		if index < len(s.Chunks) && s.Chunks[index] == compressed {
			s.Chunks[index] = original
		}
		s.chunksM.Unlock()
		_ = compressed.Remove()
		return false, err
	}

	if err := original.Remove(); err != nil && !os.IsNotExist(err) {
		log.Println("Remove raw chunk error", err)
	}
	return true, nil
}

func (s *LogStore) GetDataStore() *shared.DataStore {
	w := NewLogWriter(s)

	return &shared.DataStore{
		Write: w.Write,
		ReadAt: func(i int64) (b []byte, err error) {
			r := NewLogReader(s)
			defer r.Close()

			if _, err = r.Seek(i, io.SeekStart); err != nil {
				return nil, err
			}
			return io.ReadAll(r)
		},
		PipeTo: func(w io.Writer) (err error) {
			r := NewLogReader(s)
			defer r.Close()

			_, err = io.Copy(w, r)
			return err
		},
		Slice: func(i int64, approx bool) (*shared.DataStore, error) {
			if err := w.Close(); err != nil {
				return nil, err
			}

			ls, err := s.Slice(i, approx)
			if err != nil {
				return nil, err
			}
			return ls.GetDataStore(), nil
		},
		Len: s.Len,
		Close: func() error {
			return errors.Join(w.Close(), s.Close())
		},
	}
}

func (s *LogStore) Slice(rightOffset int64, approx bool) (ls *LogStore, err error) {
	if !approx {
		return nil, errors.New("not_approximate_unsupported")
	}

	s.cm.Lock()
	defer s.cm.Unlock()
	s.filesM.Lock()
	defer s.filesM.Unlock()

	size := s.Len()
	if rightOffset < 0 || rightOffset > size {
		return nil, fmt.Errorf("slice offset %d outside log size %d", rightOffset, size)
	}

	offset := size - rightOffset
	chunks := s.GetChunks()
	index, _ := getChunkOffset(chunks, offset)
	if index < 0 || index > len(chunks) {
		return nil, fmt.Errorf("invalid slice chunk index %d", index)
	}

	ls = s.Clone(chunks[index:])
	if err := ls.Save(); err != nil {
		return nil, err
	}

	for _, chunk := range chunks[:index] {
		if err := chunk.Remove(); err != nil && !os.IsNotExist(err) {
			log.Println("Remove sliced chunk error", err)
		}
	}
	return ls, nil
}

func (s *LogStore) Clone(chunks []*LogChunk) *LogStore {
	s.chunksM.RLock()
	chunkIndex := s.chunkIndex
	s.chunksM.RUnlock()

	ls := &LogStore{
		Name:       s.Name,
		ChunkSize:  s.ChunkSize,
		place:      s.place,
		chunkIndex: chunkIndex,
	}
	for _, chunk := range chunks {
		ls.Chunks = append(ls.Chunks, chunk.Clone(ls))
	}
	return ls
}

func (s *LogStore) cloneLocked(chunks []*LogChunk) *LogStore {
	ls := &LogStore{
		Name:       s.Name,
		ChunkSize:  s.ChunkSize,
		place:      s.place,
		chunkIndex: s.chunkIndex,
	}
	for _, chunk := range chunks {
		ls.Chunks = append(ls.Chunks, chunk.Clone(ls))
	}
	return ls
}

func (s *LogStore) Close() error {
	s.cm.Lock()
	defer s.cm.Unlock()

	if err := s.Save(); err != nil {
		return err
	}
	for {
		compressed, err := s.compressOne(true)
		if err != nil {
			return err
		}
		if !compressed {
			return nil
		}
	}
}

func (s *LogStore) getAppendableChunk() *LogChunk {
	s.chunksM.RLock()
	defer s.chunksM.RUnlock()
	if len(s.Chunks) == 0 {
		return nil
	}
	chunk := s.Chunks[len(s.Chunks)-1]
	if chunk.Compressed || getAvailableSize(chunk, s.ChunkSize) <= 0 {
		return nil
	}
	return chunk
}

func (s *LogStore) getChunkAvailableSize(chunk *LogChunk) int {
	s.chunksM.RLock()
	defer s.chunksM.RUnlock()
	return getAvailableSize(chunk, s.ChunkSize)
}

func (s *LogStore) addChunkLen(chunk *LogChunk, n int) {
	s.chunksM.Lock()
	chunk.Len += n
	s.chunksM.Unlock()
}

func (s *LogStore) setChunkClosed(chunk *LogChunk, closed bool) {
	s.chunksM.Lock()
	chunk.Closed = closed
	s.chunksM.Unlock()
}

func (s *LogStore) rollbackAppendedChunk(chunk *LogChunk) {
	s.chunksM.Lock()
	defer s.chunksM.Unlock()
	last := len(s.Chunks) - 1
	if last >= 0 && s.Chunks[last] == chunk && chunk.Len == 0 {
		s.Chunks = s.Chunks[:last]
	}
}

func OpenLogStore(filename string) (*LogStore, error) {
	data, err := os.ReadFile(filename + "-index")
	if err != nil {
		return nil, err
	}

	store := &LogStore{}
	if err := json.Unmarshal(data, store); err != nil {
		return nil, err
	}
	store.place = path.Dir(filename)
	if store.Name == "" || path.Base(store.Name) != store.Name {
		return nil, fmt.Errorf("invalid store name %q", store.Name)
	}
	if store.ChunkSize == 0 {
		store.ChunkSize = ChunkSize
	}
	if store.ChunkSize < 0 {
		return nil, errors.New("invalid negative chunk size")
	}

	seen := make(map[string]struct{}, len(store.Chunks))
	seenBase := make(map[string]struct{}, len(store.Chunks))
	for _, chunk := range store.Chunks {
		if chunk == nil {
			return nil, errors.New("nil chunk in log index")
		}
		if chunk.Name == "" || path.Base(chunk.Name) != chunk.Name {
			return nil, fmt.Errorf("invalid chunk name %q", chunk.Name)
		}
		if _, ok := seen[chunk.Name]; ok {
			return nil, fmt.Errorf("duplicate chunk name %q", chunk.Name)
		}
		seen[chunk.Name] = struct{}{}
		base := strings.TrimSuffix(chunk.Name, ".gz")
		if _, ok := seenBase[base]; ok {
			return nil, fmt.Errorf("duplicate logical chunk name %q", base)
		}
		seenBase[base] = struct{}{}
		if chunk.Len < 0 {
			return nil, fmt.Errorf("negative chunk length for %q", chunk.Name)
		}

		chunk.store = store
		if chunk.Compressed {
			if _, err := os.Stat(path.Join(store.place, chunk.Name)); err != nil {
				return nil, fmt.Errorf("stat compressed chunk %q: %w", chunk.Name, err)
			}
		} else if err := chunk.SyncLen(); err != nil {
			return nil, fmt.Errorf("sync chunk %q length: %w", chunk.Name, err)
		}

		prefix := store.Name + "-chunk-"
		if strings.HasPrefix(base, prefix) {
			index, err := strconv.Atoi(strings.TrimPrefix(base, prefix))
			if err == nil && index > store.chunkIndex {
				store.chunkIndex = index
			}
		}
	}
	return store, nil
}

func NewLogStore(filename string) *LogStore {
	return &LogStore{
		Name:      path.Base(filename),
		ChunkSize: ChunkSize,
		place:     path.Dir(filename),
	}
}
