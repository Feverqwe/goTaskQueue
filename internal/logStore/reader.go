package logstore

import (
	"errors"
	"io"
	"os"
)

type LogReader struct {
	io.ReadSeekCloser
	store      *LogStore
	chunkIndex int
	offset     int64
	cFile      *os.File
	cReader    io.ReadCloser
	fileLocked bool
}

func (s *LogReader) Read(p []byte) (n int, err error) {
	for {
		if s.cFile == nil {
			if err = s.openChunk(s.chunkIndex); err != nil {
				return 0, err
			}
		}

		if s.cReader == nil {
			n, err = s.cFile.Read(p)
		} else {
			n, err = s.cReader.Read(p)
		}
		s.offset += int64(n)
		if err != io.EOF {
			return n, err
		}

		s.chunkIndex++
		closeErr := s.closeChunk()
		if closeErr != nil {
			return n, closeErr
		}
		if n > 0 {
			return n, nil
		}
	}
}

func (s *LogReader) Seek(delta int64, whence int) (int64, error) {
	chunks := s.store.GetChunks()
	size := getChunksSize(chunks)

	var off int64
	switch whence {
	case io.SeekStart:
		off = delta
	case io.SeekCurrent:
		off = s.offset + delta
	case io.SeekEnd:
		off = size + delta
	default:
		return s.offset, errors.New("invalid_whence")
	}
	if off < 0 {
		return s.offset, errors.New("negative_offset")
	}
	if off > size {
		return s.offset, errors.New("offset_more_than_size")
	}

	if err := s.closeChunk(); err != nil {
		return s.offset, err
	}
	s.offset = off

	if off == size {
		s.chunkIndex = len(chunks)
		return off, nil
	}

	s.chunkIndex, _ = getChunkOffset(chunks, off)
	if err := s.openChunk(s.chunkIndex); err != nil {
		return s.offset, err
	}

	_, cOff := getChunkOffset(chunks, off)
	if cOff == 0 {
		return off, nil
	}
	if s.cReader != nil {
		if _, err := io.CopyN(io.Discard, s.cReader, cOff); err != nil {
			_ = s.closeChunk()
			return s.offset, err
		}
	} else if _, err := s.cFile.Seek(cOff, io.SeekStart); err != nil {
		_ = s.closeChunk()
		return s.offset, err
	}
	return off, nil
}

func (s *LogReader) Close() error {
	return s.closeChunk()
}

func (s *LogReader) openChunk(index int) error {
	s.store.filesM.RLock()
	s.fileLocked = true

	chunks := s.store.GetChunks()
	if index < 0 || index >= len(chunks) {
		s.store.filesM.RUnlock()
		s.fileLocked = false
		return io.EOF
	}

	f, r, err := chunks[index].OpenForReading()
	if err != nil {
		s.store.filesM.RUnlock()
		s.fileLocked = false
		return err
	}
	s.cFile = f
	s.cReader = r
	return nil
}

func (s *LogReader) closeChunk() (err error) {
	if s.cReader != nil {
		err = errors.Join(err, s.cReader.Close())
	}
	s.cReader = nil
	if s.cFile != nil {
		err = errors.Join(err, s.cFile.Close())
	}
	s.cFile = nil
	if s.fileLocked {
		s.store.filesM.RUnlock()
		s.fileLocked = false
	}
	return err
}

func NewLogReader(store *LogStore) *LogReader {
	return &LogReader{store: store}
}
