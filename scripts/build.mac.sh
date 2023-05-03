#!/usr/bin/env sh

set -e

source "$(dirname $0)/_variables.sh"

sh ./scripts/build.sh ${BINARY}

appify=./scripts/appify
if [ ! -f $appify ]; then
 # go get github.com/Strosel/appify
 go build -o $appify github.com/Strosel/appify
fi

rm -r "./${NAME}.app" | true
$appify -menubar -name "${NAME}" -author "${AUTHOR}" -id "${APP_ID}" -icon "${ICON_PATH}" "${BINARY}"
rm "./${NAME}.app/Contents/README"
