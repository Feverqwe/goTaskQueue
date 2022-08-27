package internal

import "strings"

func EscapeHtmlInJson(content string) string {
	content = strings.Replace(content, ">", "\\u003e", -1)
	content = strings.Replace(content, "&", "\\u0026", -1)
	content = strings.Replace(content, "<", "\\u003c", -1)
	content = strings.Replace(content, "\u2028", "\\u2028", -1)
	content = strings.Replace(content, "\u2029", "\\u2029", -1)
	return content
}
