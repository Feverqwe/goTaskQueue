<div align="center">
  <img src="assets/icon.svg" width="96" height="96" alt="GoTaskQueue icon">
  <h1>GoTaskQueue</h1>
  <p>A self-hosted task runner with a native host, a browser UI, live logs, and interactive terminals.</p>
</div>

![GoTaskQueue task list](assets/preview.png)

GoTaskQueue turns commands into reusable task templates. The Go application
starts and supervises processes, persists the queue and logs, and serves the
embedded React UI. Tasks may run as regular processes or in a PTY, making the
application useful for both repeatable jobs and interactive terminal programs.

## Features

- Create, edit, organize, and run reusable command templates from the UI.
- Collect template input with text and select variables.
- Queue tasks, rerun them, stop running processes, and clean up completed work.
- Stream stdout and stderr to the browser over WebSocket.
- Run full-screen and interactive programs in a browser terminal backed by a
  real PTY.
- Group tasks, attach links and file paths, retain logs, and expire tasks with a
  configurable TTL.
- Start selected templates on boot and prevent duplicate runs with
  single-instance templates.
- Control the same queue through an optional bearer-protected MCP endpoint.
- Keep the UI, built-in templates, and runtime in one native binary.

![Midnight Commander running in a GoTaskQueue terminal](assets/mc.png)

## Quick start from source

You need Go 1.25, Node.js 24, and npm. Platform-specific desktop dependencies
may also be required for the tray integration. If you use nvm, run `nvm use`
from the repository root first to select the version pinned in `.nvmrc`.

```sh
# From the repository root
cd tq-ui
npm ci
cd ..

./scripts/build.sh
./goTaskQueue
```

On first start, GoTaskQueue creates its profile and `config.json`. The tray opens
`http://127.0.0.1:80`, while the default empty `Address` makes the server listen
on every network interface. Port 80 may require elevated privileges or already
be in use. Set `Address` to `127.0.0.1` and choose a suitable `Port` in
`config.json`, then restart the application if necessary.

Use a disposable profile while developing:

```sh
dev_profile="$(mktemp -d)"
PROFILE_PLACE="$dev_profile" ./scripts/run.sh
```

Pass `-disableTrayIcon` when running on a headless host. See
[Development](docs/DEVELOPMENT.md) for the frontend watch build, Storybook,
platform notes, and the complete validation workflow.

## Task templates

Each template is a directory containing:

```text
my-template/
├── command.sh
└── template.json
```

Templates can define a label, group, description, variables, PTY mode, log
retention, single-instance behavior, startup behavior, and a TTL. They can be
created and edited directly in the browser UI.

Resolved values are exposed to commands as `TASK_VAR_*` environment variables.
Labels and groups use `{{ vars.key }}` placeholders. For example:

```json
{
  "name": "Deploy worker",
  "label": "Deploy worker to {{ vars.environment }}",
  "group": "Deployments",
  "variables": [
    {
      "name": "Environment",
      "value": "environment",
      "type": "select",
      "options": ["staging", "production"],
      "defaultValue": "staging"
    }
  ]
}
```

```sh
deploy-tool --environment "$TASK_VAR_ENVIRONMENT"
```

The repository includes example templates for a shell, `htop`, Midnight
Commander, and `yt-dlp`. See [Task templates](docs/TEMPLATES.md) for the full
format, variable rules, and legacy-template migration guidance.

## MCP access

Set `MCP_TOKEN` before starting GoTaskQueue to enable the Streamable HTTP MCP
endpoint at `/mcp`:

```sh
export MCP_TOKEN="$(openssl rand -hex 32)"
./goTaskQueue
```

Provide the same value to Codex in a separate environment variable and add the
server to the Codex configuration:

```sh
export GOTASKQUEUE_MCP_TOKEN="<the same token>"
```

```toml
[mcp_servers.gotaskqueue]
url = "https://tasks.example.com/mcp"
bearer_token_env_var = "GOTASKQUEUE_MCP_TOKEN"
default_tools_approval_mode = "writes"
```

The MCP server supports template discovery and management, task creation and
lifecycle operations, incremental log reads, and PTY input and resize events.
The optional [GoTaskQueue skill](skills/gotaskqueue/SKILL.md) teaches Codex the
recommended task and interactive-terminal workflow.

> [!WARNING]
> Tasks and PTY sessions run with the operating-system permissions of the
> GoTaskQueue process. Treat the MCP token like an SSH credential, use trusted
> HTTPS, and never run GoTaskQueue as root. The browser UI and JSON API do not
> provide their own authentication, so do not expose them to an untrusted
> network.

## Build commands

Build the production UI and native binary:

```sh
./scripts/build.sh
```

Build and stage only the embedded UI:

```sh
./scripts/build.ui.sh
```

Create a macOS application bundle:

```sh
./scripts/build.mac.sh
```

Build a Windows GUI executable:

```powershell
go build -ldflags "-H=windowsgui" -trimpath -o goTaskQueue.exe
```

To embed the Windows icon, generate a `.syso` resource with
[`rsrc`](https://github.com/akavel/rsrc) before building:

```powershell
rsrc -ico assets/icon.ico -o goTaskQueue.syso
```

Generated UI assets are staged in `assets/www` and embedded in the Go binary by
the standard library.

For implementation details, read [Architecture](docs/ARCHITECTURE.md). For
build, test, local-run, and contribution instructions, read
[Development](docs/DEVELOPMENT.md).
