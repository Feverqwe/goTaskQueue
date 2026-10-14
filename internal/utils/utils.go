package utils

import (
	"encoding/json"
	"errors"
	"io"
	"strings"
)

func ParseJson[T any](data io.Reader) (*T, error) {
	decoder := json.NewDecoder(data)
	var payload T
	err := decoder.Decode(&payload)
	if err != nil {
		return nil, err
	}
	var extra any
	if err := decoder.Decode(&extra); err != io.EOF {
		if err == nil {
			err = errors.New("expected a single JSON value")
		}
		return nil, err
	}
	return &payload, nil
}

func IndexOf[T string](arr []T, target T) int {
	for idx, v := range arr {
		if target == v {
			return idx
		}
	}
	return -1
}

func EscapeHtmlInJson(content string) string {
	content = strings.Replace(content, ">", "\\u003e", -1)
	content = strings.Replace(content, "&", "\\u0026", -1)
	content = strings.Replace(content, "<", "\\u003c", -1)
	content = strings.Replace(content, "\u2028", "\\u2028", -1)
	content = strings.Replace(content, "\u2029", "\\u2029", -1)
	return content
}
