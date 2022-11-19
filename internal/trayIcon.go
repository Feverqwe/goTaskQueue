//go:build darwin || windows

package internal

import (
	"goTaskQueue/assets"
	"goTaskQueue/internal/cfg"
	"log"
	"strconv"

	"github.com/getlantern/systray"
	"github.com/skratchdot/open-golang/open"
)

var icon []byte

func TrayIcon(config *cfg.Config, callChan chan string) {
	if icon == nil {
		data, err := assets.Asset("icon.ico")
		if err != nil {
			panic(err)
		}
		icon = data
	}

	onRun := func() {
		if icon != nil {
			systray.SetTemplateIcon(icon, icon)
		}
		systray.SetTooltip("GoTaskQueue")

		mOpen := systray.AddMenuItem("Open", "Open")

		subConfig := systray.AddMenuItem("Config", "Config")
		mSetPort := subConfig.AddSubMenuItem("Set port", "Set port")
		mSetAddress := subConfig.AddSubMenuItem("Set address", "Set address")
		mOpenProfilePath := subConfig.AddSubMenuItem("Open profile path", "Open profile path")
		mReloadConfig := subConfig.AddSubMenuItem("Reload config", "Reload config")

		mQuit := systray.AddMenuItem("Quit", "Quit")

		go func() {
			for {
				select {
				case <-mQuit.ClickedCh:
					systray.Quit()
				case <-mOpen.ClickedCh:
					err := open.Run(config.GetBrowserAddress())
					if err != nil {
						log.Println("Open url error", err)
					}
				case <-mSetPort.ClickedCh:
					result, err := ShowEntry("Change port", "Enter port number:", strconv.Itoa(config.Port))
					if err != nil {
						if err.Error() != "Canceled" {
							log.Println("Enter port error", err)
						}
					} else {
						portStr := result
						if port, err := strconv.Atoi(portStr); err == nil {
							config.Port = port
							if err := cfg.SaveConfig(*config); err == nil {
								callChan <- "reload"
							}
						}
					}
				case <-mSetAddress.ClickedCh:
					result, err := ShowEntry("Change address", "Enter address:", config.Address)
					if err != nil {
						if err.Error() != "Canceled" {
							log.Println("Enter address error", err)
						}
					} else {
						config.Address = result
						if err := cfg.SaveConfig(*config); err == nil {
							callChan <- "reload"
						}
					}
				case <-mOpenProfilePath.ClickedCh:
					open.Start(cfg.GetProfilePath())
				case <-mReloadConfig.ClickedCh:
					callChan <- "reload"
				}
			}
		}()
	}

	onExit := func() {}

	systray.Run(onRun, onExit)
}
