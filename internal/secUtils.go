package internal

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"path"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

func NormalizePath(place string) string {
	return path.Clean("/" + place)
}

func GetFullPath(public string, path string) (string, error) {
	if filepath.Separator != '/' && strings.ContainsRune(path, filepath.Separator) {
		return "", errors.New("invalid character in file path")
	}
	dir := public
	if dir == "" {
		dir = "."
	}
	return filepath.Join(dir, filepath.FromSlash(NormalizePath(path))), nil
}

func SigData(data string, salt string) string {
	time := strconv.FormatInt(time.Now().Unix(), 10)

	hash := getSha256Hash(data, salt, time)

	sigKey := time + ":" + hash + ":" + string(data)

	return sigKey
}

func UnSigData(data string, salt string) (string, error) {
	var time string
	var sig string
	for i := 0; i < 2; i++ {
		sepPos := strings.Index(data, ":")
		if sepPos == -1 {
			return "", errors.New("Incorrect_key")
		}
		part := data[0:sepPos]
		if i == 0 {
			time = part
		} else {
			sig = part
		}
		data = data[sepPos+1:]
	}

	hash := getSha256Hash(data, salt, time)

	if hash != sig {
		return "", errors.New("Incorrect_signature")
	}

	return data, nil
}

func getSha256Hash(json string, salt string, time string) string {
	hashBytes := sha256.Sum256([]byte(time + json + salt))
	return hex.EncodeToString(hashBytes[:])[0:7]
}

/*
func init() {
	Test()
}

func Test() {
	root := "/Users/Home"
	paths := [...]string{
		"/1/2",
		"/1/2/",
		"../1/2/",
		"../../1/2",
		"//1",
		"/1/../2",
		"",
		".",
		"/%",
		"/users/../../todo.txt",
		"/",
		"//todo@txt",
		"qwe\\qqe\\ewqe",
		"a\\b",
	}

	for _, path := range paths {
		log.Println("==============", path)
		norm := NormalizePath(path)
		log.Println("normalizePath", norm)
		path, _ := GetFullPath(root, path)
		log.Println("fullPath", path)
		log.Println("")
	}
}
*/
