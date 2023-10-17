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
}

func (s *LogReader) Read(p []byte) (n int, err error) {
	// log.Println("Read")
	if s.cFile == nil {
		chunks := s.store.GetChunks()

		if s.chunkIndex >= len(chunks) {
			return n, io.EOF
		}

		chunk := chunks[s.chunkIndex]

		if err = s.openChunk(chunk); err != nil {
			return
		}
	}

	if s.cReader == nil {
		n, err = s.cFile.Read(p)
	} else {
		n, err = s.cReader.Read(p)
	}
	s.offset += int64(n)
	if err == io.EOF {
		s.chunkIndex++
		err = s.closeChunk()
	}
	return
}

func (s *LogReader) Seek(delta int64, whence int) (ret int64, err error) {
	// log.Println("Seek", delta, whence)
	if err = s.closeChunk(); err != nil {
		return
	}

	chunks := s.store.GetChunks()

	size := getChunksSize(chunks, s.store.ChunkSize)

	var off int64
	switch whence {
	case 0:
		// 0 means relative to the origin of the file
		off = delta
	case 1:
		// 1 means relative to the current offset
		off = s.offset + delta
	case 2:
		// 2 means relative to the end
		off = size - delta
	}
	if size < off {
		return ret, errors.New("offset_more_than_size")
	}

	cIndex := getChunkIndex(off, s.store.ChunkSize)
	s.chunkIndex = cIndex

	if off == 0 && len(chunks) == 0 {
		s.offset = off
		return
	}

	chunk := chunks[s.chunkIndex]

	if err = s.openChunk(chunk); err != nil {
		return
	}

	cOff := off - int64(cIndex*s.store.ChunkSize)
	if cOff > 0 {
		if s.cReader != nil {
			if _, err = io.ReadFull(s.cReader, make([]byte, cOff)); err != nil {
				return
			}
		} else {
			if _, err = s.cFile.Seek(cOff, 0); err != nil {
				return
			}
		}
	}

	s.offset = off

	return
}

func (s *LogReader) Close() (err error) {
	// log.Println("Close")
	return s.closeChunk()
}

func (s *LogReader) openChunk(chunk *LogChunk) (err error) {
	f, r, err := chunk.OpenForReading()
	s.cFile = f
	s.cReader = r
	return
}

func (s *LogReader) closeChunk() (err error) {
	if s.cReader != nil {
		if err = s.cReader.Close(); err != nil {
			return
		}
	}
	s.cReader = nil
	if s.cFile != nil {
		if err = s.cFile.Close(); err != nil {
			return
		}
	}
	s.cFile = nil
	return
}

func NewLogReader(store *LogStore) *LogReader {
	return &LogReader{
		store: store,
	}
}
