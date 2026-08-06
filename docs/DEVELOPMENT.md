# Development

## Prerequisites

- Go version matching `go.mod` (currently Go 1.25).
- Node.js and npm for changes under `tq-ui/` (Node.js 20.19 or newer, or
  Node.js 22.12 or newer).
- Platform libraries required by the tray and desktop dependencies.

Install frontend dependencies from the UI directory:

```sh
cd tq-ui
npm ci
```

## Validation

Backend checks run from the repository root:

```sh
go test ./...
```

The log-store tests currently leave `internal/logStore/test/` behind. Treat it as
a disposable test fixture and do not include it in a change.

`go vet ./...` currently reports a pre-existing warning for the non-standard
`ChunkReader.Seek` signature in `internal/gzBuffer/ChunkReader.go`. If you run
vet, distinguish that known warning from findings introduced by your change.

Frontend checks run from `tq-ui/` (there is no root `package.json`):

```sh
cd tq-ui
npm run tsc
npm run lint
npm run build
```

The production bundle and watch build use Rspack. Type checking is a separate
step because Rspack uses its built-in SWC transformer for TypeScript and JSX.

`npm run lint` also checks Prettier formatting. Use `npm run lint:fix` only for
files intentionally being changed.

## Local run

The application persists configuration, queue state, templates, and logs. Use a
dedicated profile while developing so a real user profile is not modified:

```sh
dev_profile="$(mktemp -d)"
PROFILE_PLACE="$dev_profile" ./scripts/run.sh
```

The default configuration binds port 80, which may require privileges or clash
with another service. After the first start, adjust `Port` and `Address` in the
generated `$dev_profile/config.json` if needed.

To serve a locally built UI from `tq-ui/dist` instead of embedded assets:

```sh
cd tq-ui
npm run dev
```

In another terminal, from the repository root:

```sh
dev_profile="$(mktemp -d)"
PROFILE_PLACE="$dev_profile" ./scripts/run.sh dev
```

The `dev` argument sets `DEBUG_UI=1`. The tray icon is enabled by default; the
binary also supports `-disableTrayIcon` for headless execution.

## Production assets and builds

Build the native binary from the repository root:

```sh
./scripts/build.sh
```

Build and stage a production UI bundle:

```sh
cd tq-ui
npm run release
cd ..
```

Then regenerate embedded resources when a production bundle or built-in
template changed:

```sh
./scripts/build.resources.sh
```

The resource script installs and invokes `go-bindata`, writes temporary files
under `assets/www`, and replaces the generated `assets/bindata.go`. Review the
generated diff; never make manual edits to `bindata.go`.

Build the macOS application bundle with:

```sh
./scripts/build.mac.sh
```

Windows build and icon-resource notes are documented in the root `README.md`.

## Change checklists

For a backend-only change:

1. Format changed Go files with `gofmt`.
2. Run focused package tests while iterating.
3. Run `go test ./...` before handoff.

For a UI-only change:

1. Keep API calls in `src/tools/api.ts` and shared wire types in
   `src/components/types.ts`.
2. Run `npm run tsc` and `npm run lint`.
3. Run `npm run build` to catch bundling errors.

For an API or task-model change, validate both layers and consider compatibility
with existing `config.json`, `queue.json`, templates, and stored logs.
