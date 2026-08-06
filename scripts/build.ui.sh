#!/usr/bin/env sh

set -e

source "$(dirname $0)/_variables.sh"

cd ./tq-ui
npm run release
