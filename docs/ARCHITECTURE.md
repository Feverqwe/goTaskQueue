# Architecture

## Runtime shape

GoTaskQueue is one native process with an embedded web application:

```text
React UI
  |-- JSON requests ----------> /api/*
  |-- terminal input/resize --> /ws?id=<task-id>
  <-- initial state + assets --- Go HTTP server
  <-- task log chunks ---------- WebSocket
                                  |
                                  v
                              taskQueue.Queue
                                  |
                         OS processes and PTYs
                                  |
                   profile config, queue, and logs
```

`main.go` loads the configuration and templates, restores the queue, starts the
HTTP server, runs boot tasks, schedules cleanup, and starts the tray integration.
The server uses the small router in `internal/router.go` rather than an external
HTTP framework.

## Backend boundaries

### Configuration and profile

`internal/cfg` reads and writes `config.json`. The profile directory is selected
by `PROFILE_PLACE` when set; otherwise it is platform-dependent. Queue state is
stored as `queue.json` in that profile, and logs are stored under the configured
log folder. Writes of important persisted JSON use atomic replacement.

The default process launcher is `sh -c` on Unix and `cmd /C` on Windows. PTY and
non-PTY execution have separate configuration fields and code paths.

### Queue and task lifecycle

`internal/taskQueue.Queue` owns the ordered task slice and the ID lookup map.
Mutations trigger asynchronous persistence. A `Task` runs either directly with
stdout/stderr pipes or through a PTY. Task status, timestamps, output stores,
links, and assets are exposed to the UI as JSON where applicable.

Tasks can outlive an HTTP request. Code in this package is concurrent: process
waiters, output readers, WebSocket readers, cleanup, and persistence may operate
at the same time. Changes must preserve mutex coverage and must not block queue
notification channels indefinitely.

PTY output is also fed into a bounded headless xterm instance. The persisted
combined log remains the raw byte stream, while the headless terminal provides
a compact snapshot of the current normal/alternate screen for browser attach.

### API and streaming

`internal/api.go` registers `/api/*` endpoints. Successful responses use a
`result` envelope and failures use an `error` envelope. Unknown API routes fall
through to a 403 response.

`/ws?id=<task-id>` streams combined terminal output. Server frames begin with
`h` for history (a serialized screen snapshot for PTY tasks) or `a` for current
data. Client messages begin with `i` for terminal input or `r` for a JSON-encoded
PTY resize request. Active PTY connections wait briefly for the initial resize
before creating their snapshot. Keep this protocol compatible when modifying
either side.

### Templates and embedded assets

Built-in templates live in `assets/templates/`; profile templates are combined
with them by `internal/taskQueue/templates.go`. A template consists of metadata
(`template.json`) and, commonly, a command file.

Template variables are passed to commands through `TASK_VAR_*` environment
variables. Labels and groups use `{{ vars.key }}` text placeholders. The full
format and compatibility rules are documented in [TEMPLATES.md](TEMPLATES.md).

Production UI files are generated into `tq-ui/dist`, copied to `assets/www`, and
embedded by the Go standard library through `assets/embed.go`. The production
build script stages the UI before compiling the binary. In development mode
(`DEBUG_UI=1`), the Go server reads `tq-ui/dist` directly instead.

## Frontend boundaries

The UI entry point is `tq-ui/src/index.tsx`. Shared API calls are centralized in
`tq-ui/src/tools/api.ts`, while wire and view types live in
`tq-ui/src/components/types.ts`.

The main screens are:

- `containers/TaskList/`: task list, grouping, templates, and template editing.
- `containers/TaskPage/`: task details, actions, links, and terminal/log output.
- `components/RootStore/`: server-provided initial application state.
- `components/TemplateProvider/` and `GroupStorageProvider/`: shared UI state.

React components use MUI, state uses MobX where needed, and terminal rendering
uses xterm. Rspack transpiles TypeScript and emits the browser bundle into
`tq-ui/dist`; `tsc` runs separately for type checking.

## Cross-platform code

Operating-system behavior is isolated under `internal/dialogs`,
`internal/mutex`, `internal/powerCtr`, and `internal/trayIcon`. Go filename
suffixes select the correct implementation. When adding platform behavior,
maintain a buildable implementation (or an intentional stub) for every
supported target.
