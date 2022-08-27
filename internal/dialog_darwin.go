//go:build darwin

package internal

import (
	"context"
	"errors"
	"os"
	"strings"

	"github.com/gabyx/githooks/githooks/apps/dialog/gui"
	"github.com/gabyx/githooks/githooks/apps/dialog/settings"
)

func ShowFolderSelection(title string, root string) (string, error) {
	props := settings.FileSelection{}
	props.Title = title
	props.OnlyDirectories = true
	if stat, err := os.Lstat(root); err == nil && stat.IsDir() {
		props.Root = root
	}

	result, err := gui.ShowFileSelection(context.TODO(), &props)
	if err != nil {
		return "", err
	} else if result.IsOk() && len(result.Paths) > 0 {
		path := result.Paths[0]
		path = strings.Trim(path, "\n")
		return path, nil
	}
	return "", errors.New("Canceled")
}

func ShowEntry(title string, text string, defaultValue string) (string, error) {
	props := settings.Entry{}
	props.DefaultCancel = true
	props.DefaultEntry = defaultValue
	props.Title = title
	props.Text = text

	result, err := gui.ShowEntry(context.TODO(), &props)
	if err != nil {
		return "", err
	} else if result.IsOk() {
		return result.Text, nil
	}
	return "", errors.New("Canceled")
}
