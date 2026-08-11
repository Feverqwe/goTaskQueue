# Instructions for AI agents

## Project overview

GoTaskQueue is a cross-platform desktop task runner. The Go application owns the
task queue, process execution, persistence, HTTP API, WebSocket log streaming,
and system tray integration. The React/TypeScript application in `tq-ui/` is the
browser UI served by the Go binary.

Read these files before making a non-trivial change:

- `docs/ARCHITECTURE.md` for component boundaries and data flow.
- `docs/DEVELOPMENT.md` for build, test, and local-run commands.

## Repository map

- `main.go`: application entry point, server lifecycle, WebSocket endpoint, and
  static UI serving.
- `internal/api.go`: JSON HTTP API.
- `internal/taskQueue/`: queue persistence, task lifecycle, templates, and logs.
- `internal/cfg/`: profile location and persisted application configuration.
- `internal/logStore/`, `internal/gzBuffer/`, `internal/memStorage/`: storage
  implementations.
- `internal/{dialogs,mutex,powerCtr,trayIcon}/`: platform-specific integration.
- `tq-ui/src/`: React/TypeScript UI.
- `assets/templates/`: built-in task templates.
- `assets/embed.go`: standard-library embedding for the UI, templates, and icon.
- `scripts/`: build and packaging scripts.

## Working rules

- Preserve the Go module path `goTaskQueue` unless the task explicitly changes
  the module identity.
- Keep platform-specific implementations in files with `_darwin.go`,
  `_linux.go`, or `_windows.go` suffixes.
- Treat persisted JSON and API payloads as compatibility-sensitive. Avoid
  renaming JSON fields or changing their meaning without handling existing
  profiles and updating both Go and TypeScript types.
- When changing an API endpoint, update `internal/api.go`,
  `tq-ui/src/tools/api.ts`, and the relevant types/call sites together.
- Queue and task state is accessed by multiple goroutines. Preserve locking,
  atomic writes, and notification behavior when changing lifecycle code.
- Production Go builds stage the UI in `assets/www` before compiling. Use
  `scripts/build.ui.sh` when a standalone staged UI is needed; see
  `docs/DEVELOPMENT.md`.
- Use Node.js 24 for UI work. Run `nvm use` from the repository root to select
  the version pinned in `.nvmrc` before installing dependencies or running UI
  checks.
- Use Storybook as the default isolated environment for visual UI work. Add or
  update stories for reusable components whose rendered states change, then
  inspect the relevant stories at both desktop and narrow viewport widths.
- Keep stories deterministic and independent of the Go server. Represent
  loading, empty, error, disabled, and other important states with story args or
  local mocks instead of live API calls.
- Do not commit `tq-ui/node_modules/`, `tq-ui/dist/`, `assets/www/`,
  `tq-ui/storybook-static/`, `internal/logStore/test/`, local profile data,
  logs, lock files, or compiled binaries. The log-store tests currently leave
  their fixture directory behind.
- Keep changes focused. Do not reformat unrelated Go or TypeScript files.
- Add or update tests for behavior changes where practical. Existing Go tests
  use the standard `testing` package.

## Required validation

Run the checks relevant to the files changed:

```sh
# Go changes (from the repository root)
gofmt -w <changed-go-files>
./scripts/build.ui.sh # required once in a clean checkout for go:embed
go test ./...

# UI changes
nvm use # from the repository root
cd tq-ui
npm run tsc
npm run lint
npm run build
npm run build-storybook # required for changes that affect rendered UI
```

For visual changes, also run `npm run storybook`, open the relevant stories,
and check the layout at desktop and narrow viewport widths. Report which stories
and states were inspected in the handoff.

For a cross-layer change, run both Go and UI checks. If a command cannot be run,
state which command was skipped and why in the handoff.
