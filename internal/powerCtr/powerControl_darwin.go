//go:build darwin

package powerCtr

import (
	"sync/atomic"
	"time"

	"github.com/caseymrm/go-caffeinate"
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

func GetPowerControl() *PowerControl {
	powerControl := &PowerControl{
		ch: make(chan int),
	}
	c := caffeinate.Caffeinate{
		IdleSystem: true,
		// System:     true,
	}
	go func() {
		isActive := false
		for {
			v := <-powerControl.ch
			switch v {
			case 1:
				isActive = true
				if !c.Running() {
					go func() {
						c.Start()
						for {
							time.Sleep(5 * time.Second)
							if !isActive {
								break
							}
						}
						c.Stop()
					}()
				}
			case 0:
				isActive = false
			}
		}
	}()
	return powerControl
}
