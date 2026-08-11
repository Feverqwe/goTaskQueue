package taskQueue

import (
	"fmt"
	"regexp"
	"strings"
)

var templateVariableKeyPattern = regexp.MustCompile(`^[a-z][a-z0-9_]*$`)
var templateTextVariablePattern = regexp.MustCompile(`\{\{\s*vars\.([a-z][a-z0-9_]*)\s*\}\}|\{([a-z][a-z0-9_]*)\}`)
var legacyCommandVariablePattern = regexp.MustCompile(`\{([a-z][a-z0-9_]*)\}`)

func ResolveTemplateVariables(definitions []TemplateVariable, provided map[string]string) map[string]string {
	resolved := make(map[string]string, len(definitions))
	for _, definition := range definitions {
		value, ok := provided[definition.Value]
		if !ok {
			value = definition.DefaultValue
		}
		resolved[definition.Value] = value
	}
	return resolved
}

func RenderTemplateText(text string, variables map[string]string) (string, error) {
	var renderErr error
	rendered := templateTextVariablePattern.ReplaceAllStringFunc(text, func(match string) string {
		parts := templateTextVariablePattern.FindStringSubmatch(match)
		key := parts[1]
		isCurrentSyntax := key != ""
		if !isCurrentSyntax {
			key = parts[2]
		}

		value, ok := variables[key]
		if ok {
			return value
		}
		if isCurrentSyntax && renderErr == nil {
			renderErr = fmt.Errorf("unknown template variable %q", key)
		}
		return match
	})
	return rendered, renderErr
}

func RenderLegacyCommand(command string, variables map[string]string) string {
	return legacyCommandVariablePattern.ReplaceAllStringFunc(command, func(match string) string {
		parts := legacyCommandVariablePattern.FindStringSubmatch(match)
		if value, ok := variables[parts[1]]; ok {
			return value
		}
		return match
	})
}

func templateVariableEnvName(key string) (string, bool) {
	if !templateVariableKeyPattern.MatchString(key) {
		return "", false
	}
	return "TASK_VAR_" + strings.ToUpper(key), true
}
