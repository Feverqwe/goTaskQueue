package templatectr

import (
	"encoding/json"
	"fmt"
	"goTaskQueue/internal/cfg"
	"path/filepath"
)

type LegacyTemplateBase struct {
	Type           string               `json:"type"`
	Name           string               `json:"name"`
	Templates      []LegacyTemplateBase `json:"templates"`
	Id             string               `json:"id"`
	Label          string               `json:"label"`
	Group          string               `json:"group"`
	Variables      []TemplateVariable   `json:"variables"`
	Command        string               `json:"command"`
	IsPty          bool                 `json:"isPty"`
	IsOnlyCombined bool                 `json:"isOnlyCombined"`
}

func MigrateTemplates(config cfg.Config) []string {
	templateOrder := make([]string, 0)
	var legacyTemplates []LegacyTemplateBase
	if j, err := json.Marshal(config.Templates); err == nil {
		json.Unmarshal(j, &legacyTemplates)
	}

	var next func(place string, templates []LegacyTemplateBase)

	next = func(place string, templates []LegacyTemplateBase) {
		for _, tempalate := range templates {
			if tempalate.Type == "folder" {
				next(filepath.Join(place, tempalate.Name), tempalate.Templates)
			} else {
				templatePlace := filepath.Join(place, tempalate.Name)
				newTemplate := Template{
					Place:          templatePlace,
					Command:        tempalate.Command,
					Name:           tempalate.Name,
					Id:             tempalate.Id,
					Label:          tempalate.Label,
					Group:          tempalate.Group,
					Variables:      tempalate.Variables,
					IsPty:          tempalate.IsPty,
					IsOnlyCombined: tempalate.IsOnlyCombined,
				}
				err := WriteTemplate(newTemplate, true)
				if err != nil {
					fmt.Println("Migrate template error", err)
				}
				templateOrder = append(templateOrder, templatePlace)
			}
		}
	}

	next("", legacyTemplates)

	return templateOrder
}
