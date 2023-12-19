package taskQueue

import (
	"goTaskQueue/internal/cfg"
	"os"
	"path"
	"strings"
)

func CleanTaskLogs(config *cfg.Config, id string) (err error) {
	place := config.GetLogsFolder()

	placeFile, err := os.Open(place)
	if err != nil {
		return
	}
	defer placeFile.Close()

	files, err := placeFile.ReadDir(-1)
	if err != nil {
		return
	}

	var r []string

	for _, file := range files {
		if file.IsDir() {
			continue
		}

		name := file.Name()
		filePath := path.Join(place, name)

		if strings.HasPrefix(name, id+"-") {
			r = append(r, filePath)
		}
	}

	for _, p := range r {
		if err := os.Remove(p); err != nil {
			return err
		}
	}

	return nil
}
