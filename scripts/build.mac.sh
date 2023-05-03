#!/usr/bin/env sh

set -e

cd $(dirname $0)

if [ ! -f "$(basename $0)" ]; then
  echo "Incorrect location"
  exit 1
fi

source ./_variables.sh
cd ..

sh ./scripts/build.sh ${BINARY}

appify=./scripts/appify
if [ ! -f $appify ]; then
 # go get github.com/Strosel/appify
 go build -o $appify github.com/Strosel/appify
fi

rm -r ./${NAME}.app
$appify -menubar -name ${NAME} -author "${AUTHOR}" -id ${APP_ID} -icon ${ICON_PATH} ${BINARY}
rm ./${NAME}.app/Contents/README
