//go:build windows || linux

package internal

import (
	"errors"

	"github.com/ncruces/zenity"
)

func ShowFolderSelection(title string, root string) (string, error) {
	path, err := zenity.SelectFile(
		zenity.Title(title),
		zenity.Directory(),
	)
	if err != nil {
		if err.Error() == "dialog canceled" {
			return "", errors.New("Canceled")
		}
		return "", err
	} else {
		return path, nil
	}
}

func ShowEntry(title string, text string, defaultValue string) (string, error) {
	address, err := zenity.Entry(text,
		zenity.Title(title),
		zenity.EntryText(defaultValue),
	)
	if err != nil {
		if err.Error() == "dialog canceled" {
			return "", errors.New("Canceled")
		}
		return "", err
	} else {
		return address, nil
	}
}
