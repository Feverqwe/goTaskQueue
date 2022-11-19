//go:build linux

package trayIcon

import (
	"goTaskQueue/internal/cfg"
)

func TrayIcon(config *cfg.Config, callChan chan string) {
	loopChan := make(chan string)
	<-loopChan
}
