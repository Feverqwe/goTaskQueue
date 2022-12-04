#!/bin/sh

if [ "$1" = "dev" ]; then
    export DEBUG_UI=1
fi

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
cd $SCRIPT_DIR/..

source ./scripts/_variables.sh

sh ./scripts/build.sh
./$BINARY
