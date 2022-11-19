package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"goTaskQueue/assets"
	"goTaskQueue/internal"
	"goTaskQueue/internal/cfg"
	"goTaskQueue/internal/mutex"
	"goTaskQueue/internal/powerCtr"
	taskqueue "goTaskQueue/internal/taskQueue"
	"goTaskQueue/internal/trayIcon"
	"io"
	"log"
	"net/http"
	"os"
	"path"
	"runtime"
	"strings"
	"time"

	"github.com/NYTimes/gziphandler"
	"golang.org/x/net/websocket"
)

const DEBUG_UI = false

func main() {
	if _, err := mutex.CreateMutex("GoTaskQueue"); err != nil {
		panic(err)
	}

	var config cfg.Config

	var powerControl = powerCtr.GetPowerControl()
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
				config = cfg.LoadConfig()

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
		trayIcon.TrayIcon(&config, callChan)
	} else {
		loopChan := make(chan string)
		<-loopChan
	}
}

func powerLock(router *internal.Router, powerControl *powerCtr.PowerControl) {
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
			type ResizePayload struct {
				Rows int `json:"rows"`
				Cols int `json:"cols"`
				X    int `json:"x"`
				Y    int `json:"y"`
			}

			for {
				var data string
				err := websocket.Message.Receive(ws, &data)
				if err == io.EOF || err != nil {
					fmt.Println("ws receive error", err)
					break
				}

				if len(data) > 0 {
					if data[0:1] == "i" {
						task.Send(data[1:])
					} else if data[0:1] == "r" {
						reader := strings.NewReader(data[1:])
						payload, err := internal.ParseJson[ResizePayload](reader)
						if err == nil {
							err = task.Resize(payload.Rows, payload.Cols, payload.X, payload.Y)
							if err != nil {
								fmt.Println("resize error", err)
							}
						}
					}
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

		offset := -1
		lastValue := -1
		for {
			if task.Combined != nil {
				var fragment []byte
				offset, fragment = task.ReadCombined(offset)
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

func handleWww(router *internal.Router, config *cfg.Config) {
	binTime := time.Now()
	if binPath, err := os.Executable(); err == nil {
		if binStat, err := os.Stat(binPath); err == nil {
			binTime = binStat.ModTime()
		}
	}

	type RootStore struct {
		Templates      []interface{} `json:"templates"`
		IsPtySupported bool          `json:"isPtySupported"`
	}

	gzipHandler := gziphandler.GzipHandler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mTime := binTime
		assetPath := r.URL.Path

		if assetPath == "/" || assetPath == "/task" {
			assetPath = "/index.html"
		}

		var err error
		var content []byte
		if DEBUG_UI {
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

		if assetPath == "/index.html" {
			mTime = time.Now()

			store := RootStore{
				Templates:      config.Templates,
				IsPtySupported: runtime.GOOS != "windows",
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
