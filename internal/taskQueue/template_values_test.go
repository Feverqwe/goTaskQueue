package taskQueue

import "testing"

func TestResolveTemplateVariablesUsesProvidedValuesAndDefaults(t *testing.T) {
	definitions := []TemplateVariable{
		{Name: "Environment", Value: "environment", DefaultValue: "staging"},
		{Name: "Image", Value: "image", DefaultValue: "latest"},
	}

	resolved := ResolveTemplateVariables(definitions, map[string]string{"environment": "production"})
	if resolved["environment"] != "production" || resolved["image"] != "latest" {
		t.Fatalf("resolved variables = %#v", resolved)
	}
}

func TestRenderTemplateTextSupportsCurrentAndLegacySyntaxInOnePass(t *testing.T) {
	variables := map[string]string{
		"environment": "production",
		"image":       "{environment}",
	}

	got, err := RenderTemplateText(
		"Deploy {{ vars.image }} to {{vars.environment}} (legacy: {environment})",
		variables,
	)
	if err != nil {
		t.Fatal(err)
	}
	want := "Deploy {environment} to production (legacy: production)"
	if got != want {
		t.Fatalf("rendered text = %q, want %q", got, want)
	}
}

func TestRenderTemplateTextRejectsUnknownCurrentVariable(t *testing.T) {
	got, err := RenderTemplateText("Deploy {{ vars.missing }}", nil)
	if err == nil {
		t.Fatal("unknown variable did not return an error")
	}
	if got != "Deploy {{ vars.missing }}" {
		t.Fatalf("rendered text = %q", got)
	}
}

func TestRenderLegacyCommandDoesNotCascadeValues(t *testing.T) {
	variables := map[string]string{"first": "{second}", "second": "done"}
	if got := RenderLegacyCommand("echo {first} {second}", variables); got != "echo {second} done" {
		t.Fatalf("rendered command = %q", got)
	}
}

func TestTemplateVariableEnvName(t *testing.T) {
	if got, ok := templateVariableEnvName("container_image"); !ok || got != "TASK_VAR_CONTAINER_IMAGE" {
		t.Fatalf("env name = %q, valid = %v", got, ok)
	}
	for _, invalid := range []string{"ContainerImage", "container-image", "1image", ""} {
		if _, ok := templateVariableEnvName(invalid); ok {
			t.Fatalf("invalid key %q was accepted", invalid)
		}
	}
}
