package taskQueue

import (
	"bytes"
	"encoding/json"
	"errors"
	"goTaskQueue/internal/cfg"
	"goTaskQueue/internal/utils"
	"log"
	"os"
	"path"
	"path/filepath"
	"strings"

	"github.com/natefinch/atomic"
)

type TemplateVariable struct {
	Name         string `json:"name"`
	Value        string `json:"value"`
	DefaultValue string `json:"defaultValue"`
}

type Template struct {
	Place   string `json:"place"`
	Command string `json:"command"`

	Name      string             `json:"name"`
	Id        string             `json:"id"`
	Variables []TemplateVariable `json:"variables"`

	NewTaskBase
}

const TEMPALTE_NAME = "template.json"
const COMMAND_NAME = "command.sh"

func readTemplateFolder(place string) []Template {
	templates := make([]Template, 0)

	dir, err := os.ReadDir(place)
	if err != nil {
		log.Println("Read dir error", err)
		return templates
	}

	for i := 0; i < len(dir); i++ {
		entity := dir[i]
		subPlace := filepath.Join(place, entity.Name())
		if !entity.IsDir() {
			continue
		}
		template, err := readTemplate(subPlace, true)
		if err == nil {
			if template == nil {
				templates = append(templates, readTemplateFolder(subPlace)...)
			} else {
				templates = append(templates, *template)
			}
		} else {
			log.Printf("Read template '%s' error: %v\n", subPlace, err)
			continue
		}
	}

	return templates
}

func ReadTemplate(relPlace string) (*Template, error) {
	place, err := getPlace(relPlace)
	if err != nil {
		return nil, err
	}

	return readTemplate(place, false)
}

func readTemplate(place string, mayBeNull bool) (*Template, error) {
	data, err := os.ReadFile(filepath.Join(place, TEMPALTE_NAME))
	if err != nil {
		if mayBeNull && os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}

	json, err := utils.ParseJson[Template](bytes.NewReader(data))
	if err != nil {
		return nil, err
	}

	relPlace, err := getRelPlace(place)
	if err != nil {
		return nil, err
	}

	command, err := os.ReadFile(filepath.Join(place, COMMAND_NAME))
	if err != nil {
		return nil, err
	}

	json.Command = string(command)
	json.Place = relPlace
	return json, nil
}

func WriteTemplate(template Template, isNew bool) error {
	relPlace := template.Place
	command := template.Command

	place, err := getPlace(relPlace)
	if err != nil {
		return err
	}

	template.Place = ""
	template.Command = ""

	json, err := json.Marshal(template)
	if err != nil {
		return err
	}

	_, err = os.Stat(place)
	if isNew {
		if err == nil {
			err = errors.New("template_exists")
		}
		if os.IsNotExist(err) {
			err = nil
		}
	}
	if err != nil {
		return err
	}

	err = os.MkdirAll(place, 0755)
	if err != nil {
		return err
	}

	err = atomic.WriteFile(filepath.Join(place, TEMPALTE_NAME), bytes.NewReader(json))
	if err != nil {
		return err
	}

	err = atomic.WriteFile(filepath.Join(place, COMMAND_NAME), strings.NewReader(command))
	if err != nil {
		return err
	}

	FlushTemplateCache()

	return nil
}

func RemoveTemplate(relPlace string) error {
	place, err := getPlace(relPlace)
	if err != nil {
		return err
	}

	_, err = os.Stat(filepath.Join(place, TEMPALTE_NAME))
	if err != nil {
		return err
	}

	err = os.RemoveAll(place)

	if err == nil {
		cleanTemplates()
	}

	FlushTemplateCache()

	return err
}

func MoveTemplate(relFrom string, relTo string) error {
	from, err := getPlace(relFrom)
	if err != nil {
		return err
	}

	to, err := getPlace(relTo)
	if err != nil {
		return err
	}

	_, err = os.Stat(filepath.Join(from, TEMPALTE_NAME))
	if err != nil {
		return err
	}

	dir, err := os.ReadDir(to)
	if err != nil {
		if !os.IsNotExist(err) {
			return err
		}
	} else if len(dir) != 0 {
		return errors.New("to_place_not_empty")
	}

	err = os.MkdirAll(filepath.Dir(to), 0755)
	if err != nil {
		return err
	}

	err = os.Rename(from, to)

	if err == nil {
		cleanTemplates()
	}

	FlushTemplateCache()

	return err
}

func cleanTemplates() {
	root := getTemplatesPath()

	if err := cleanEmptyFolders(root); err != nil {
		log.Println("Clean templates error", err)
	}
}

func cleanEmptyFolders(place string) error {
	dir, err := os.ReadDir(place)
	if err != nil {
		return err
	}

	for i := 0; i < len(dir); i++ {
		entity := dir[i]
		if !entity.IsDir() {
			continue
		}

		subPlace := filepath.Join(place, entity.Name())
		subDir, err := os.ReadDir(subPlace)
		if err != nil {
			return err
		}
		if len(subDir) == 0 {
			if err := os.Remove(subPlace); err != nil {
				return err
			}
		} else {
			if containFile(subDir, TEMPALTE_NAME) {
				continue
			}

			if err := cleanEmptyFolders(subPlace); err != nil {
				return err
			}
		}
	}

	return nil
}

var TEMPLATES_CACHE []Template

func GetTemplates() []Template {
	root := getTemplatesPath()

	if TEMPLATES_CACHE == nil {
		templates := readTemplateFolder(root)
		TEMPLATES_CACHE = templates
	}

	return TEMPLATES_CACHE
}

func FlushTemplateCache() {
	TEMPLATES_CACHE = nil
}

func GetTemplate(id string) (*Template, error) {
	templates := GetTemplates()
	for i := 0; i < len(templates); i++ {
		template := templates[i]
		if template.Id == id {
			return &template, nil
		}
	}
	return nil, errors.New("template_not_found")
}

func getRelPlace(place string) (string, error) {
	root := getTemplatesPath()

	relPath, err := filepath.Rel(root, place)
	if err != nil {
		return "", err
	}
	relPath = filepath.ToSlash(relPath)
	return relPath, err
}

func GetPlace(relPlace string) (string, error) {
	return getPlace(relPlace)
}

func getPlace(relPlace string) (string, error) {
	if filepath.Separator != '/' && strings.ContainsRune(relPlace, filepath.Separator) {
		return "", errors.New("invalid character in file path")
	}
	root := getTemplatesPath()
	return filepath.Join(root, filepath.FromSlash(path.Clean("/"+relPlace))), nil
}

func GetTemplatesPath() string {
	return getTemplatesPath()
}

func getTemplatesPath() string {
	place := cfg.GetProfilePath()
	return filepath.Join(place, "templates")
}

func containFile(dir []os.DirEntry, name string) bool {
	for ii := 0; ii < len(dir); ii++ {
		entity := dir[ii]
		if entity.IsDir() {
			continue
		}
		if entity.Name() == name {
			return true
		}
	}
	return false
}
