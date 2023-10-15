package taskQueue

import (
	"goTaskQueue/internal/cfg"
	"os"
	"path"
	"strings"
)

func CleanLogs(config *cfg.Config, queue *Queue) (err error) {
	place := config.GetLogsFolder()

	idSet := make(map[string]bool)
	for _, task := range queue.GetAll() {
		idSet[task.Id] = true
	}

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

		parts := strings.Split(name, "-")
		if len(parts) < 2 {
			continue
		}

		id := parts[0]

		if _, ok := idSet[id]; !ok {
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
