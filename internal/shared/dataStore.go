package shared

import "io"

type DataStore struct {
	Write  func([]byte) (int, error)
	ReadAt func(int64) ([]byte, error)
	PipeTo func(w io.Writer) error
	Slice  func(int64, bool) (*DataStore, error)
	Len    func() int64
	Close  func() error
}
