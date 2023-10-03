package gzbuffer

import (
	"bytes"
	"compress/flate"
	"errors"
	"fmt"
	"io"
	"sync"
)

const ChunkSize = 256 * 1024

type GzBuffer struct {
	buf        []byte
	offset     int
	mu         sync.RWMutex
	cmu        sync.Mutex
	zChunks    [][]byte
	zSizes     []int
	finished   bool
	maxBufSize int
}

func (s *GzBuffer) Write(data []byte) {
	s.mu.Lock()
	s.buf = append(s.buf, data...)
	s.mu.Unlock()
	s.runCompress()
}

func (s *GzBuffer) Read(offset int) ([]byte, error) {
	// fmt.Println("read", offset, s.offset)
	s.mu.RLock()
	size := s.len()
	buf := s.buf
	zChunks := s.zChunks
	s.mu.RUnlock()

	newSize := size - offset
	if newSize < 0 {
		fmt.Println("Read offset more than len", offset, size)
		return nil, errors.New("read_icorrect_offset")
	}

	readLen := newSize

	if len(buf) > readLen {
		buf = buf[len(buf)-readLen:]
	}

	readLen -= len(buf)

	if readLen > 0 {
		transformer := getChunkTransformer()
		chR := NewChunkReader(&zChunks, transformer, nil, true)
		cbuf, err := readLastBytes(chR, readLen)
		if err != nil {
			return nil, err
		}

		buf = append(buf, cbuf...)
		readLen -= len(cbuf)
	}

	return buf, nil
}

func (s *GzBuffer) PipeTo(w io.Writer) error {
	transformer := getChunkTransformer()
	chR := NewChunkReader(&s.zChunks, transformer, &s.mu, false)
	if _, err := io.Copy(w, chR); err != nil {
		return err
	}

	s.mu.RLock()
	buf := s.buf
	s.mu.RUnlock()

	r := bytes.NewReader(buf)
	if _, err := io.Copy(w, r); err != nil {
		return err
	}
	return nil
}

func (s *GzBuffer) Slice(offset int, approx bool) (*GzBuffer, error) {
	// fmt.Println("Slice", offset)
	s.mu.RLock()
	newSize := s.len() - offset
	buf := s.buf
	zChunks := s.zChunks
	zSizes := s.zSizes
	s.mu.RUnlock()

	chunks := make([][]byte, 0)
	sizes := make([]int, 0)
	newOffset := 0

	if newSize < len(buf) {
		buf = buf[len(buf)-newSize:]
	}

	i := len(zChunks) - 1
	readSize := newSize - len(buf)
	for readSize > 0 && i >= 0 {
		idx := i
		i -= 1
		zc := zChunks[idx]
		zcSize := zSizes[idx]

		if !approx && readSize < zcSize {
			zcSize = readSize
			var err error
			zc, err = truncateChunkR(zc, zcSize)
			if err != nil {
				return nil, err
			}
		}

		chunks = append([][]byte{zc}, chunks...)
		sizes = append([]int{zcSize}, sizes...)
		newOffset += zcSize
		readSize -= zcSize
	}

	zbuf := NewGzBuffer(s.maxBufSize)
	zbuf.buf = buf
	zbuf.zChunks = chunks
	zbuf.zSizes = sizes
	zbuf.offset = newOffset

	return zbuf, nil
}

func (s *GzBuffer) Len() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.len()
}

func (s *GzBuffer) len() int {
	return s.offset + len(s.buf)
}

func (s *GzBuffer) Finish() {
	// fmt.Println("finish")
	s.finished = true
	s.runCompress()
}

func (s *GzBuffer) runCompress() {
	if s.GetCompressSize() == 0 {
		return
	}
	if ok := s.cmu.TryLock(); !ok {
		return
	}
	go func() {
		defer s.cmu.Unlock()
		if err := s.compress(); err != nil {
			fmt.Println("Compress error", err)
		}
	}()
}

func (s *GzBuffer) compress() error {
	var zw *flate.Writer
	for {
		size := s.GetCompressSize()
		if size == 0 {
			break
		}
		if zw == nil {
			var err error
			zw, err = flate.NewWriter(nil, flate.BestCompression)
			if err != nil {
				return err
			}
		}

		s.mu.RLock()
		buf := s.buf[0:size]
		s.mu.RUnlock()

		zc, err := compress(zw, buf)
		if err != nil {
			return err
		}

		s.mu.Lock()
		s.zChunks = append(s.zChunks, zc)
		s.zSizes = append(s.zSizes, size)
		s.buf = s.buf[size:]
		s.offset += size
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
	} else if len(s.buf) > ChunkSize+s.maxBufSize {
		size = ChunkSize
	}
	if size > ChunkSize {
		size = ChunkSize
	}
	return size
}

func compress(zw *flate.Writer, chunk []byte) ([]byte, error) {
	// fmt.Println("compress")
	var b bytes.Buffer
	zw.Reset(&b)
	if _, err := zw.Write(chunk); err != nil {
		return nil, err
	}
	if err := zw.Close(); err != nil {
		return nil, err
	}
	return b.Bytes(), nil
}

func truncateChunkR(zc []byte, size int) ([]byte, error) {
	zcR := bytes.NewReader(zc)
	zr := flate.NewReader(zcR)
	zw, err := flate.NewWriter(nil, flate.BestCompression)
	if err != nil {
		return nil, err
	}
	chunk, err := readLastBytes(zr, size)
	if err != nil {
		return nil, err
	}
	zc, err = compress(zw, chunk)
	if err != nil {
		return nil, err
	}
	return zc, nil
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

func getChunkTransformer() func(zc []byte) io.ReadCloser {
	var zcR *bytes.Reader
	return func(zc []byte) io.ReadCloser {
		if zcR == nil {
			zcR = bytes.NewReader(nil)
		}
		zcR.Reset(zc)
		return flate.NewReader(zcR)
	}
}

func NewGzBuffer(maxBufSize int) *GzBuffer {
	zbuf := &GzBuffer{
		maxBufSize: maxBufSize,
	}
	return zbuf
}
