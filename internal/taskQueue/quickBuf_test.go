package taskQueue

import (
	"math"
	"path/filepath"
	"testing"

	gzbuffer "goTaskQueue/internal/gzBuffer"
	logstore "goTaskQueue/internal/logStore"
	"goTaskQueue/internal/shared"
)

func TestQuickBufReadFromEnd(t *testing.T) {
	q := QuickBuf{maxBufSize: 6}
	q.qWrite([]byte("0123456789"))

	for _, tc := range []struct {
		name string
		size int64
		want string
		ok   bool
	}{
		{name: "empty", size: 0, ok: true},
		{name: "tail", size: 3, want: "789", ok: true},
		{name: "entire cache", size: 6, want: "456789", ok: true},
		{name: "cache miss", size: 7},
		{name: "negative size", size: -409},
		{name: "large size", size: 1<<32 + 3},
		{name: "maximum size", size: math.MaxInt64},
	} {
		t.Run(tc.name, func(t *testing.T) {
			data, ok := q.qReadFromEnd(tc.size)
			if ok != tc.ok || string(data) != tc.want {
				t.Fatalf("qReadFromEnd(%d) = %q, %v; want %q, %v", tc.size, data, ok, tc.want, tc.ok)
			}
		})
	}
}

func TestWrapQuickBufReadAt(t *testing.T) {
	for _, backend := range []struct {
		name string
		new  func(*testing.T) *shared.DataStore
	}{
		{name: "memory", new: func(t *testing.T) *shared.DataStore {
			return gzbuffer.NewGzBuffer().GetDataStore()
		}},
		{name: "disk", new: func(t *testing.T) *shared.DataStore {
			return logstore.NewLogStore(filepath.Join(t.TempDir(), "log")).GetDataStore()
		}},
	} {
		t.Run(backend.name, func(t *testing.T) {
			store := WrapQuickBuf(backend.new(t), 6)
			t.Cleanup(func() {
				if err := store.Close(); err != nil {
					t.Error(err)
				}
			})
			const data = "0123456789"
			if _, err := store.Write([]byte(data)); err != nil {
				t.Fatal(err)
			}

			check := func(t *testing.T) {
				for _, offset := range []int64{-1, math.MinInt64, 0, 3, 4, 9, 10, 419, 1<<32 + 7, math.MaxInt64} {
					got, err := store.ReadAt(offset)
					if offset < 0 || offset > int64(len(data)) {
						if err == nil {
							t.Errorf("ReadAt(%d) = %q without an error", offset, got)
						}
						continue
					}
					if err != nil || string(got) != data[offset:] {
						t.Errorf("ReadAt(%d) = %q, %v; want %q, nil", offset, got, err, data[offset:])
					}
				}
			}
			t.Run("active", check)
			if err := store.Close(); err != nil {
				t.Fatal(err)
			}
			t.Run("closed", check)
		})
	}
}
