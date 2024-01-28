package logstore

import (
	"sync"
)

type QuickBuf struct {
	qBuf       []byte
	qBufM      sync.RWMutex
	maxBufSize int
}

func (s *QuickBuf) GetMaxSize() int {
	return s.maxBufSize
}

func (s *QuickBuf) SetMaxSize(size int) {
	s.maxBufSize = size
}

func (s *QuickBuf) QWrite(b []byte) {
	s.qWrite(b)
}

func (s *QuickBuf) qWrite(b []byte) {
	if s.maxBufSize == 0 {
		return
	}
	s.qBufM.Lock()
	defer s.qBufM.Unlock()

	s.qBuf = append(s.qBuf, b...)
	if len(s.qBuf) > s.maxBufSize {
		off := len(s.qBuf) - s.maxBufSize
		s.qBuf = s.qBuf[off:]
	}
}

func (s *QuickBuf) QReadFromEnd(i int) (b []byte, ok bool) {
	return s.qReadFromEnd(i)
}

func (s *QuickBuf) qReadFromEnd(i int) (b []byte, ok bool) {
	s.qBufM.RLock()
	defer s.qBufM.RUnlock()

	if len(s.qBuf) >= i {
		off := len(s.qBuf) - i
		b = s.qBuf[off:]
		return b, true
	}
	return
}

func (s *QuickBuf) QClose() {
	s.qClose()
}

func (s *QuickBuf) qClose() {
	s.qBufM.Lock()
	defer s.qBufM.Unlock()

	s.qBuf = make([]byte, 0)
}
