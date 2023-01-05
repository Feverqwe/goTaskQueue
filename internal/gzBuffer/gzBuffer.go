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
	tmu        sync.Mutex
	zChunks    [][]byte
	ch         chan int
	finished   bool
	maxBufSize int
}

func (s *GzBuffer) Append(data []byte) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.buf = append(s.buf, data...)
	if len(s.ch) == 0 {
		s.ch <- 1
	}
}

func (s *GzBuffer) Read(offset int) []byte {
	// fmt.Println("read", offset, s.offset)
	buf := s.buf
	off := s.offset
	i := len(s.zChunks) - 1
	zcR := bytes.NewReader(nil)
	for off > offset && i >= 0 {
		idx := i
		i -= 1
		zc := s.zChunks[idx]
		zcR.Reset(zc)
		// fmt.Println("read chunk idx", idx, ch.Len())
		zr := flate.NewReader(zcR)
		// fmt.Println("readLastBytes", idx, off-offset)
		chunk, err := readLastBytes(zr, off-offset)
		if err != nil {
			fmt.Println("readLastBytes error", idx, err)
			break
		}
		// fmt.Println("Prepand chunk", len(chunk))
		buf = append(chunk, buf...)
		off -= len(chunk)
	}
	return buf[offset-off:]
}

func (s *GzBuffer) PipeTo(w io.Writer) error {
	zcR := bytes.NewReader(nil)
	for _, zc := range s.zChunks {
		zcR.Reset(zc)
		zr := flate.NewReader(zcR)
		_, err := io.Copy(w, zr)
		if err != nil {
			return err
		}
	}
	if _, err := w.Write(s.buf); err != nil {
		return err
	}
	return nil
}

func (s *GzBuffer) Trim(offset int) {
	s.tmu.Lock()
	s.mu.Lock()
	defer s.mu.Unlock()
	defer s.tmu.Unlock()
	s.buf = s.Read(offset)
	s.offset = 0
	s.zChunks = make([][]byte, 0)
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
	s.tmu.Lock()
	defer s.tmu.Unlock()
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
	gzb := GzBuffer{
		ch:         make(chan int, 1),
		maxBufSize: maxBufSize,
	}

	go func() {
		for !gzb.finished {
			<-gzb.ch
			err := gzb.compress()
			if err != nil {
				fmt.Println("Compress error", err)
			}
		}
	}()

	return &gzb
}
