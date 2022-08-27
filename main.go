package main

import (
	"flag"
	"fmt"
	"goTaskQueue/internal"
	"log"
	"net/http"
)

func main() {
	if _, err := internal.CreateMutex("GoTaskQueue"); err != nil {
		panic(err)
	}

	var config internal.Config

	var powerControl = internal.GetPowerControl()

	callChan := make(chan string)

	go func() {
		var httpServer *http.Server

		go func() {
			callChan <- "reload"
		}()

		for {
			v := <-callChan
			fmt.Println("callChan", v)

			switch v {
			case "reload":
				config = internal.LoadConfig()

				if httpServer != nil {
					httpServer.Close()
				}

				router := internal.NewRouter()

				powerLock(router, powerControl)
				internal.HandleApi(router, &config)
				fsServer(router, &config)

				address := config.GetAddress()

				log.Printf("Listening on %s...", address)
				httpServer = &http.Server{
					Addr:    address,
					Handler: router,
				}

				go func() {
					err := httpServer.ListenAndServe()
					if err != nil {
						log.Println("Server error", err)
					}
				}()
			}
		}
	}()

	disableTrayIconPtr := flag.Bool("disableTrayIcon", false, "Disable tray icon")
	flag.Parse()

	if !*disableTrayIconPtr {
		internal.TrayIcon(&config, callChan)
	} else {
		loopChan := make(chan string)
		<-loopChan
	}
}

func powerLock(router *internal.Router, powerControl *internal.PowerControl) {
	router.Use(func(w http.ResponseWriter, r *http.Request, next internal.RouteNextFn) {
		if powerControl != nil {
			powerControl.Inc()
			defer powerControl.Dec()
		}
		next()
	})
}

func fsServer(router *internal.Router, config *internal.Config) {
	public := config.Public

	fileServer := http.FileServer(http.Dir(public))

	router.All("/index.html$", func(w http.ResponseWriter, r *http.Request, next internal.RouteNextFn) {
		osFullPath, err := internal.GetFullPath(public, r.URL.Path)
		if err != nil {
			w.WriteHeader(403)
			return
		}

		file, stat, err := internal.OpenFile(osFullPath)
		if err != nil {
			internal.HandleOpenFileError(err, w)
			return
		}
		defer file.Close()

		http.ServeContent(w, r, stat.Name(), stat.ModTime(), file)
	})

	router.Use(func(w http.ResponseWriter, r *http.Request, next internal.RouteNextFn) {
		fileServer.ServeHTTP(w, r)
	})
}
