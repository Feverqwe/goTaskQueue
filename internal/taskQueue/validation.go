package taskQueue

import (
	"fmt"
	"slices"
	"strings"
	"time"
)

// MaxTTLSeconds is the largest TTL that can be converted to time.Duration.
const MaxTTLSeconds = int64((1<<63 - 1) / time.Second)

func ValidateTTL(ttl int64) error {
	if ttl < 0 || ttl > MaxTTLSeconds {
		return fmt.Errorf("ttl must be between 0 and %d seconds", MaxTTLSeconds)
	}
	return nil
}

// ValidateTemplate runs before any files are written or moved.
func ValidateTemplate(template Template) error {
	if _, err := getPlace(template.Place); err != nil {
		return err
	}
	if strings.TrimSpace(template.Name) == "" {
		return fmt.Errorf("template name is required")
	}
	if err := ValidateTTL(template.TTL); err != nil {
		return err
	}
	keys := make(map[string]bool, len(template.Variables))
	for _, variable := range template.Variables {
		if strings.TrimSpace(variable.Name) == "" {
			return fmt.Errorf("variable %q name is required", variable.Value)
		}
		if !templateVariableKeyPattern.MatchString(variable.Value) {
			return fmt.Errorf("invalid template variable key %q", variable.Value)
		}
		if keys[variable.Value] {
			return fmt.Errorf("duplicate template variable key %q", variable.Value)
		}
		keys[variable.Value] = true
		switch variable.Type {
		case "", "text":
		case "select":
			options := make(map[string]bool, len(variable.Options))
			for _, option := range variable.Options {
				if strings.TrimSpace(option) == "" || options[option] {
					return fmt.Errorf("variable %q requires nonempty unique options", variable.Value)
				}
				options[option] = true
			}
			if len(options) == 0 || !options[variable.DefaultValue] {
				return fmt.Errorf("variable %q defaultValue must be one of its options", variable.Value)
			}
		default:
			return fmt.Errorf("unsupported variable type %q", variable.Type)
		}
	}
	return nil
}

func ValidateTemplateValues(definitions []TemplateVariable, provided map[string]string) error {
	known := make(map[string]bool, len(definitions))
	for _, variable := range definitions {
		known[variable.Value] = true
		value, ok := provided[variable.Value]
		if !ok {
			value = variable.DefaultValue
		}
		if variable.Type == "select" && !slices.Contains(variable.Options, value) {
			return fmt.Errorf("variable %q must be one of its options", variable.Value)
		}
	}
	for key := range provided {
		if !known[key] {
			return fmt.Errorf("unknown template variable %q", key)
		}
	}
	return nil
}
