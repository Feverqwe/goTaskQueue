package gzbuffer

import (
	"bytes"
	"compress/flate"
	"fmt"
	"goTaskQueue/internal/shared"
	"io"
	"log"
	"sync"
)

const ChunkSize = 256 * 1024

type CChunk struct {
	data []byte
	size int
}

type GzBuffer struct {
	buf        []byte
	mu         sync.RWMutex
	cmu        sync.Mutex
	chunks     []CChunk
	chunksSize int64
	finished   bool
}

func (s *GzBuffer) GetDataStore() *shared.DataStore {
	return &shared.DataStore{
		Write:  s.Write,
		ReadAt: s.ReadAt,
		PipeTo: s.PipeTo,
		Slice: func(i int64, b bool) (*shared.DataStore, error) {
			ds, err := s.Slice(i, b)
			if err != nil {
				return nil, err
			}
			return ds.GetDataStore(), nil
		},
		Len:   s.Len,
		Close: s.Close,
	}
}

func (s *GzBuffer) Write(data []byte) (n int, err error) {
	s.mu.Lock()
	if s.finished {
		s.mu.Unlock()
		return 0, io.ErrClosedPipe
	}
	n = len(data)
	s.buf = append(s.buf, data...)
	s.mu.Unlock()
	s.runCompress()
	return
}

func (s *GzBuffer) ReadAt(offset int64) ([]byte, error) {
	// log.Println("read", offset, s.offset)
	s.mu.RLock()
	size := s.len()
	buf := s.buf
	chunks := s.chunks
	chunksSize := s.chunksSize
	s.mu.RUnlock()

	if offset < 0 || offset > size {
		return nil, fmt.Errorf("read offset %d outside buffer size %d", offset, size)
	}

	bufferOffset := 0
	chunksOffset := int64(0)
	if offset > chunksSize {
		bufferOffset = int(offset - chunksSize)
		chunksOffset = chunksSize
	} else {
		chunksOffset = offset
	}

	var b []byte

	if chunksOffset < chunksSize {
		chR := NewChunkReader(&chunks, &chunksSize, getChunkExtractor(), nil)
		defer chR.Close()
		if _, err := chR.Seek(chunksOffset, io.SeekStart); err != nil {
			return nil, err
		}
		var err error
		b, err = io.ReadAll(chR)
		if err != nil {
			return nil, err
		}
	}

	b = append(b, buf[bufferOffset:]...)

	return b, nil
}

// PipeTo writes a consistent snapshot of the buffer to w.
func (s *GzBuffer) PipeTo(w io.Writer) error {
	s.mu.RLock()
	chunks := s.chunks
	chunksSize := s.chunksSize
	buf := s.buf
	s.mu.RUnlock()

	extractor := getChunkExtractor()
	chR := NewChunkReader(&chunks, &chunksSize, extractor, nil)
	defer chR.Close()
	if _, err := io.Copy(w, chR); err != nil {
		return err
	}

	r := bytes.NewReader(buf)
	if _, err := io.Copy(w, r); err != nil {
		return err
	}
	return nil
}

// Slice returns a new buffer containing the rightmost rightSize bytes. When
// approx is true, the result may include extra bytes from the first kept chunk.
func (s *GzBuffer) Slice(rightSize int64, approx bool) (*GzBuffer, error) {
	s.mu.RLock()
	size := s.len()
	buf := s.buf
	chunks := s.chunks
	s.mu.RUnlock()
	if rightSize < 0 || rightSize > size {
		return nil, fmt.Errorf("slice size %d outside buffer size %d", rightSize, size)
	}

	newChunks := make([]CChunk, 0, len(chunks))
	newChunksSize := int64(0)

	if rightSize < int64(len(buf)) {
		buf = buf[int64(len(buf))-rightSize:]
	}
	buf = append([]byte(nil), buf...)

	i := len(chunks) - 1
	readSize := rightSize - int64(len(buf))
	for readSize > 0 && i >= 0 {
		cChunk := chunks[i]
		i--
		cc := cChunk.data
		ccSize := cChunk.size

		if !approx && readSize < int64(ccSize) {
			ccSize = int(readSize)
			var err error
			cc, err = truncateChunkR(cc, ccSize)
			if err != nil {
				return nil, err
			}
		}

		newCChunk := CChunk{cc, ccSize}

		newChunks = append(newChunks, newCChunk)
		newChunksSize += int64(ccSize)
		readSize -= int64(ccSize)
	}
	if readSize > 0 {
		return nil, fmt.Errorf("slice size %d not covered by buffer data", rightSize)
	}
	for left, right := 0, len(newChunks)-1; left < right; left, right = left+1, right-1 {
		newChunks[left], newChunks[right] = newChunks[right], newChunks[left]
	}

	cbuf := NewGzBuffer()
	cbuf.buf = buf
	cbuf.chunks = newChunks
	cbuf.chunksSize = newChunksSize

	return cbuf, nil
}

