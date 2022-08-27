//go:build darwin

package internal

import (
	"time"

	"github.com/caseymrm/go-caffeinate"
)

type PowerControl struct {
	count int
	ch    chan int
}

func (self *PowerControl) Inc() {
	if self.count == 0 {
		self.ch <- 1
	}
	self.count++
}

func (self *PowerControl) Dec() {
	self.count--
	if self.count == 0 {
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
