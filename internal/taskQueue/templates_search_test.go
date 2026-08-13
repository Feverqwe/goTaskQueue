package taskQueue

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"goTaskQueue/internal/cfg"
)

func TestSearchTemplatesUsesDescriptionAndRanksName(t *testing.T) {
	templatesCacheMu.Lock()
	original := TEMPLATES_CACHE
	TEMPLATES_CACHE = []Template{
		{Name: "Inspect logs", Place: "ops/logs", Description: "Read service deployment output"},
		{Name: "Deploy worker", Place: "deploy/worker", Description: "Release a worker"},
		{Name: "Worker status", Place: "ops/worker", Description: "Inspect a deployed worker"},
	}
	templatesCacheMu.Unlock()
	t.Cleanup(func() {
		templatesCacheMu.Lock()
		TEMPLATES_CACHE = original
		templatesCacheMu.Unlock()
	})

	results := SearchTemplates("deploy worker", 10)
	if len(results) != 2 {
		t.Fatalf("SearchTemplates() returned %d results, want 2: %#v", len(results), results)
	}
	if results[0].Place != "deploy/worker" {
		t.Fatalf("first result = %q, want deploy/worker", results[0].Place)
	}
	if results[1].Place != "ops/worker" {
		t.Fatalf("second result = %q, want ops/worker", results[1].Place)
	}
}

func TestSearchTemplatesLimitsResultsAndFindsVariables(t *testing.T) {
	templatesCacheMu.Lock()
	original := TEMPLATES_CACHE
	TEMPLATES_CACHE = []Template{
		{Name: "First", Place: "first", Variables: []TemplateVariable{{Name: "Environment", Value: "environment"}}},
		{Name: "Second", Place: "second", Variables: []TemplateVariable{{Name: "Environment", Value: "environment"}}},
	}
	templatesCacheMu.Unlock()
	t.Cleanup(func() {
		templatesCacheMu.Lock()
		TEMPLATES_CACHE = original
		templatesCacheMu.Unlock()
	})

	results := SearchTemplates("environment", 1)
	if len(results) != 1 {
		t.Fatalf("SearchTemplates() returned %d results, want 1", len(results))
	}
}

func TestInitTemplatesFillsMissingDefaultDescription(t *testing.T) {
	originalProfilePath := cfg.PROFILE_PATH_CACHE
	cfg.PROFILE_PATH_CACHE = t.TempDir()
	t.Cleanup(func() { cfg.PROFILE_PATH_CACHE = originalProfilePath })

	shPath := filepath.Join(GetTemplatesPath(), "sh")
	if err := os.MkdirAll(shPath, 0700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(shPath, TEMPALTE_NAME), []byte(`{"name":"sh","variables":[],"isPty":true}`), 0600); err != nil {
		t.Fatal(err)
	}
	customCommand := "echo custom"
	if err := os.WriteFile(filepath.Join(shPath, COMMAND_NAME), []byte(customCommand), 0600); err != nil {
		t.Fatal(err)
	}

	InitTemplates()
	template, err := ReadTemplate("sh")
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(template.Description, "interactive shell") {
		t.Fatalf("description = %q, want built-in shell description", template.Description)
	}
	if template.Command != customCommand {
		t.Fatalf("command = %q, want existing command %q", template.Command, customCommand)
	}
}
