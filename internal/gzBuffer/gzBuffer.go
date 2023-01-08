package gzbuffer

import (
	"bytes"
	"compress/flate"
	"fmt"
	"io"
	"sync"
)

const ChunkSize = 256 * 1024

type GzBuffer struct {
	buf        []byte
	offset     int
	mu         sync.Mutex
	zChunks    [][]byte
	ch         chan int
	finished   bool
	maxBufSize int
}

func (s *GzBuffer) Write(data []byte) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.buf = append(s.buf, data...)
	if len(s.ch) == 0 {
		s.ch <- 1
	}
}

func (s *GzBuffer) Read(offset int) ([]byte, error) {
	// fmt.Println("read", offset, s.offset)
	buf := s.buf
	off := s.offset
	zChunks := s.zChunks
	i := len(zChunks) - 1
	var zcR *bytes.Reader
	for off > offset && i >= 0 {
		idx := i
		i -= 1
		zc := zChunks[idx]
		if zcR == nil {
			zcR = bytes.NewReader(nil)
		}
		zcR.Reset(zc)
		// fmt.Println("read chunk idx", idx, ch.Len())
		zr := flate.NewReader(zcR)
		// fmt.Println("readLastBytes", idx, off-offset)
		chunk, err := readLastBytes(zr, off-offset)
		if err != nil {
			return nil, err
		}
		// fmt.Println("Prepand chunk", len(chunk))
		buf = append(chunk, buf...)
		off -= len(chunk)
	}
	return buf[offset-off:], nil
}

func (s *GzBuffer) PipeTo(w io.Writer) error {
	buf := s.buf
	zChunks := s.zChunks
	r := bytes.NewReader(nil)
	for _, zc := range zChunks {
		r.Reset(zc)
		zr := flate.NewReader(r)
		if _, err := io.Copy(w, zr); err != nil {
			return err
		}
	}
	r.Reset(buf)
	if _, err := io.Copy(w, r); err != nil {
		return err
	}
	return nil
}

func (s *GzBuffer) Slice(offset int) (*GzBuffer, error) {
	var zbuf *GzBuffer
	buf, err := s.Read(offset)
	if err == nil {
		zbuf := NewGzBuffer(s.maxBufSize)
		zbuf.Write(buf)
	}
	return zbuf, err
}

func (s *GzBuffer) Len() int {
	return s.offset + len(s.buf)
}

func (s *GzBuffer) Finish() {
	// fmt.Println("finish")
	s.finished = true
	if len(s.ch) == 0 {
		s.ch <- 1
	}
}

func (s *GzBuffer) compress() error {
	var zw *flate.Writer
	for {
		size := s.getCompressSize()
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
		zc, err := compress(zw, s.buf[0:size])
		if err != nil {
			return err
		}
		s.mu.Lock()
		s.zChunks = append(s.zChunks, zc)
		s.buf = s.buf[size:]
		s.offset += size
		s.mu.Unlock()
	}
	return nil
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

func readLastBytes(r io.ReadCloser, maxLen int) ([]byte, error) {
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

func NewGzBuffer(maxBufSize int) *GzBuffer {
	zbuf := &GzBuffer{
		ch:         make(chan int, 1),
		maxBufSize: maxBufSize,
	}

	go func() {
		for zbuf != nil {
			<-zbuf.ch
			err := zbuf.compress()
			if err != nil {
				fmt.Println("Compress error", err)
			}
		}
	}()

	return zbuf
}
