#!/usr/bin/env sh

set -e

source "$(dirname $0)/_variables.sh"

if [ -f "./${BINARY}" ]; then
    rm ./${BINARY}
fi

go build -trimpath -o ${BINARY}
