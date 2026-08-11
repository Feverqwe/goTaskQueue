package taskQueue

import (
	"encoding/json"
	"goTaskQueue/assets"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestTemplateVariableJSONCompatibility(t *testing.T) {
	var legacy TemplateVariable
	if err := json.Unmarshal([]byte(`{"name":"Image","value":"image","defaultValue":"latest"}`), &legacy); err != nil {
		t.Fatal(err)
	}
	if legacy.Type != "" || legacy.Options != nil {
		t.Fatalf("legacy variable acquired new fields: %#v", legacy)
	}

	variable := TemplateVariable{
		Name:         "Environment",
		Value:        "environment",
		DefaultValue: "staging",
		Type:         "select",
		Options:      []string{"development", "staging", "production"},
	}
	data, err := json.Marshal(variable)
	if err != nil {
		t.Fatal(err)
	}

	var decoded TemplateVariable
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatal(err)
	}
	if decoded.Type != variable.Type || len(decoded.Options) != len(variable.Options) {
		t.Fatalf("select variable did not round-trip: %#v", decoded)
	}
}

func TestCopyDefaultTemplates(t *testing.T) {
	templatesPath := t.TempDir()
	if err := copyDefaultTemplates(templatesPath); err != nil {
		t.Fatal(err)
	}

	copied := 0
	err := fs.WalkDir(assets.Files, "templates", func(assetPath string, entry fs.DirEntry, err error) error {
		if err != nil || entry.IsDir() {
			return err
		}

		want, err := assets.Files.ReadFile(assetPath)
		if err != nil {
			return err
		}
		got, err := os.ReadFile(filepath.Join(templatesPath, strings.TrimPrefix(assetPath, "templates/")))
		if err != nil {
			return err
		}
		if string(got) != string(want) {
			t.Errorf("copied template %q does not match its embedded source", assetPath)
		}
		copied++
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
	if copied == 0 {
		t.Fatal("no embedded templates were copied")
	}
}
