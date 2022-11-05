#!/bin/sh

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
cd $SCRIPT_DIR/..

source ./scripts/_variables.sh

sh ./scripts/build.sh ${BINARY}

rm -r ./${NAME}.app
~/go/bin/appify -menubar -name ${NAME} -author "${AUTHOR}" -id ${APP_ID} -icon ${ICON_PATH} ${BINARY}
rm ./${NAME}.app/Contents/README
