FROM golang:1.25-alpine AS builder
WORKDIR /build
COPY go.mod go.sum ./
RUN go mod download
COPY console/ console/
RUN go build -o gem2-console ./console/

FROM alpine:3.21
RUN apk add --no-cache ca-certificates
WORKDIR /app

COPY --from=builder /build/gem2-console .
COPY bin/lobstertrap-linux-amd64 bin/lobstertrap-linux-amd64
RUN chmod +x bin/lobstertrap-linux-amd64
COPY policies/ policies/

ENV PORT=8080
EXPOSE 8080
CMD ["./gem2-console"]
