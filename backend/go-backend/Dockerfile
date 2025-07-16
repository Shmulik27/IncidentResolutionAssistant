# go-backend/Dockerfile
FROM golang:1.23-alpine

WORKDIR /app

COPY go.mod ./
COPY go.sum ./
RUN go mod download

RUN apk add --no-cache aws-cli

COPY . .

RUN go build -o main .

EXPOSE 8080

CMD ["./main"]