package cfg

import (
	"bytes"
	"encoding/json"
	"log"
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"

	"github.com/natefinch/atomic"
)

type Config struct {
	Port      int
	Address   string
	Name      string
	Run       []string
	PtyRun    []string
	Templates []interface{}
	PtyRunEnv []string
	RunEnv    []string
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

func getNewConfig() Config {
	var config = Config{
		Templates: make([]interface{}, 0),
		Port:      80,
		Name:      "TaskQueue",
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
	return config
}

func LoadConfig() Config {
	config := getNewConfig()

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
		config.Run = getNewConfig().Run
	}

	if config.PtyRun == nil {
		config.PtyRun = getNewConfig().PtyRun
	}

	if config.PtyRunEnv == nil {
		config.PtyRunEnv = getNewConfig().PtyRunEnv
	}

	if config.RunEnv == nil {
		config.RunEnv = getNewConfig().RunEnv
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

func GetProfilePath() string {
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
