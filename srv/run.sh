#!/bin/bash
function cleanup {
  echo "Removing container"
  docker rm fugitive-srv-container
}

trap cleanup EXIT
docker build -t fugitive-srv .
docker run --name fugitive-srv-container -p 8080:80 fugitive-srv

