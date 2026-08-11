# Task templates

A template consists of `template.json` and a `command.sh` file in its template
directory. The editor manages both files through the application UI.

## Variables

Each variable has a human-readable `name` and a machine-readable `value`. The
editor calls the latter **Key**. Keys must start with a lowercase letter and may
contain only lowercase letters, numbers, and underscores:

```text
[a-z][a-z0-9_]*
```

Keys must also be unique within a template.

For example, this select variable has the key `environment`:

```json
{
  "name": "Environment",
  "value": "environment",
  "type": "select",
  "options": ["development", "staging", "production"],
  "defaultValue": "staging"
}
```

The variable types currently supported by the UI are:

- `text`, which is also used when `type` is omitted;
- `select`, whose `options` contains the allowed values.

## Using variables in commands

Commands receive resolved template values as environment variables. The name is
`TASK_VAR_` followed by the uppercase key:

```text
environment -> TASK_VAR_ENVIRONMENT
container_image -> TASK_VAR_CONTAINER_IMAGE
```

Use the syntax appropriate for the configured command runner:

```sh
# sh
deploy-tool --environment "$TASK_VAR_ENVIRONMENT"
```

```powershell
# PowerShell
deploy-tool --environment $env:TASK_VAR_ENVIRONMENT
```

```bat
:: cmd.exe
deploy-tool --environment "%TASK_VAR_ENVIRONMENT%"
```

Quote shell expansions unless word splitting is explicitly wanted. Environment
variables keep values separate from the command template and avoid inserting
user input directly into shell source.

Resolved values are stored with queued tasks, so delayed runs, clones, and
restarts retain the variables that were selected when the task was created.

## Using variables in labels and groups

Labels and groups are text templates. Reference a variable with double braces
and the `vars` namespace:

```text
Deploy worker to {{ vars.environment }}
```

Rendering is performed in one pass. A variable value containing another
placeholder is treated as plain text and is not rendered again. A
`{{ vars.missing }}` reference causes task creation to fail instead of silently
producing a misleading label or group.

## Legacy placeholders

Existing profile templates may still use `{key}` in commands, labels, and
groups. This syntax remains supported for compatibility, but new templates
should not use it. Direct command substitution cannot safely distinguish data
from shell source, and single braces are ambiguous in shell scripts and other
languages.

When editing an old template:

1. Replace `{key}` in the command with the corresponding `TASK_VAR_KEY`
   environment variable and quote it for the active shell.
2. Replace `{key}` in labels and groups with `{{ vars.key }}`.

## Complete example

`template.json`:

```json
{
  "name": "Deploy worker",
  "label": "Deploy worker to {{ vars.environment }}",
  "group": "Deployments / {{ vars.environment }}",
  "variables": [
    {
      "name": "Environment",
      "value": "environment",
      "type": "select",
      "options": ["staging", "production"],
      "defaultValue": "staging"
    },
    {
      "name": "Container image",
      "value": "container_image",
      "defaultValue": "registry.example.com/app:latest"
    }
  ]
}
```

`command.sh`:

```sh
deploy-tool release \
  --environment "$TASK_VAR_ENVIRONMENT" \
  --image "$TASK_VAR_CONTAINER_IMAGE"
```
