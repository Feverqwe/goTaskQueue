#!/usr/bin/env sh

set -e

cd $(dirname $0)

if [ ! -f "$(basename $0)" ]; then
  echo "Incorrect location"
  exit 1
fi

source ./_variables.sh
cd ..

if [ -f "./${BINARY}" ]; then
    rm ./${BINARY}
fi

go build -trimpath -o ${BINARY}
