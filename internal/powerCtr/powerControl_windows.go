//go:build windows

package powerCtr

import (
	"log"
	"sync/atomic"
	"syscall"
	"unsafe"

	"golang.org/x/sys/windows"
)

type PowerControl struct {
	count int32
	ch    chan int
}

func (self *PowerControl) Inc() {
	if atomic.LoadInt32(&self.count) == 0 {
		self.ch <- 1
	}
	atomic.AddInt32(&self.count, 1)
}

func (self *PowerControl) Dec() {
	count := atomic.AddInt32(&self.count, -1)
	if count == 0 {
		self.ch <- 0
	}
}

type ULONG uint32
type DWORD uint32
type LPWSTR *uint16

type SimpleReasonString struct {
	SimpleReasonString *uint16
}

type REASON_CONTEXT struct {
	Version ULONG
	Flags   DWORD
	Reason  SimpleReasonString
}

func GetPowerControl() *PowerControl {
	kernel32 := syscall.NewLazyDLL("kernel32.dll")
	powerControl := &PowerControl{
		ch: make(chan int),
	}
	go func() {
		powerCreateRequest := kernel32.NewProc("PowerCreateRequest")
		powerSetRequest := kernel32.NewProc("PowerSetRequest")
		powerClearRequest := kernel32.NewProc("PowerClearRequest")
		var ctx uintptr
		for {
			v := <-powerControl.ch
			switch v {
			case 1:
				sr, err := windows.UTF16PtrFromString("Active connection")
				if err != nil {
					panic(err)
				}
				reason := &REASON_CONTEXT{
					Version: 0,
					Flags:   0x1,
					Reason:  SimpleReasonString{sr},
				}
				pCtx, errNum, status := powerCreateRequest.Call(uintptr(unsafe.Pointer(reason)))
				ctx = pCtx
				if errNum != 0 {
					log.Println("powerCreateRequest error", status)
				} else {
					_, errNum, status := powerSetRequest.Call(ctx, uintptr(0x3))
					if errNum != 0 {
						log.Println("powerSetRequest error", status)
					}
				}
			case 0:
				_, errNum, status := powerClearRequest.Call(ctx, uintptr(0x3))
				if errNum != 0 {
					log.Println("powerCreateRequest error", status)
				}
			}
		}
	}()
	return powerControl
}
