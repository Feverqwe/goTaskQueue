<div align="center">
	<img src="assets/preview.png" alt=""/>
	<h1>GoTaskQueue</h1>
	<p>
		<b>Simple task runner</b>
	</p>
	<br>
	<img src="assets/mc.png" alt=""/>
	<br>
	<br>
</div>

Build exe
---
````
go build -ldflags -H=windowsgui -trimpath -o goTaskQueue.exe
````

Build mac app
---
```
./scripts/build.mac.sh
```

Build the production UI and application
---
````
./scripts/build.sh
````

The build script compiles the UI and embeds it in the Go binary automatically.

Template variables
---

See [docs/TEMPLATES.md](docs/TEMPLATES.md) for variable types, `TASK_VAR_*`
environment variables, text placeholders, and legacy-template migration.

MCP access
---

GoTaskQueue can expose its task queue and PTY terminals to an agent through a
Streamable HTTP MCP endpoint at `/mcp`. It is disabled by default. Set a strong
Bearer token before starting the application:

```sh
export MCP_TOKEN="$(openssl rand -hex 32)"
```

Configure Codex with the same token through an environment variable:

```toml
[mcp_servers.gotaskqueue]
url = "https://tasks.example.com/mcp"
bearer_token_env_var = "GOTASKQUEUE_MCP_TOKEN"
default_tools_approval_mode = "writes"
```

The MCP server can search, create, update, and delete documented templates;
create and follow tasks; read incremental logs; rerun or stop tasks; and send
input or resize messages to PTY tasks. A PTY shell has the same effective access
as the operating-system user running GoTaskQueue. Treat the MCP token like an
SSH credential, expose the endpoint only over trusted HTTPS, and do not run
GoTaskQueue as root.

Install the optional [GoTaskQueue skill](skills/gotaskqueue/SKILL.md) to teach
Codex the template, task lifecycle, and interactive-terminal workflow.

File icon, use rsrc 
---
````
.\rsrc_windows_amd64.exe -ico .\icon.ico -o FILE.syso
````
