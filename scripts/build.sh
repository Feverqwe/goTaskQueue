#!/bin/sh

NAME="${1:-goTaskQueue}"

rm ./${NAME}
go build -trimpath -o ${NAME}
