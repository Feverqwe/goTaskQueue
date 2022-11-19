//go:build linux

package powerCtr

type PowerControl struct {
}

func (self *PowerControl) Inc() {

}

func (self *PowerControl) Dec() {

}

func GetPowerControl() *PowerControl {
	powerControl := &PowerControl{}
	return powerControl
}
