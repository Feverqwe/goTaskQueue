#!/bin/sh

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
cd $SCRIPT_DIR/..

cd assets
go get github.com/jteeuwen/go-bindata/...
go install github.com/jteeuwen/go-bindata/...
~/go/bin/go-bindata ./icon.ico ./www ./www/icons
sed 's/package main/package assets/g' ./bindata.go > ./bindata_.go
mv ./bindata_.go ./bindata.go
