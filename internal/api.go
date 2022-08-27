package internal

import (
	"bytes"
	"encoding/json"
	"errors"
	"goTaskQueue/assets"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/NYTimes/gziphandler"
)

type JsonFailResponse struct {
	Error string `json:"error"`
}

type JsonSuccessResponse struct {
	Result interface{} `json:"result"`
}

func HandleApi(router *Router, config *Config) {
	apiRouter := NewRouter()
	gzipHandler := gziphandler.GzipHandler(apiRouter)

	handleUpload(apiRouter, config)
	handleWww(apiRouter)
	handleAction(apiRouter, config)
	handleInterfaces(apiRouter, config)
	handleFobidden(apiRouter)

	router.All("^/~/", func(w http.ResponseWriter, r *http.Request, next RouteNextFn) {
		gzipHandler.ServeHTTP(w, r)
	})
}

func handleFobidden(router *Router) {
	router.Use(func(w http.ResponseWriter, r *http.Request, next RouteNextFn) {
		w.WriteHeader(403)
	})
}

func handleUpload(router *Router, config *Config) {
	public := config.Public

	salt := config.Salt
	if len(salt) == 0 {
		salt = strconv.FormatInt(time.Now().Unix(), 10)
	}

	var chunkSize int64 = 16 * 1024 * 1024

	type UploadInitPayload struct {
		FileName string `json:"fileName"`
		Size     int64  `json:"size"`
		Place    string `json:"place"`
	}

	type UploadInit struct {
		Key       string `json:"key"`
		ChunkSize int64  `json:"chunkSize"`
	}

	type Key struct {
		FileName    string `json:"fileName"`
		Size        int64  `json:"size"`
		Place       string `json:"place"`
		TmpFileName string `json:"tmpFileName"`
	}

	buildKey := func(rawFilename string, size int64, rawPlace string, tmpFile *os.File) (string, error) {
		key := Key{
			FileName:    rawFilename,
			Size:        size,
			Place:       rawPlace,
			TmpFileName: filepath.Base(tmpFile.Name()),
		}

		keyJsonByte, err := json.Marshal(key)
		if err != nil {
			return "", err
		}
		keyJson := string(keyJsonByte)

		return SigData(keyJson, salt), nil
	}

	readKey := func(sigKey string) (*Key, error) {
		keyJson, err := UnSigData(sigKey, salt)
		if err != nil {
			return nil, err
		}

		decoder := json.NewDecoder(strings.NewReader(keyJson))

		var payload Key
		err = decoder.Decode(&payload)
		return &payload, err
	}

	readAsString := func(part *multipart.Part) (string, error) {
		buf := new(strings.Builder)
		_, err := io.Copy(buf, part)
		if err != nil {
			return "", err
		}
		return buf.String(), nil
	}

	readAsInt64 := func(part *multipart.Part) (int64, error) {
		var num int64
		str, err := readAsString(part)
		if err == nil {
			num, err = strconv.ParseInt(str, 10, 64)
		}
		return num, err
	}

	saveChunk := func(key *Key, pos int64, size int64, part *multipart.Part) (bool, error) {
		rawPlace := key.Place
		rawTmpFileName := key.TmpFileName

		osTmpFilePath, err := GetFullPath(public, path.Join(rawPlace, rawTmpFileName))
		if err != nil {
			return false, err
		}

		tmpFile, err := os.OpenFile(osTmpFilePath, os.O_WRONLY, 0600)
		if err != nil {
			return false, err
		}
		defer tmpFile.Close()

		offset, err := tmpFile.Seek(pos, 0)
		if err != nil {
			return false, err
		}

		written, err := io.Copy(tmpFile, part)
		if err != nil {
			return false, err
		}

		if written != size {
			return false, errors.New("written_size_missmatch")
		}

		if offset+written > key.Size {
			return false, errors.New("file_size_missmatch")
		}

		isFinish := offset+written == key.Size

		if isFinish {
			tmpFile.Close()

			rawFileName := key.FileName

			osFilePath, err := GetFullPath(public, path.Join(rawPlace, rawFileName))
			if err != nil {
				return false, err
			}

			err = os.Rename(osTmpFilePath, osFilePath)
			if err != nil {
				return false, errors.New("Rename temp file error: " + err.Error())
			}
		}

		return isFinish, nil
	}

	router.Post("/~/upload/init", func(w http.ResponseWriter, r *http.Request, next RouteNextFn) {
		apiCall(w, func() (*UploadInit, error) {
			decoder := json.NewDecoder(r.Body)
			var payload UploadInitPayload
			err := decoder.Decode(&payload)
			if err != nil {
				return nil, err
			}

			rawPlace := payload.Place
			rawFileName := payload.FileName
			size := payload.Size

			osUploadPath, err := GetFullPath(public, rawPlace)
			if err != nil {
				return nil, errors.New("incorrect place")
			}

			filePath := NormalizePath(path.Join(rawPlace, rawFileName))

			isWritable := config.IsWritable(filePath)
			if !isWritable {
				return nil, errors.New("unable wite in this place")
			}

			osFilePath, err := GetFullPath(public, filePath)
			if err != nil {
				return nil, err
			}

			_, err = os.Stat(osFilePath)
			if err == nil {
				return nil, errors.New("File exists")
			}

			tmpFile, err := os.CreateTemp(osUploadPath, "tmp")
			if err != nil {
				return nil, errors.New("Create temp file error: " + err.Error())
			}
			defer tmpFile.Close()

			keyJson, err := buildKey(rawFileName, size, rawPlace, tmpFile)

			result := UploadInit{
				Key:       keyJson,
				ChunkSize: chunkSize,
			}
			return &result, err
		})
	})

	router.Post("/~/upload/chunk", func(w http.ResponseWriter, r *http.Request, next RouteNextFn) {
		apiCall(w, func() (bool, error) {
			reader, err := r.MultipartReader()

			var key *Key
			var pos int64
			var size int64
			var result bool

			for {
				if err != nil {
					break
				}

				var part *multipart.Part
				part, err = reader.NextPart()
				if err == io.EOF {
					err = nil
					break
				}
				if err != nil {
					break
				}

				formName := part.FormName()
				switch formName {
				case "key":
					var sigKey string
					sigKey, err = readAsString(part)
					if err == nil {
						key, err = readKey(sigKey)
					}
				case "pos":
					pos, err = readAsInt64(part)
				case "size":
					size, err = readAsInt64(part)
				case "chunk":
					result, err = saveChunk(key, pos, size, part)
				}
			}

			return result, err
		})
	})
}

