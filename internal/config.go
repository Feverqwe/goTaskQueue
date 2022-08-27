package internal

import (
	"bytes"
	"encoding/json"
	"log"
	"os"
	"path"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"

	"github.com/natefinch/atomic"
)

const (
	IsSimplePtrn = 0
	IsExtraPtrn  = 1
)

type PrepPattern struct {
	patternType int
	pattern     string
	partCount   int
}

type Config struct {
	Port                 int
	Address              string
	Public               string
	Name                 string
	ShowHiddenFiles      bool
	WritablePatterns     []string
	Salt                 string
	prepWritablePatterns []PrepPattern
}

var APP_ID = "com.rndnm.gotaskqueue"

func (s *Config) GetAddress() string {
	return s.Address + ":" + strconv.Itoa(s.Port)
}

func (s *Config) GetBrowserAddress() string {
	addr := s.Address
	if addr == "" {
		addr = "127.0.0.1"
	}
	return "http://" + addr + ":" + strconv.Itoa(s.Port)
}

func (s *Config) IsWritable(targetPath string) bool {
	lowPath := strings.ToLower(targetPath)

	for _, p := range s.prepWritablePatterns {
		if p.patternType == IsExtraPtrn {
			partCount := p.partCount
			pathParts := strings.SplitN(lowPath, "/", partCount+1)
			if len(pathParts) < partCount {
				continue
			}
			lowPath = strings.Join(pathParts[0:partCount], "/")
		}
		m, _ := path.Match(p.pattern, lowPath)
		if m {
			return true
		}
	}
	return false
}

func PrepPatterns(patterns []string) []PrepPattern {
	result := []PrepPattern{}

	for _, rawPattern := range patterns {
		pattern := strings.ToLower(rawPattern)
		partCount := strings.Count(pattern, "/") + 1
		patternType := IsSimplePtrn
		if strings.HasSuffix(pattern, "**") {
			pattern = pattern[0 : len(pattern)-1]
			patternType = IsExtraPtrn
		}
		np := PrepPattern{
			patternType: patternType,
			pattern:     pattern,
			partCount:   partCount,
		}
		result = append(result, np)
	}

	return result
}

func getNewConfig() Config {
	var config = Config{
		WritablePatterns: make([]string, 0),
	}
	pwd := getProfilePath()
	config.Port = 80
	config.Public = pwd
	config.Name = "TaskQueue"
	config.ShowHiddenFiles = false
	return config
}

func LoadConfig() Config {
	config := getNewConfig()

	path := getConfigPath()

	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			if err := os.MkdirAll(getProfilePath(), 0750); err != nil {
				log.Println("Create profile path error", err)
			}

			if err := SaveConfig(config); err != nil {
				log.Println("Write new config error", err)
			}
		}
	} else {
		if err := json.Unmarshal(data, &config); err != nil {
			log.Println("Load config error", err)
		}
	}

	config.prepWritablePatterns = PrepPatterns(config.WritablePatterns)

	return config
}

func SaveConfig(config Config) error {
	path := getConfigPath()
	if data, err := json.MarshalIndent(config, "", "  "); err == nil {
		reader := bytes.NewReader(data)
		err = atomic.WriteFile(path, reader)
		return err
	}
	return nil
}

func getConfigPath() string {
	place := getProfilePath()
	return filepath.Join(place, "config.json")
}

func getProfilePath() string {
	place := ""
	for _, e := range os.Environ() {
		pair := strings.SplitN(e, "=", 2)
		if pair[0] == "PROFILE_PLACE" {
			place = pair[1]
		}
	}
	if place == "" {
		place = getDefaultProfilePath()
	}
	return place
}

func getDefaultProfilePath() string {
	place := ""
	if runtime.GOOS == "windows" {
		pwd, err := os.Getwd()
		if err != nil {
			panic(err)
		}
		place = pwd
	} else if runtime.GOOS == "darwin" {
		place = os.Getenv("HOME") + "/Library/Application Support/" + APP_ID
	} else {
		ex, err := os.Executable()
		if err != nil {
			panic(err)
		}
		place = filepath.Dir(ex)
	}
	return place
}
