package taskQueue

import (
	"math"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"goTaskQueue/internal/cfg"
)

func useValidationTestProfile(t *testing.T) {
	t.Helper()
	previous := cfg.PROFILE_PATH_CACHE
	cfg.PROFILE_PATH_CACHE = t.TempDir()
	FlushTemplateCache()
	t.Cleanup(func() {
		cfg.PROFILE_PATH_CACHE = previous
		FlushTemplateCache()
	})
}

func TestTemplatePathsRejectAliasesAndRootOperations(t *testing.T) {
	useValidationTestProfile(t)
	if err := WriteTemplate(Template{Place: "ops/task", Name: "Keep", Command: "true"}, true); err != nil {
		t.Fatal(err)
	}
	for _, place := range []string{"", ".", "/", "..", "../ops/task", "ops/../ops/task", "/ops/task", "ops//task", "ops/task/", "ops\\task", "C:/ops/task", "ops\x00task"} {
		t.Run(place, func(t *testing.T) {
			if _, err := getPlace(place); err == nil {
				t.Fatal("invalid template path was accepted")
			}
			if err := RemoveTemplate(place); err == nil {
				t.Fatal("invalid removal path was accepted")
			}
			if err := MoveTemplateFolder(place, "moved"); err == nil {
				t.Fatal("invalid source path was accepted")
			}
			if err := MoveTemplateFolder("ops", place); err == nil {
				t.Fatal("invalid destination path was accepted")
			}
			if _, err := ReadTemplate("ops/task"); err != nil {
				t.Fatalf("invalid request changed the original template: %v", err)
			}
		})
	}
}

func TestTemplatePathsRejectSymlinkDirectories(t *testing.T) {
	useValidationTestProfile(t)
	out := t.TempDir()
	if err := os.MkdirAll(GetTemplatesPath(), 0700); err != nil {
		t.Fatal(err)
	}
	if err := os.Symlink(out, filepath.Join(GetTemplatesPath(), "linked")); err != nil {
		t.Skipf("symbolic links unavailable: %v", err)
	}
	if err := WriteTemplate(Template{Place: "linked/task", Name: "Escape"}, true); err == nil {
		t.Fatal("template write through a symbolic link was accepted")
	}
	entries, err := os.ReadDir(out)
	if err != nil || len(entries) != 0 {
		t.Fatalf("outside directory changed: %v, %v", entries, err)
	}
}

func TestWriteTemplateRejectsInvalidMetadataBeforeWriting(t *testing.T) {
	useValidationTestProfile(t)
	valid := TemplateVariable{Name: "Environment", Value: "environment", Type: "select", Options: []string{"staging", "production"}, DefaultValue: "staging"}
	for _, tc := range []struct {
		name   string
		change func(*Template)
	}{
		{"empty name", func(t *Template) { t.Name = " " }},
		{"negative TTL", func(t *Template) { t.TTL = -1 }},
		{"overflow TTL", func(t *Template) { t.TTL = math.MaxInt64 }},
		{"variable name", func(t *Template) { t.Variables[0].Name = "" }},
		{"variable key", func(t *Template) { t.Variables[0].Value = "bad-key" }},
		{"duplicate key", func(t *Template) { t.Variables = append(t.Variables, valid) }},
		{"unknown type", func(t *Template) { t.Variables[0].Type = "invalid" }},
		{"no options", func(t *Template) { t.Variables[0].Options = nil }},
		{"duplicate options", func(t *Template) { t.Variables[0].Options = []string{"staging", "staging"} }},
		{"empty option", func(t *Template) { t.Variables[0].Options = []string{"staging", " "} }},
		{"invalid default", func(t *Template) { t.Variables[0].DefaultValue = "unknown" }},
	} {
		t.Run(tc.name, func(t *testing.T) {
			template := Template{Place: "task", Name: "Test", Variables: []TemplateVariable{valid}}
			tc.change(&template)
			if err := WriteTemplate(template, true); err == nil {
				t.Fatal("invalid template was accepted")
			}
			if _, err := os.Stat(filepath.Join(GetTemplatesPath(), "task")); !os.IsNotExist(err) {
				t.Fatalf("invalid write created a template directory: %v", err)
			}
		})
	}
}

func TestWriteTemplateNormalizesMissingVariables(t *testing.T) {
	useValidationTestProfile(t)
	if err := WriteTemplate(Template{Place: "task", Name: "Test"}, true); err != nil {
		t.Fatal(err)
	}
	data, err := os.ReadFile(filepath.Join(GetTemplatesPath(), "task", TEMPALTE_NAME))
	if err != nil || !strings.Contains(string(data), `"variables":[]`) {
		t.Fatalf("stored variables are not an array: %s, %v", data, err)
	}
	template, err := ReadTemplate("task")
	if err != nil || template.Variables == nil {
		t.Fatalf("ReadTemplate variables = %#v, error = %v", template, err)
	}
}

func TestLegacyOverflowTTLDoesNotExpireImmediately(t *testing.T) {
	task := NewTask("test", TaskBase{NewTaskBase: NewTaskBase{TTL: math.MaxInt64}})
	task.onFinishLocked()
	if !task.ExpiresAt.After(time.Now().Add(24 * time.Hour)) {
		t.Fatalf("overflow TTL caused early cleanup at %v", task.ExpiresAt)
	}
}

func TestGetTemplateRejectsEmptyID(t *testing.T) {
	useValidationTestProfile(t)
	if err := WriteTemplate(Template{Place: "task", Name: "Without ID"}, true); err != nil {
		t.Fatal(err)
	}
	if template, err := GetTemplate(""); err == nil {
		t.Fatalf("empty ID selected a template: %+v", template)
	}
}
