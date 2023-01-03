package gzbuffer

import (
	"bytes"
	"compress/gzip"
	"fmt"
	"io"
	"sync"
)

const ChunkSize = 4 * 1024 * 1024
const UncompressSize = 1 * 1024 * 1024

type GzBuffer struct {
	buf      []byte
	offset   int
	mu       sync.Mutex
	tmu      sync.Mutex
	gzChunks []bytes.Buffer
	ch       chan int
	finished bool
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
	i := len(s.gzChunks) - 1
	for off > offset && i >= 0 {
		idx := i
		i -= 1
		ch := s.gzChunks[idx]
		// fmt.Println("read chunk idx", idx, ch.Len())
		r, err := gzip.NewReader(&ch)
		if err != nil {
			fmt.Println("gzip.NewReader error", idx, err)
			break
		}
		chunkSize := off - offset
		// fmt.Printf("Need read from %d last %d bytes\n", idx, off-offset)
		var chunk []byte
		data := make([]byte, 16*1024)
		for {
			var bytes int
			bytes, err = r.Read(data)
			if bytes > 0 {
				chunk = append(chunk, data[0:bytes]...)
				// fmt.Println("chunk", len(chunk))
				if len(chunk) > chunkSize {
					// fmt.Println("Trim chunk", idx, len(chunk), len(chunk)-chunkSize)
					chunk = chunk[len(chunk)-chunkSize:]
				}
			}
			if err != nil {
				if err == io.EOF {
					err = nil
				}
				break
			}
		}
		if err != nil {
			fmt.Println("r.Read chunk error", idx, err)
			break
		}
		buf = append(chunk, buf...)
		off -= len(chunk)
	}
	return buf[offset-off:]
}

func (s *GzBuffer) PipeTo(w io.Writer) error {
	for _, chunk := range s.gzChunks {
		r, err := gzip.NewReader(&chunk)
		if err != nil {
			return err
		}
		_, err = io.Copy(w, r)
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
	s.gzChunks = make([]bytes.Buffer, 0)
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
	for {
		size := s.getCompressSize()
		if size == 0 {
			break
		}
		chunk, err := compress(s.buf[0:size])
		if err != nil {
			return err
		}
		s.mu.Lock()
		s.gzChunks = append(s.gzChunks, chunk)
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
	} else if len(s.buf) > ChunkSize+UncompressSize {
		size = ChunkSize
	}
	if size > ChunkSize {
		size = ChunkSize
	}
	return size
}

func compress(chunk []byte) (bytes.Buffer, error) {
	// fmt.Println("compress")
	var b bytes.Buffer
	gz := gzip.NewWriter(&b)
	if _, err := gz.Write(chunk); err != nil {
		return b, err
	}
	if err := gz.Close(); err != nil {
		return b, err
	}
	return b, nil
}

func NewGzBuffer() *GzBuffer {
	gzb := GzBuffer{
		ch: make(chan int, 1),
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
