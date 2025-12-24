FROM golang:1.23-alpine AS builder
WORKDIR /app
COPY . .
RUN go build -o server main.go

FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/server .
COPY poc.bmp .
EXPOSE 8080
CMD ["./server"]
