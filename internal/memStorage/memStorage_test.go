package memstorage

import "testing"

func TestGetKeysReturnsSnapshot(t *testing.T) {
	storage := GetMemStorage()
	storage.SetKey("existing", "original")

	snapshot := storage.GetKeys(nil)
	storage.SetKey("existing", "updated")
	snapshot["snapshot-only"] = true

	if snapshot["existing"] != "original" {
		t.Fatalf("snapshot changed after storage update: %#v", snapshot)
	}
	if _, ok := storage.GetKey("snapshot-only"); ok {
		t.Fatal("mutating snapshot changed storage")
	}
}
