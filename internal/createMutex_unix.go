//go:build linux || darwin

package internal

import (
	"os"
	"path/filepath"

	"github.com/juju/fslock"
)

func CreateMutex(name string) (uintptr, error) {
	ex, err := os.Executable()
	if err != nil {
		panic(err)
	}
	path := filepath.Join(filepath.Dir(ex), "open.lock")

	lock := fslock.New(path)
	err = lock.TryLock()
	if err != nil {
		return 0, err
	}
	return 1, nil
}
