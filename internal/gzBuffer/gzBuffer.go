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

type CChunk struct {
	data []byte
	size int
}

type GzBuffer struct {
	buf        []byte
	offset     int
	mu         sync.RWMutex
	cmu        sync.Mutex
	cChunks    []CChunk
	finished   bool
	maxBufSize int
}

func (s *GzBuffer) Write(data []byte) {
	s.mu.Lock()
	s.buf = append(s.buf, data...)
	s.mu.Unlock()
	s.runCompress()
}

func (s *GzBuffer) ReadAt(offset int) ([]byte, error) {
	// fmt.Println("read", offset, s.offset)
	s.mu.RLock()
	size := s.len()
	buf := s.buf
	cChunks := s.cChunks
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
		extractor := getChunkExtractor()
		chR := NewChunkReader(&cChunks, extractor, nil)
		err := chR.Seek(offset)
		if err != nil {
			return nil, err
		}
		chunk, err := io.ReadAll(chR)
		if err != nil {
			return nil, err
		}
		buf = append(chunk, buf...)
		readLen -= len(chunk)
	}

	return buf, nil
}

func (s *GzBuffer) PipeTo(w io.Writer) error {
	extractor := getChunkExtractor()
	chR := NewChunkReader(&s.cChunks, extractor, &s.mu)
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
	cChunks := s.cChunks
	s.mu.RUnlock()

	chunks := make([]CChunk, 0)
	newOffset := 0

	if newSize < len(buf) {
		buf = buf[len(buf)-newSize:]
	}

	i := len(cChunks) - 1
	readSize := newSize - len(buf)
	for readSize > 0 && i >= 0 {
		idx := i
		i -= 1
		cChunk := cChunks[idx]
		cc := cChunk.data
		ccSize := cChunk.size

		if !approx && readSize < ccSize {
			ccSize = readSize
			var err error
			cc, err = truncateChunkR(cc, ccSize)
			if err != nil {
				return nil, err
			}
		}

		newCChunk := CChunk{cc, ccSize}

		chunks = append([]CChunk{newCChunk}, chunks...)
		newOffset += ccSize
		readSize -= ccSize
	}

	cbuf := NewGzBuffer(s.maxBufSize)
	cbuf.buf = buf
	cbuf.cChunks = chunks
	cbuf.offset = newOffset

	return cbuf, nil
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

		cChunk := CChunk{cc, size}

		s.mu.Lock()
		s.cChunks = append(s.cChunks, cChunk)
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

func compress(cw *flate.Writer, chunk []byte) ([]byte, error) {
	// fmt.Println("compress")
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
	cr := getChunkExtractor()(cc)
	cw, err := flate.NewWriter(nil, flate.BestCompression)
	if err != nil {
		return nil, err
	}
	chunk, err := readLastBytes(cr, size)
	if err != nil {
		return nil, err
	}
	cc, err = compress(cw, chunk)
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

func getChunkExtractor() func(cc []byte) io.ReadCloser {
	var ccR *bytes.Reader
	return func(cc []byte) io.ReadCloser {
		if ccR == nil {
			ccR = bytes.NewReader(nil)
		}
		ccR.Reset(cc)
		return flate.NewReader(ccR)
	}
}

func NewGzBuffer(maxBufSize int) *GzBuffer {
	cbuf := &GzBuffer{
		maxBufSize: maxBufSize,
	}
	return cbuf
}
