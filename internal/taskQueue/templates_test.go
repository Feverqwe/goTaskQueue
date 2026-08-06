package taskQueue

import (
	"goTaskQueue/assets"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

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
