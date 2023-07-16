package utils

import (
	"encoding/json"
	"io"
)

func ParseJson[T any](data io.Reader) (*T, error) {
	decoder := json.NewDecoder(data)
	var payload T
	err := decoder.Decode(&payload)
	if err != nil {
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
