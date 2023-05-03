#!/usr/bin/env sh

set -e

cd $(dirname $0)

if [ ! -f "$(basename $0)" ]; then
  echo "Incorrect location"
  exit 1
fi

source ./_variables.sh
cd ..

cd assets
go get github.com/jteeuwen/go-bindata/...
go install github.com/jteeuwen/go-bindata/...
~/go/bin/go-bindata ./icon.ico ./www ./www/icons
sed 's/package main/package assets/g' ./bindata.go > ./bindata_.go
mv ./bindata_.go ./bindata.go
