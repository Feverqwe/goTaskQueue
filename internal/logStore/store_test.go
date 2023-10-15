package logstore

import (
	"io"
	"log"
	"os"
	"path"
	"testing"
)

func TestStore(t *testing.T) {
	filename := getStoreFilename()
	place := path.Dir(filename)

	os.RemoveAll(place)
	os.MkdirAll(place, 0700)

	s := NewLogStore(filename, 0)
	defer s.Close()

	size := s.Len()
	log.Println("size", size)
	checkEq(int(size), 0)

	w := NewLogWriter(s)
	defer w.Close()
	data := []byte("hi this is string")

	n, err := w.Write(data)
	checkErr(err)

	log.Println("written", n)
	checkEq(n, 17)

	newSize := s.Len()
	log.Println("new size", newSize)
	checkEq(int(newSize), 17)

	r := NewLogReader(s)
	defer r.Close()

	rd, err := io.ReadAll(r)
	checkErr(err)
	checkEq(17, len(rd))

	log.Println("read size", len(rd))

	r.Seek(7, 0)
	rd, err = io.ReadAll(r)
	checkErr(err)
	checkEq(10, len(rd))

	log.Println("read size", len(rd))
}

func TestOpenStore(t *testing.T) {
	filename := getStoreFilename()

	s, err := OpenLogStore(filename)
	checkErr(err)

	r := NewLogReader(s)
	defer r.Close()

	rd, err := io.ReadAll(r)
	checkErr(err)
	checkEq(17, len(rd))

	log.Println("read size", len(rd))

	r.Seek(7, 0)
	rd, err = io.ReadAll(r)
	checkErr(err)
	checkEq(10, len(rd))

	log.Println("read size", len(rd))
}

func getStoreFilename() string {
	wd, _ := os.Getwd()
	place := path.Join(wd, "test")

	return path.Join(place, "store")
}

func checkErr(err error) {
	if err != nil {
		log.Panicln("Error", err)
	}
}

func checkEq(a int, b int) {
	if a != b {
		log.Panicln("Values in not equeal")
	}
}
