package internal

import (
	"net/http"
	"os"
)

func OpenFile(path string) (*os.File, os.FileInfo, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, nil, err
	}
	stat, err := file.Stat()
	if err != nil {
		file.Close()
		file = nil
	}
	return file, stat, err
}

func HandleOpenFileError(err error, writer http.ResponseWriter) {
	if os.IsNotExist(err) {
		writer.WriteHeader(404)
	} else {
		writer.WriteHeader(403)
	}
}
