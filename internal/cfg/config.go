package cfg

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

type Config struct {
	Port          int
	Address       string
	Name          string
	LogFolder     string
	Run           []string
	PtyRun        []string
	PtyRunEnv     []string
	RunEnv        []string
	TemplateOrder []string
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

func (s *Config) GetLogsFolder() string {
	if path.IsAbs(s.LogFolder) {
		return s.LogFolder
	}
	return path.Join(GetProfilePath(), s.LogFolder)
}

func getNewConfig() Config {
	var config = Config{
		Port:      80,
		Name:      "TaskQueue",
		LogFolder: "logs",
	}
	if runtime.GOOS == "windows" {
		config.Run = []string{"cmd", "/C"}
		config.PtyRun = []string{"cmd", "/C"}
	} else {
		config.Run = []string{"sh", "-c"}
		config.PtyRun = []string{"sh", "-c"}
	}
	config.PtyRunEnv = []string{"TERM=xterm-256color", "COLORTERM=truecolor", "HOME=/root"}
	config.RunEnv = []string{}
	config.TemplateOrder = []string{}
	return config
}

func LoadConfig() Config {
	newConfig := getNewConfig()
	config := newConfig

	path := getConfigPath()

	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			if err := os.MkdirAll(GetProfilePath(), 0750); err != nil {
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

	if config.Run == nil {
		config.Run = newConfig.Run
	}

	if config.PtyRun == nil {
		config.PtyRun = newConfig.PtyRun
	}

	if config.PtyRunEnv == nil {
		config.PtyRunEnv = newConfig.PtyRunEnv
	}

	if config.RunEnv == nil {
		config.RunEnv = newConfig.RunEnv
	}

	if config.TemplateOrder == nil {
		config.TemplateOrder = newConfig.TemplateOrder
	}

	if config.LogFolder == "" {
		config.LogFolder = newConfig.LogFolder
	}

	err = os.MkdirAll(config.GetLogsFolder(), 0700)
	if err != nil {
		log.Println("Create logs folder error", err)
	}

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
	place := GetProfilePath()
	return filepath.Join(place, "config.json")
}

var PROFILE_PATH_CACHE string

func GetProfilePath() string {
	if PROFILE_PATH_CACHE == "" {
		place := ""
		for _, e := range os.Environ() {
			pair := strings.SplitN(e, "=", 2)
			if pair[0] == "PROFILE_PLACE" {
				place = pair[1]
				break
			}
		}
		if place == "" {
			place = getDefaultProfilePath()
		}
		PROFILE_PATH_CACHE = place
	}
	return PROFILE_PATH_CACHE
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
