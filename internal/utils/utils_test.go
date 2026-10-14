package utils

import (
	"strings"
	"testing"
)

func TestParseJSONRejectsTrailingData(t *testing.T) {
	for _, input := range []string{`{} {}`, `{} null`, `{} garbage`, `{"id":`, `[]`} {
		if _, err := ParseJson[struct{ ID string }](strings.NewReader(input)); err == nil {
			t.Errorf("accepted invalid object payload %q", input)
		}
	}
	payload, err := ParseJson[struct{ ID string }](strings.NewReader("{\"ID\":\"test\"} \n\t"))
	if err != nil || payload.ID != "test" {
		t.Fatalf("valid object rejected: %v, %v", payload, err)
	}
	keys, err := ParseJson[[]string](strings.NewReader("null"))
	if err != nil || *keys != nil {
		t.Fatalf("null key list compatibility lost: %v, %v", keys, err)
	}
}
