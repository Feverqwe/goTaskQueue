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
	if s.cReader == nil {
		chunks := s.store.Chunks

		if s.chunkIndex >= len(chunks) {
			return n, io.EOF
		}

		chunk := chunks[s.chunkIndex]

		err = s.openChunk(chunk)
		if err != nil {
			return
		}
	}

	n, err = s.cReader.Read(p)
	s.offset += int64(n)
	if err == io.EOF {
		s.chunkIndex++
		err = s.closeChunk()
	}
	return
}

func (s *LogReader) Seek(delta int64, whence int) (ret int64, err error) {
	// log.Println("Seek", delta, whence)
	err = s.closeChunk()
	if err != nil {
		return
	}

	chunks := s.store.Chunks

	size := getChunksSize(chunks)

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

	cIndex := getChunkIndex(off)
	s.chunkIndex = cIndex

	if off == 0 && len(chunks) == 0 {
		s.offset = off
		return
	}

	chunk := chunks[s.chunkIndex]

	if err = s.openChunk(chunk); err != nil {
		return
	}

	cOff := off - int64(cIndex*ChunkSize)
	if cOff > 0 {
		if f, ok := s.cReader.(*os.File); ok {
			if _, err = f.Seek(cOff, 0); err != nil {
				return
			}
		} else {
			if _, err = io.ReadFull(s.cReader, make([]byte, cOff)); err != nil {
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
	readerIsFile := s.cFile == s.cReader
	if !readerIsFile && s.cReader != nil {
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
