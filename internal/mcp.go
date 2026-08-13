package internal

import (
	"context"
	"crypto/subtle"
	"net/http"
	"slices"
	"strings"
	"time"

	"goTaskQueue/internal/taskQueue"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

type mcpSearchTemplatesInput struct {
	Query string `json:"query,omitempty" jsonschema:"Words to find in template names, descriptions, paths, IDs, and variable names. Omit to browse templates."`
	Limit int    `json:"limit,omitempty" jsonschema:"Maximum templates to return, from 1 to 100; defaults to 20"`
}

type mcpGetTemplateInput struct {
	ID    string `json:"id,omitempty" jsonschema:"Exact template ID returned by templates_search"`
	Place string `json:"place,omitempty" jsonschema:"Exact template place returned by templates_search. Use when the template has no ID."`
}

type mcpTemplateVariable struct {
	Name         string   `json:"name" jsonschema:"Human-readable label shown when asking for the variable value, for example Environment"`
	Value        string   `json:"value" jsonschema:"Unique machine-readable key matching [a-z][a-z0-9_]*, for example environment. task_start uses this key in variables; commands receive it uppercased as TASK_VAR_ENVIRONMENT; label and group use {{ vars.environment }}."`
	DefaultValue string   `json:"defaultValue,omitempty" jsonschema:"Value used when task_start omits this key. For select variables, set this to one of options (normally the first option)."`
	Type         string   `json:"type,omitempty" jsonschema:"Variable input type: text (or omitted) accepts free-form text; select presents the values in options."`
	Options      []string `json:"options,omitempty" jsonschema:"Allowed choices for a select variable. Provide at least one unique value for type select; omit for text."`
}

type mcpTemplate struct {
	Place            string                `json:"place" jsonschema:"Slash-separated path relative to the profile templates directory, for example deploy/worker. The template is stored in this directory and its command runs with this directory as the working directory."`
	Command          string                `json:"command" jsonschema:"Command source passed to the configured runner. Read variables from TASK_VAR_<UPPERCASE_KEY> environment variables and quote shell expansions. Do not use {{ vars.key }} in commands."`
	Name             string                `json:"name" jsonschema:"Required human-readable template name shown in the UI and template search."`
	Description      string                `json:"description,omitempty" jsonschema:"Explain what the template does, when to use it, where results appear, and important side effects so agents can select it safely."`
	ID               string                `json:"id,omitempty" jsonschema:"Optional stable exact identifier for template_get and task_start. Keep it unique when set; place can always identify the template."`
	Variables        []mcpTemplateVariable `json:"variables" jsonschema:"Variable definitions. Keys must be unique. Values supplied by task_start override defaultValue and resolved values are stored with the created task."`
	Label            string                `json:"label,omitempty" jsonschema:"Task label. Insert variables with {{ vars.key }}; unknown keys make task creation fail. Rendering is one pass, so variable values are treated as plain text."`
	Group            string                `json:"group,omitempty" jsonschema:"Task group. Insert variables with {{ vars.key }}; unknown keys make task creation fail. Rendering is one pass."`
	IsPty            bool                  `json:"isPty,omitempty" jsonschema:"Run inside a pseudo-terminal for interactive or full-screen programs. Use task_screen and task_input for interactive PTY tasks."`
	IsOnlyCombined   bool                  `json:"isOnlyCombined,omitempty" jsonschema:"Store and expose combined stdout/stderr only instead of also keeping separate stdout and stderr streams."`
	IsSingleInstance bool                  `json:"isSingleInstance,omitempty" jsonschema:"Reject starting another active task from the same template place."`
	IsStartOnBoot    bool                  `json:"isStartOnBoot,omitempty" jsonschema:"Clone and run one queued task for this template place when GoTaskQueue starts."`
	IsWriteLogs      bool                  `json:"isWriteLogs,omitempty" jsonschema:"Persist task output to the configured log directory so it survives process restarts."`
	TTL              int64                 `json:"ttl,omitempty" jsonschema:"Seconds to retain a successfully finished task before automatic cleanup. Zero disables TTL cleanup; errors and canceled tasks are not TTL-cleaned."`
}

func (t mcpTemplate) taskQueueTemplate() taskQueue.Template {
	variables := make([]taskQueue.TemplateVariable, len(t.Variables))
	for i, variable := range t.Variables {
		variables[i] = taskQueue.TemplateVariable{
			Name: variable.Name, Value: variable.Value, DefaultValue: variable.DefaultValue,
			Type: variable.Type, Options: variable.Options,
		}
	}
	return taskQueue.Template{
		Place: t.Place, Command: t.Command, Name: t.Name, Description: t.Description,
		Id: t.ID, Variables: variables,
		NewTaskBase: taskQueue.NewTaskBase{
			Label: t.Label, Group: t.Group, IsPty: t.IsPty, IsOnlyCombined: t.IsOnlyCombined,
			IsSingleInstance: t.IsSingleInstance, IsStartOnBoot: t.IsStartOnBoot,
			IsWriteLogs: t.IsWriteLogs, TTL: t.TTL,
		},
	}
}

type mcpCreateTemplateInput struct {
	Template mcpTemplate `json:"template" jsonschema:"Complete template definition. The command is stored but not run."`
}

type mcpUpdateTemplateInput struct {
	CurrentPlace string      `json:"current_place" jsonschema:"Exact current template place returned by templates_search or template_get"`
	Template     mcpTemplate `json:"template" jsonschema:"Complete replacement template definition. Set template.place to a different place to move the template while updating it."`
}

type mcpTemplatePlaceInput struct {
	Place string `json:"place" jsonschema:"Exact template place returned by templates_search or template_get"`
}

type mcpListTasksInput struct {
	Query  string   `json:"query,omitempty" jsonschema:"Case-insensitive text to find in task ID, label, group, or template place"`
	States []string `json:"states,omitempty" jsonschema:"Optional states: IDLE, STARTED, FINISHED, ERROR, or CANCELED"`
	Limit  int      `json:"limit,omitempty" jsonschema:"Maximum newest tasks to return, from 1 to 100; defaults to 20"`
}

type mcpCleanupTasksInput struct {
	Statuses []string `json:"statuses" jsonschema:"Task states to delete: FINISHED, CANCELED, and/or ERROR. An empty list deletes nothing."`
}

type mcpTaskIDInput struct {
	ID string `json:"id" jsonschema:"Exact task ID returned by task_start, task_rerun, tasks_list, or task_get"`
}

type mcpStartTaskInput struct {
	TemplateID    string            `json:"template_id,omitempty" jsonschema:"Exact template ID returned by templates_search"`
	TemplatePlace string            `json:"template_place,omitempty" jsonschema:"Exact template place returned by templates_search. Use when the template has no ID."`
	Variables     map[string]string `json:"variables,omitempty" jsonschema:"Template variable values keyed by their machine-readable variable names"`
}

type mcpTaskOutputInput struct {
	ID       string `json:"id" jsonschema:"Exact task ID"`
	Cursor   *int64 `json:"cursor,omitempty" jsonschema:"next_cursor returned by the previous read. Omit for recent history or the current PTY screen."`
	MaxBytes int    `json:"max_bytes,omitempty" jsonschema:"Maximum incremental output bytes, from 1 to 262144; defaults to 65536"`
}

type mcpTaskTailInput struct {
	ID       string `json:"id" jsonschema:"Exact task ID"`
	Lines    int    `json:"lines,omitempty" jsonschema:"Number of trailing lines to return, from 1 to 1000; defaults to 100"`
	MaxBytes int    `json:"max_bytes,omitempty" jsonschema:"Maximum bytes to inspect from the end of the log, from 1 to 262144; defaults to 65536. A very long line may be truncated."`
}

type mcpFollowTaskInput struct {
	ID          string `json:"id" jsonschema:"Exact task ID"`
	Cursor      *int64 `json:"cursor,omitempty" jsonschema:"next_cursor returned by the previous read. Omit for recent history or the current PTY screen."`
	WaitSeconds int    `json:"wait_seconds,omitempty" jsonschema:"Long-poll timeout from 0 to 30 seconds; defaults to 5"`
	SettleMs    *int   `json:"settle_ms,omitempty" jsonschema:"After output starts, wait for this many quiet milliseconds before returning, from 0 to 2000; defaults to 250"`
	MaxBytes    int    `json:"max_bytes,omitempty" jsonschema:"Maximum incremental output bytes, from 1 to 262144; defaults to 65536"`
}

type mcpTaskInputInput struct {
	ID     string `json:"id" jsonschema:"Exact running task ID"`
	Text   string `json:"text,omitempty" jsonschema:"Text to send to the task. Use submit to append Enter."`
	Key    string `json:"key,omitempty" jsonschema:"Special key: ENTER, TAB, ESCAPE, BACKSPACE, CTRL_C, CTRL_D, ARROW_UP, ARROW_DOWN, ARROW_LEFT, or ARROW_RIGHT. Use either key or text."`
	Submit bool   `json:"submit,omitempty" jsonschema:"Append Enter after text. Do not combine with key."`
}

type mcpResizeTaskInput struct {
	ID   string `json:"id" jsonschema:"Exact running PTY task ID"`
	Cols int    `json:"cols" jsonschema:"Terminal width from 1 to 1000 columns"`
	Rows int    `json:"rows" jsonschema:"Terminal height from 1 to 1000 rows"`
}

type mcpTemplatesOutput struct {
	Templates []taskQueue.Template `json:"templates"`
}

type mcpTemplateOutput struct {
	Template taskQueue.Template `json:"template"`
}

type mcpTasksOutput struct {
	Tasks []taskQueue.TaskSummary `json:"tasks"`
}

type mcpTaskOutput struct {
	Task *taskQueue.Task `json:"task"`
}

type mcpStatusOutput struct {
	Status string `json:"status"`
	ID     string `json:"id,omitempty"`
}

// HandleMCP mounts a bearer-token protected Streamable HTTP MCP endpoint on
// the running GoTaskQueue server.
func HandleMCP(router *Router, service *TaskService, token, version string) {
	server := newMCPServer(service, version)
	handler := mcp.NewStreamableHTTPHandler(
		func(*http.Request) *mcp.Server { return server },
		&mcp.StreamableHTTPOptions{
			Stateless:                    true,
			JSONResponse:                 true,
			MaxRequestBodyBytes:          1 << 20,
			PropagateRequestCancellation: true,
		},
	)
	router.All("/mcp", requireMCPBearerToken(token, handler).ServeHTTP)
}

func newMCPServer(service *TaskService, version string) *mcp.Server {
	server := mcp.NewServer(
		&mcp.Implementation{Name: "GoTaskQueue", Version: version},
		&mcp.ServerOptions{Instructions: strings.TrimSpace(`
GoTaskQueue runs commands as persistent tasks, optionally inside a pseudo-terminal (PTY). Prefer a documented template over an interactive shell when one matches the user's intent. Use templates_search first and resolve an exact template ID or place; never guess identifiers.

Template variables have a human-readable name and a unique lowercase key in value matching [a-z][a-z0-9_]*. task_start.variables is keyed by value; omitted values use defaultValue, and resolved values are stored with the queued task. Commands receive each valid key as TASK_VAR_<UPPERCASE_KEY>: use "$TASK_VAR_ENVIRONMENT" in POSIX shell, $env:TASK_VAR_ENVIRONMENT in PowerShell, or "%TASK_VAR_ENVIRONMENT%" in cmd.exe. Quote expansions unless splitting is intentional. Commands run in the template directory. Use {{ vars.key }} only in label and group, where rendering is one pass and unknown keys fail task creation. Do not put {{ vars.key }} in command source. type text (or omitted) is free-form; type select must provide options and defaultValue should be one of them. Legacy {key} placeholders remain readable for compatibility but must not be introduced in new or updated templates.

template_create stores a new template without running it. Before template_update, read the current template with template_get and send its complete replacement definition; current_place identifies the existing template, while template.place may relocate it. Document purpose, selection criteria, outputs, and side effects in description.

task_start creates and immediately runs a task, while task_rerun clones the exact stored configuration of an existing task. Use task_tail for a compact read of the last lines, task_screen when only the current plain-text PTY viewport is needed, task_output for an immediate incremental read, or task_follow for bounded long polling. Continue incremental reads from next_cursor. PTY incremental output may include ANSI control sequences. Read the current task output or screen before sending input, send one command or response at a time with task_input, then read again. Use CTRL_C before task_stop when merely interrupting a foreground command.

Do not create or update templates, retry failed tasks, stop running tasks, or send terminal input unless the user requested the corresponding action. template_delete irreversibly removes a template and its stored command. task_delete and tasks_cleanup irreversibly remove queued tasks and their persisted logs; obtain explicit confirmation immediately before calling any of these deletion tools. Templates and shell commands can change the host or external systems with the permissions of the GoTaskQueue process.`)},
	)

	mcp.AddTool(server, readOnlyMCPTool("templates_search", "Search and rank task templates by name, description, path, ID, and variables."),
		func(ctx context.Context, _ *mcp.CallToolRequest, input mcpSearchTemplatesInput) (*mcp.CallToolResult, mcpTemplatesOutput, error) {
			return nil, mcpTemplatesOutput{Templates: service.SearchTemplates(input.Query, input.Limit)}, nil
		})

	mcp.AddTool(server, readOnlyMCPTool("template_get", "Get one template by its exact ID or place, including its command, description, variables, and execution settings."),
		func(ctx context.Context, _ *mcp.CallToolRequest, input mcpGetTemplateInput) (*mcp.CallToolResult, mcpTemplateOutput, error) {
			template, err := service.GetTemplate(input.ID, input.Place)
			if template == nil {
				return nil, mcpTemplateOutput{}, err
			}
			return nil, mcpTemplateOutput{Template: *template}, err
		})

	mcp.AddTool(server, localWriteMCPTool("template_create", "Create and persist a new task template. This stores the command but does not run it; the place must not already exist.", false, false),
		func(ctx context.Context, _ *mcp.CallToolRequest, input mcpCreateTemplateInput) (*mcp.CallToolResult, mcpTemplateOutput, error) {
			template, err := service.CreateTemplate(input.Template.taskQueueTemplate())
			if template == nil {
				return nil, mcpTemplateOutput{}, err
			}
			return nil, mcpTemplateOutput{Template: *template}, err
		})

	mcp.AddTool(server, localWriteMCPTool("template_update", "Replace an existing task template and optionally move it to a new place. This stores the command but does not run it.", true, false),
		func(ctx context.Context, _ *mcp.CallToolRequest, input mcpUpdateTemplateInput) (*mcp.CallToolResult, mcpTemplateOutput, error) {
			template, err := service.UpdateTemplate(input.CurrentPlace, input.Template.taskQueueTemplate())
			if template == nil {
				return nil, mcpTemplateOutput{}, err
			}
			return nil, mcpTemplateOutput{Template: *template}, err
		})

	mcp.AddTool(server, localWriteMCPTool("template_delete", "Permanently remove a task template and its stored command. Confirm with the user immediately before calling.", true, false),
		func(ctx context.Context, _ *mcp.CallToolRequest, input mcpTemplatePlaceInput) (*mcp.CallToolResult, mcpStatusOutput, error) {
			err := service.DeleteTemplate(input.Place)
			return nil, mcpStatusOutput{Status: "ok"}, err
		})

	mcp.AddTool(server, readOnlyMCPTool("tasks_list", "List newest tasks with optional state and text filters."),
		func(ctx context.Context, _ *mcp.CallToolRequest, input mcpListTasksInput) (*mcp.CallToolResult, mcpTasksOutput, error) {
			return nil, mcpTasksOutput{Tasks: filterTaskSummaries(service.ListTasks(), input)}, nil
		})

	mcp.AddTool(server, localWriteMCPTool("tasks_cleanup", "Permanently remove all tasks in the selected FINISHED, CANCELED, and/or ERROR states, including their persisted logs. Confirm with the user immediately before calling.", true, true),
		func(ctx context.Context, _ *mcp.CallToolRequest, input mcpCleanupTasksInput) (*mcp.CallToolResult, mcpStatusOutput, error) {
			err := service.CleanupTasks(input.Statuses)
			return nil, mcpStatusOutput{Status: "ok"}, err
		})

	mcp.AddTool(server, readOnlyMCPTool("task_get", "Get one task by its exact ID, including command, resolved variables, status, links, and assets."),
		func(ctx context.Context, _ *mcp.CallToolRequest, input mcpTaskIDInput) (*mcp.CallToolResult, mcpTaskOutput, error) {
			task, err := service.GetTask(input.ID)
			return nil, mcpTaskOutput{Task: task}, err
		})

	mcp.AddTool(server, openWorldWriteMCPTool("task_start", "Create and immediately run a task from an exact template. The template command may change the host or external systems.", true, false),
		func(ctx context.Context, _ *mcp.CallToolRequest, input mcpStartTaskInput) (*mcp.CallToolResult, mcpTaskOutput, error) {
			task, err := service.AddTask(AddTaskInput{
				TemplateId: input.TemplateID, TemplatePlace: input.TemplatePlace,
				Variables: input.Variables, IsRun: true,
			})
			return nil, mcpTaskOutput{Task: task}, err
		})

	mcp.AddTool(server, openWorldWriteMCPTool("task_rerun", "Clone an existing task's exact stored command and variables, then run the clone.", true, false),
		func(ctx context.Context, _ *mcp.CallToolRequest, input mcpTaskIDInput) (*mcp.CallToolResult, mcpTaskOutput, error) {
			task, err := service.CloneTask(input.ID, true)
			return nil, mcpTaskOutput{Task: task}, err
		})

	mcp.AddTool(server, readOnlyMCPTool("task_output", "Read immediately available incremental output and the current plain-text PTY screen."),
		func(ctx context.Context, _ *mcp.CallToolRequest, input mcpTaskOutputInput) (*mcp.CallToolResult, TaskOutput, error) {
			output, err := service.TaskOutput(ctx, input.ID, mcpCursor(input.Cursor), 0, 0, input.MaxBytes)
			return nil, output, err
		})

	mcp.AddTool(server, readOnlyMCPTool("task_tail", "Read the last N lines from the end of a task's combined log without scanning the entire log."),
		func(ctx context.Context, _ *mcp.CallToolRequest, input mcpTaskTailInput) (*mcp.CallToolResult, TaskTail, error) {
			output, err := service.TaskTail(input.ID, input.Lines, input.MaxBytes)
			return nil, output, err
		})

	mcp.AddTool(server, readOnlyMCPTool("task_screen", "Read only the current plain-text viewport of a PTY task, without returning its incremental log or ANSI snapshot."),
		func(ctx context.Context, _ *mcp.CallToolRequest, input mcpTaskIDInput) (*mcp.CallToolResult, TaskScreen, error) {
			output, err := service.TaskScreen(input.ID)
			return nil, output, err
		})

	mcp.AddTool(server, readOnlyMCPTool("task_follow", "Wait up to 30 seconds for task output or a status change, returning a continuation cursor and PTY screen."),
		func(ctx context.Context, _ *mcp.CallToolRequest, input mcpFollowTaskInput) (*mcp.CallToolResult, TaskOutput, error) {
			waitSeconds := input.WaitSeconds
			if waitSeconds == 0 {
				waitSeconds = 5
			}
			settleMs := 250
			if input.SettleMs != nil {
				settleMs = *input.SettleMs
			}
			output, err := service.TaskOutput(ctx, input.ID, mcpCursor(input.Cursor), time.Duration(waitSeconds)*time.Second, time.Duration(settleMs)*time.Millisecond, input.MaxBytes)
			return nil, output, err
		})

	mcp.AddTool(server, openWorldWriteMCPTool("task_input", "Send text or a special key to a running task's stdin or PTY. Read current output first; submitted shell commands may change the host or external systems.", true, false),
		func(ctx context.Context, _ *mcp.CallToolRequest, input mcpTaskInputInput) (*mcp.CallToolResult, mcpStatusOutput, error) {
			err := service.SendTaskInput(input.ID, input.Text, input.Key, input.Submit)
			return nil, mcpStatusOutput{Status: "ok", ID: input.ID}, err
		})

	mcp.AddTool(server, localWriteMCPTool("task_resize", "Resize a running PTY task. This changes terminal rendering but not the command itself.", false, true),
		func(ctx context.Context, _ *mcp.CallToolRequest, input mcpResizeTaskInput) (*mcp.CallToolResult, mcpStatusOutput, error) {
			err := service.ResizeTask(input.ID, taskQueue.PtyScreenSize{Cols: input.Cols, Rows: input.Rows})
			return nil, mcpStatusOutput{Status: "ok", ID: input.ID}, err
		})

	mcp.AddTool(server, openWorldWriteMCPTool("task_stop", "Force-stop a running task and its process tree.", true, false),
		func(ctx context.Context, _ *mcp.CallToolRequest, input mcpTaskIDInput) (*mcp.CallToolResult, mcpStatusOutput, error) {
			err := service.StopTask(input.ID)
			return nil, mcpStatusOutput{Status: "ok", ID: input.ID}, err
		})

	mcp.AddTool(server, localWriteMCPTool("task_delete", "Permanently remove an idle or finished task and its persisted logs. Confirm with the user immediately before calling.", true, false),
		func(ctx context.Context, _ *mcp.CallToolRequest, input mcpTaskIDInput) (*mcp.CallToolResult, mcpStatusOutput, error) {
			err := service.DeleteTask(input.ID)
			return nil, mcpStatusOutput{Status: "ok", ID: input.ID}, err
		})

	return server
}

func mcpCursor(cursor *int64) int64 {
	if cursor == nil {
		return -1
	}
	return *cursor
}

func filterTaskSummaries(tasks []*taskQueue.Task, input mcpListTasksInput) []taskQueue.TaskSummary {
	limit := input.Limit
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	query := strings.ToLower(strings.TrimSpace(input.Query))
	states := make([]string, 0, len(input.States))
	for _, state := range input.States {
		states = append(states, strings.ToUpper(state))
	}

	result := make([]taskQueue.TaskSummary, 0, limit)
	for i := len(tasks) - 1; i >= 0 && len(result) < limit; i-- {
		summary := tasks[i].Summary()
		if len(states) > 0 && !slices.Contains(states, summary.State) {
			continue
		}
		searchText := strings.ToLower(strings.Join([]string{
			summary.Id, summary.Label, summary.Group, summary.TemplatePlace,
		}, " "))
		if query != "" && !strings.Contains(searchText, query) {
			continue
		}
		result = append(result, summary)
	}
	return result
}

func requireMCPBearerToken(token string, next http.Handler) http.Handler {
	expected := []byte("Bearer " + token)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		actual := []byte(r.Header.Get("Authorization"))
		if len(actual) != len(expected) || subtle.ConstantTimeCompare(actual, expected) != 1 {
			w.Header().Set("WWW-Authenticate", `Bearer realm="GoTaskQueue MCP"`)
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func readOnlyMCPTool(name, description string) *mcp.Tool {
	openWorld := false
	return &mcp.Tool{
		Name: name, Description: description,
		Annotations: &mcp.ToolAnnotations{ReadOnlyHint: true, IdempotentHint: true, OpenWorldHint: &openWorld},
	}
}

func localWriteMCPTool(name, description string, destructive, idempotent bool) *mcp.Tool {
	return writeMCPTool(name, description, destructive, idempotent, false)
}

func openWorldWriteMCPTool(name, description string, destructive, idempotent bool) *mcp.Tool {
	return writeMCPTool(name, description, destructive, idempotent, true)
}

func writeMCPTool(name, description string, destructive, idempotent, openWorld bool) *mcp.Tool {
	return &mcp.Tool{
		Name: name, Description: description,
		Annotations: &mcp.ToolAnnotations{
			DestructiveHint: &destructive, IdempotentHint: idempotent, OpenWorldHint: &openWorld,
		},
	}
}