func (s *GzBuffer) Len() int64 {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.len()
}

func (s *GzBuffer) len() int64 {
	return s.chunksSize + int64(len(s.buf))
}

// Close synchronously compresses the remaining data and rejects future writes.
func (s *GzBuffer) Close() error {
	s.mu.Lock()
	s.finished = true
	s.mu.Unlock()

	s.cmu.Lock()
	defer s.cmu.Unlock()
	return s.compress()
}

func (s *GzBuffer) runCompress() {
	if s.GetCompressSize() == 0 {
		return
	}
	if ok := s.cmu.TryLock(); !ok {
		return
	}
	go func() {
		for {
			err := s.compress()
			s.cmu.Unlock()
			if err != nil {
				log.Println("Compress error", err)
				return
			}
			if s.GetCompressSize() == 0 || !s.cmu.TryLock() {
				return
			}
		}
	}()
}

func (s *GzBuffer) compress() error {
	var cw *flate.Writer
	for {
		size := s.GetCompressSize()
		if size == 0 {
			break
		}
		if cw == nil {
			var err error
			cw, err = flate.NewWriter(nil, flate.BestCompression)
			if err != nil {
				return err
			}
		}

		s.mu.RLock()
		buf := s.buf[0:size]
		s.mu.RUnlock()

		cc, err := compress(cw, buf)
		if err != nil {
			return err
		}

		chunk := CChunk{cc, size}

		s.mu.Lock()
		s.buf = s.buf[size:]
		s.chunks = append(s.chunks, chunk)
		s.chunksSize += int64(size)
		s.mu.Unlock()
	}
	return nil
}

func (s *GzBuffer) GetCompressSize() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.getCompressSize()
}

func (s *GzBuffer) getCompressSize() int {
	size := 0
	if s.finished {
		size = len(s.buf)
	} else if len(s.buf) > ChunkSize {
		size = ChunkSize
	}
	if size > ChunkSize {
		size = ChunkSize
	}
	return size
}

func compress(cw *flate.Writer, chunk []byte) ([]byte, error) {
	// log.Println("compress")
	var b bytes.Buffer
	cw.Reset(&b)
	if _, err := cw.Write(chunk); err != nil {
		return nil, err
	}
	if err := cw.Close(); err != nil {
		return nil, err
	}
	return b.Bytes(), nil
}

func truncateChunkR(cc []byte, size int) ([]byte, error) {
	cr, err := getChunkExtractor()(cc)
	if err != nil {
		return nil, err
	}
	defer cr.Close()
	cw, err := flate.NewWriter(nil, flate.BestCompression)
	if err != nil {
		return nil, err
	}
	data, err := readLastBytes(cr, size)
	if err != nil {
		return nil, err
	}
	cc, err = compress(cw, data)
	if err != nil {
		return nil, err
	}
	return cc, nil
}

func readLastBytes(r io.Reader, maxLen int) ([]byte, error) {
	var err error
	var fragLen int
	frag := make([]byte, 0, 512)
	for {
		if len(frag) == cap(frag) {
			// Add more capacity (let append pick how much).
			frag = append(frag, 0)[:len(frag)]
		}
		fragLen, err = r.Read(frag[len(frag):cap(frag)])
		newSize := len(frag) + fragLen
		start := 0
		if newSize > maxLen {
			start = newSize - maxLen
		}
		frag = frag[start:newSize]
		if err != nil {
			if err == io.EOF {
				err = nil
			}
			return frag, err
		}
	}
}

func getChunkExtractor() func(cc []byte) (io.ReadCloser, error) {
	var r *bytes.Reader
	var cr io.ReadCloser
	return func(cc []byte) (io.ReadCloser, error) {
		if r == nil {
			r = bytes.NewReader(nil)
		}
		r.Reset(cc)
		if cr == nil {
			cr = flate.NewReader(nil)
		}
		err := cr.(flate.Resetter).Reset(r, nil)
		return cr, err
	}
}

func NewGzBuffer() *GzBuffer {
	cbuf := &GzBuffer{}
	return cbuf
}
