//go:build windows

package internal

import (
	"syscall"
	"unsafe"
)

func CreateMutex(name string) (uintptr, error) {
	kernel32 := syscall.NewLazyDLL("kernel32.dll")
	procCreateMutex := kernel32.NewProc("CreateMutexW")

	utf16NamePtr, err := syscall.UTF16PtrFromString(name)
	if err != nil {
		panic(err)
	}

	ret, _, err := procCreateMutex.Call(
		0,
		0,
		uintptr(unsafe.Pointer(utf16NamePtr)),
	)

	switch int(err.(syscall.Errno)) {
	case 0:
		return ret, nil
	default:
		return ret, err
	}
}
