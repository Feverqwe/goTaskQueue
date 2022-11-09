package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"goTaskQueue/assets"
	"goTaskQueue/internal"
	taskqueue "goTaskQueue/internal/taskQueue"
	"io"
	"log"
	"net/http"
	"os"
	"path"
	"strings"
	"time"

	"github.com/NYTimes/gziphandler"
	"golang.org/x/net/websocket"
)

func main() {
	if _, err := internal.CreateMutex("GoTaskQueue"); err != nil {
		panic(err)
	}

	var config internal.Config

	var powerControl = internal.GetPowerControl()
	var taskQueue = taskqueue.NewQueue()

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
				handleWebsocket(router, taskQueue)
				internal.HandleApi(router, taskQueue, &config, callChan)
				handleWww(router, &config)

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

func handleWebsocket(router *internal.Router, taskQueue *taskqueue.Queue) {
	const CHUNK_SIZE = 1 * 1024 * 1024

	ws := func(ws *websocket.Conn) {
		defer ws.Close()

		id := ws.Request().URL.Query().Get("id")

		task, err := taskQueue.Get(id)
		if err != nil {
			return
		}

		go func() {
			for {
				var data []byte
				err := websocket.Message.Receive(ws, &data)
				if err == io.EOF || err != nil {
					break
				}
			}
		}()

		pushPart := func(part []byte) error {
			for len(part) > 0 {
				chunkSize := CHUNK_SIZE
				if len(part) < chunkSize {
					chunkSize = len(part)
				}
				chunk := part[0:chunkSize]
				part = part[chunkSize:]
				err := websocket.Message.Send(ws, chunk)
				if err != nil {
					return err
				}
			}
			return nil
		}

		offset := 0
		if task.Combined != nil && len(*task.Combined) > 100*1024 {
			offset = len(*task.Combined) - 100*1024
		}
		lastValue := -1
		for {
			if task.Combined != nil {
				fragment := (*task.Combined)[offset:]
				offset += len(fragment)
				err := pushPart(fragment)
				if err != nil {
					fmt.Println("ws send error", err)
					return
				}
			}
			if lastValue == 0 {
				break
			}
			lastValue = task.Wait()
		}
	}

	router.All("/ws", func(w http.ResponseWriter, r *http.Request, next internal.RouteNextFn) {
		websocket.Handler(ws).ServeHTTP(w, r)
	})
}

func handleWww(router *internal.Router, config *internal.Config) {
	const DEBUG = false

	binTime := time.Now()
	if binPath, err := os.Executable(); err == nil {
		if binStat, err := os.Stat(binPath); err == nil {
			binTime = binStat.ModTime()
		}
	}

	type RootStore struct {
		Templates []interface{} `json:"templates"`
	}

	gzipHandler := gziphandler.GzipHandler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mTime := binTime
		assetPath := r.URL.Path

		if assetPath == "/" {
			assetPath = "/index.html"
		} else if assetPath == "/task" {
			assetPath = "/task.html"
		}

		var err error
		var content []byte
		if DEBUG {
			path := "./tq-ui/dist" + assetPath
			content, err = os.ReadFile(path)
			if info, err := os.Stat(path); err == nil {
				mTime = info.ModTime()
			}
		} else {
			content, err = assets.Asset("www" + assetPath)
		}
		if err != nil {
			w.WriteHeader(404)
			return
		}

		if assetPath == "/index.html" || assetPath == "/task.html" {
			mTime = time.Now()

			store := RootStore{
				Templates: config.Templates,
			}
			storeJson, err := json.Marshal(store)

			body := string(content)
			body = strings.Replace(body, "{{TITLE}}", internal.EscapeHtmlInJson(config.Name), 1)
			if err == nil {
				body = strings.Replace(body, "<script id=\"root_store\"></script>", "<script id=\"root_store\">window.ROOT_STORE="+internal.EscapeHtmlInJson(string(storeJson))+"</script>", 1)
			}
			content = []byte(body)
		}

		reader := bytes.NewReader(content)
		name := path.Base(assetPath)
		http.ServeContent(w, r, name, mTime, reader)
	}))

	router.Custom([]string{http.MethodGet, http.MethodHead}, []string{"^/"}, func(w http.ResponseWriter, r *http.Request, next internal.RouteNextFn) {
		gzipHandler.ServeHTTP(w, r)
	})
}
