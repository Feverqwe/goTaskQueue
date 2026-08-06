package assets

import "embed"

// Files contains the production UI, built-in task templates, and tray icon.
//
//go:embed icon.ico templates www
var Files embed.FS
