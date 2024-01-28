package taskQueue

import (
	"goTaskQueue/internal/shared"
	"sync"
)

type QuickBuf struct {
	qBuf       []byte
	qBufM      sync.RWMutex
	maxBufSize int
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

func (s *QuickBuf) qReadFromEnd(i int) (b []byte, ok bool) {
	s.qBufM.RLock()
	defer s.qBufM.RUnlock()

	if len(s.qBuf) >= i {
		off := len(s.qBuf) - i
		b = s.qBuf[off:]
		ok = true
	}
	return
}

func (s *QuickBuf) qClose() {
	s.qBufM.Lock()
	defer s.qBufM.Unlock()

	s.qBuf = make([]byte, 0)
}

func WrapQuickBuf(p *shared.DataStore, maxBufSize int) *shared.DataStore {
	q := QuickBuf{
		maxBufSize: maxBufSize,
	}

	return &shared.DataStore{
		Write: func(b []byte) (n int, err error) {
			q.qWrite(b)

			return p.Write(b)
		},
		ReadAt: func(i int64) (b []byte, err error) {
			if b, ok := q.qReadFromEnd(int(p.Len() - i)); ok {
				return b, err
			}

			return p.ReadAt(i)
		},
		PipeTo: p.PipeTo,
		Slice: func(i int64, b bool) (ds *shared.DataStore, err error) {
			newDs, err := p.Slice(i, b)
			if err == nil {
				ds = WrapQuickBuf(newDs, q.maxBufSize)
			}
			return
		},
		Len: p.Len,
		Close: func() (err error) {
			q.qClose()

			return p.Close()
		},
	}
}
