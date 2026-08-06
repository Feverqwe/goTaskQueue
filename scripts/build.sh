#!/usr/bin/env sh

set -e

source "$(dirname $0)/_variables.sh"

if [ "$1" != "dev" ] || [ ! -f "./assets/www/index.html" ]; then
    sh ./scripts/build.ui.sh
fi

if [ -f "./${BINARY}" ]; then
    rm ./${BINARY}
fi

go build -trimpath -o ${BINARY}
