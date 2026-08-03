FROM golang:1.26-alpine3.24 AS build
LABEL stage=build
WORKDIR /build
RUN apk update && apk upgrade --no-cache && apk add --no-cache git musl-dev
ADD . .
RUN go build -o goTaskQueue

FROM alpine:3.24 AS release
#>>>
ARG BUILD_VERSION="2026.07.04"
RUN apk update && apk upgrade --no-cache && apk add --no-cache \
        ca-certificates \
        curl \
        ffmpeg \
        python3
RUN curl -Lo /usr/local/bin/yt-dlp https://github.com/yt-dlp/yt-dlp/releases/download/${BUILD_VERSION}/yt-dlp \
 && chmod a+rx /usr/local/bin/yt-dlp \
 && ln -s /usr/local/bin/yt-dlp /usr/bin/yt-dlp

ENV SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt
#<<<

RUN apk update && apk upgrade --no-cache && apk add --no-cache bash openssh-client nano htop mc jq

COPY --from=build /build/goTaskQueue /opt/goTaskQueue

EXPOSE 81

ENV PROFILE_PLACE=/profile
CMD /opt/goTaskQueue -disableTrayIcon
