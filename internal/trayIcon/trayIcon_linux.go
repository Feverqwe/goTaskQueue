//go:build linux

package trayIcon

func TrayIcon(config *Config, callChan chan string) {
	loopChan := make(chan string)
	<-loopChan
}
