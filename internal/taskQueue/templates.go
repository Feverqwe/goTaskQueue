package taskQueue

import (
	"bytes"
	"encoding/json"
	"errors"
	"goTaskQueue/assets"
	"goTaskQueue/internal/cfg"
	"goTaskQueue/internal/utils"
	"io/fs"
	"log"
	"os"
	"path"
	"path/filepath"
	"sort"
	"strings"
	"sync"

	"github.com/natefinch/atomic"
)

type TemplateVariable struct {
	Name         string   `json:"name"`
	Value        string   `json:"value"`
	DefaultValue string   `json:"defaultValue"`
	Type         string   `json:"type,omitempty"`
	Options      []string `json:"options,omitempty"`
}

type Template struct {
	Place   string `json:"place"`
	Command string `json:"command"`

	Name        string             `json:"name"`
	Description string             `json:"description,omitempty"`
	Id          string             `json:"id"`
	Variables   []TemplateVariable `json:"variables"`

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

	err = os.MkdirAll(place, 0700)
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

	err = os.MkdirAll(filepath.Dir(to), 0700)
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

func MoveTemplateFolder(relFrom string, relTo string) error {
	from, err := getPlace(relFrom)
	if err != nil {
		return err
	}

	to, err := getPlace(relTo)
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

	err = os.MkdirAll(filepath.Dir(to), 0700)
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
var templatesCacheMu sync.Mutex

func GetTemplates() []Template {
	templatesCacheMu.Lock()
	defer templatesCacheMu.Unlock()
	root := getTemplatesPath()

	if TEMPLATES_CACHE == nil {
		templates := readTemplateFolder(root)
		TEMPLATES_CACHE = templates
	}

	return append([]Template(nil), TEMPLATES_CACHE...)
}

// SearchTemplates returns templates ranked by how well their user-facing
// metadata matches query. Every query word must match at least one field.
func SearchTemplates(query string, limit int) []Template {
	templates := GetTemplates()
	terms := strings.Fields(strings.ToLower(strings.TrimSpace(query)))
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	type match struct {
		template Template
		score    int
	}
	matches := make([]match, 0, len(templates))
	for _, template := range templates {
		name := strings.ToLower(template.Name)
		description := strings.ToLower(template.Description)
		place := strings.ToLower(template.Place)
		id := strings.ToLower(template.Id)
		variableText := strings.Builder{}
		for _, variable := range template.Variables {
			variableText.WriteByte(' ')
			variableText.WriteString(strings.ToLower(variable.Name))
			variableText.WriteByte(' ')
			variableText.WriteString(strings.ToLower(variable.Value))
		}

		score := 0
		matched := true
		for _, term := range terms {
			termScore := 0
			switch {
			case name == term || id == term || place == term:
				termScore = 100
			case strings.HasPrefix(name, term):
				termScore = 60
			case strings.Contains(name, term):
				termScore = 40
			case strings.Contains(description, term):
				termScore = 25
			case strings.Contains(id, term) || strings.Contains(place, term):
				termScore = 15
			case strings.Contains(variableText.String(), term):
				termScore = 10
			default:
				matched = false
			}
			score += termScore
		}
		if matched {
			matches = append(matches, match{template: template, score: score})
		}
	}

	sort.SliceStable(matches, func(i, j int) bool {
		if matches[i].score != matches[j].score {
			return matches[i].score > matches[j].score
		}
		left := strings.ToLower(matches[i].template.Name)
		right := strings.ToLower(matches[j].template.Name)
		if left != right {
			return left < right
		}
		return matches[i].template.Place < matches[j].template.Place
	})

	if len(matches) > limit {
		matches = matches[:limit]
	}
	result := make([]Template, len(matches))
	for i, match := range matches {
		result[i] = match.template
	}
	return result
}

func FlushTemplateCache() {
	templatesCacheMu.Lock()
	defer templatesCacheMu.Unlock()
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

func copyDefaultTemplates(templatesPath string) error {
	return fs.WalkDir(assets.Files, "templates", func(assetPath string, entry fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if entry.IsDir() {
			return nil
		}

		data, err := assets.Files.ReadFile(assetPath)
		if err != nil {
			return err
		}

		sourcePath := strings.TrimPrefix(assetPath, "templates/")
		fullPath := filepath.Join(templatesPath, sourcePath)
		if err := os.MkdirAll(filepath.Dir(fullPath), 0700); err != nil {
			return err
		}
		return os.WriteFile(fullPath, data, 0600)
	})
}

func fillDefaultTemplateDescriptions(templatesPath string) error {
	return fs.WalkDir(assets.Files, "templates", func(assetPath string, entry fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if entry.IsDir() || entry.Name() != TEMPALTE_NAME {
			return nil
		}

		defaultData, err := assets.Files.ReadFile(assetPath)
		if err != nil {
			return err
		}
		defaultTemplate, err := utils.ParseJson[Template](bytes.NewReader(defaultData))
		if err != nil || strings.TrimSpace(defaultTemplate.Description) == "" {
			return err
		}

		relPath := strings.TrimPrefix(assetPath, "templates/")
		targetPath := filepath.Join(templatesPath, filepath.FromSlash(relPath))
		targetData, err := os.ReadFile(targetPath)
		if os.IsNotExist(err) {
			return nil
		}
		if err != nil {
			return err
		}
		targetTemplate, err := utils.ParseJson[Template](bytes.NewReader(targetData))
		if err != nil || strings.TrimSpace(targetTemplate.Description) != "" {
			return err
		}

		targetTemplate.Description = defaultTemplate.Description
		updated, err := json.Marshal(targetTemplate)
		if err != nil {
			return err
		}
		return atomic.WriteFile(targetPath, bytes.NewReader(updated))
	})
}

func InitTemplates() {
	place := getTemplatesPath()
	_, err := os.Stat(place)
	if err != nil {
		if os.IsNotExist(err) {
			err = copyDefaultTemplates(place)
		}
	}
	if err != nil {
		log.Println("Init templates error", err)
		return
	}
	if err := fillDefaultTemplateDescriptions(place); err != nil {
		log.Println("Update default template descriptions error", err)
	}
}