func handleInterfaces(router *Router, config *Config) {
	router.Get("/~/addresses", func(w http.ResponseWriter, r *http.Request, next RouteNextFn) {
		apiCall(w, func() ([]string, error) {
			addresses := GetAddresses(config.Port)
			return addresses, nil
		})
	})
}

func handleAction(router *Router, config *Config) {
	public := config.Public

	type RemovePayload struct {
		Place string `json:"place"`
		Name  string `json:"name"`
		IsDir bool   `json:"isDir"`
	}

	type RenamePayload struct {
		Place   string `json:"place"`
		Name    string `json:"name"`
		NewName string `json:"newName"`
	}

	router.Post("/~/rename", func(w http.ResponseWriter, r *http.Request, next RouteNextFn) {
		apiCall(w, func() (string, error) {
			decoder := json.NewDecoder(r.Body)
			var payload RenamePayload
			err := decoder.Decode(&payload)
			if err != nil {
				return "", err
			}

			rawPlace := payload.Place
			rawName := payload.Name
			rawNewName := payload.NewName
			rTargetPath := NormalizePath(path.Join(rawPlace, rawName))
			rNewPath := NormalizePath(path.Join(rawPlace, rawNewName))

			osTargetPath, err := GetFullPath(public, rTargetPath)
			if err != nil {
				return "", err
			}

			osNewPath, err := GetFullPath(public, rNewPath)
			if err != nil {
				return "", err
			}

			isWritableSource := config.IsWritable(rTargetPath)
			isWritableTarget := config.IsWritable(rNewPath)
			if !isWritableSource || !isWritableTarget {
				return "", errors.New("place is not writable")
			}

			err = os.Rename(osTargetPath, osNewPath)

			return "ok", err
		})
	})

	router.Post("/~/remove", func(w http.ResponseWriter, r *http.Request, next RouteNextFn) {
		apiCall(w, func() (string, error) {
			decoder := json.NewDecoder(r.Body)
			var payload RemovePayload
			err := decoder.Decode(&payload)
			if err != nil {
				return "", err
			}

			rawPlace := payload.Place
			rawName := payload.Name
			rTargetPath := NormalizePath(path.Join(rawPlace, rawName))
			osTargetPath, err := GetFullPath(public, rTargetPath)
			if err != nil {
				return "", err
			}

			isWritable := config.IsWritable(rTargetPath)
			if !isWritable {
				return "", errors.New("place is not writable")
			}

			isDir := payload.IsDir
			if isDir {
				err = os.RemoveAll(osTargetPath)
			} else {
				err = os.Remove(osTargetPath)
			}

			return "ok", err
		})
	})
}

func handleWww(router *Router) {
	binTime := time.Now()
	if binPath, err := os.Executable(); err == nil {
		if binStat, err := os.Stat(binPath); err == nil {
			binTime = binStat.ModTime()
		}
	}

	router.Custom([]string{http.MethodGet, http.MethodHead}, []string{"^/~/www/"}, func(w http.ResponseWriter, r *http.Request, next RouteNextFn) {
		assetPath := r.URL.Path[3:]

		content, err := assets.Asset(assetPath)
		if err != nil {
			w.WriteHeader(404)
			return
		}

		reader := bytes.NewReader(content)
		name := path.Base(assetPath)
		http.ServeContent(w, r, name, binTime, reader)
	})
}

type ActionAny[T any] func() (T, error)

func apiCall[T any](w http.ResponseWriter, action ActionAny[T]) {
	result, err := action()
	err = writeApiResult(w, result, err)
	if err != nil {
		panic(err)
	}
}

func writeApiResult(w http.ResponseWriter, result interface{}, err error) error {
	var statusCode int
	var body interface{}
	if err != nil {
		statusCode = 500
		body = JsonFailResponse{
			Error: err.Error(),
		}
	} else {
		statusCode = 200
		body = JsonSuccessResponse{
			Result: result,
		}
	}
	json, err := json.Marshal(body)
	if err == nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(statusCode)
		_, err = w.Write(json)
	}
	return err
}
