package logwriter

import (
	"errors"
	"goTaskQueue/internal/shared"
	"io"
	"log"
	"os"
	"sync"
)

type LogWriter struct {
	shared.DataStore
	filename   string
	file       *os.File
	mu         sync.RWMutex
	size       int64
	finished   bool
	qBuf       []byte
	maxBufSize int
}

func (s *LogWriter) GetDataStore() *shared.DataStore {
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

func (s *LogWriter) Write(data []byte) (n int, err error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	n, err = s.file.Write(data)

	s.qBuf = append(s.qBuf, data...)
	if len(s.qBuf) > s.maxBufSize {
		off := len(s.qBuf) - s.maxBufSize
		s.qBuf = s.qBuf[off:]
	}

	s.size += int64(n)

	return
}

func (s *LogWriter) ReadAt(offset int64) ([]byte, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	size := s.size

	if size < offset {
		log.Println("Read offset more than len", offset, size)
		return nil, errors.New("read_icorrect_offset")
	}

	readSize := int(size - offset)
	if len(s.qBuf) >= readSize {
		// log.Println("Read from buffer")
		off := len(s.qBuf) - readSize
		return s.qBuf[off:], nil
	}

	// log.Println("Read from file")

	file, err := os.OpenFile(s.filename, os.O_RDONLY, 0600)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	_, err = file.Seek(offset, 0)
	if err != nil {
		return nil, err
	}
	b, err := io.ReadAll(file)
	if err != nil {
		return nil, err
	}

	return b, nil
}

func (s *LogWriter) PipeTo(w io.Writer) error {
	file, err := os.OpenFile(s.filename, os.O_RDONLY, 0600)
	if err != nil {
		return err
	}
	defer file.Close()

	if _, err := io.Copy(w, file); err != nil {
		return err
	}
	return nil
}

func (s *LogWriter) Slice(rightOffset int64, approx bool) (lw *LogWriter, err error) {
	// log.Println("Slice", rightOffset)

	offset := s.Len() - rightOffset
	buf, err := s.ReadAt(offset)
	if err != nil {
		return
	}

	if err = s.Close(); err != nil {
		return
	}

	if err = os.Remove(s.filename); err != nil {
		return
	}

	lw, err = NewLogWriter(s.maxBufSize, s.filename)
	if err != nil {
		return
	}

	_, err = lw.Write(buf)
	if err != nil {
		return
	}

	return
}

func (s *LogWriter) Len() int64 {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.size
}

func (s *LogWriter) Close() (err error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	err = s.file.Close()

	if err == nil {
		s.qBuf = make([]byte, 0)
	}

	s.finished = true
	return
}

func OpenLogWriter(filename string) (lw *LogWriter, err error) {
	stat, err := os.Stat(filename)
	if err != nil {
		return nil, err
	}

	size := stat.Size()
	lw = &LogWriter{
		filename: filename,
		size:     size,
	}

	return
}

func NewLogWriter(maxBufSize int, filename string) (lw *LogWriter, err error) {
	f, err := os.OpenFile(filename, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0600)

	lw = &LogWriter{
		filename:   filename,
		file:       f,
		maxBufSize: maxBufSize,
	}

	return
}
