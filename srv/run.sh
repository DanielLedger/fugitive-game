#!/bin/bash
function cleanup {
  echo "Removing container"
  docker rm fugitive-srv-container
}

trap cleanup EXIT
#Generate cert if they don't exist.
if [ ! -d "certs" ]; then
    mkdir certs
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout certs/cert.key -out certs/cert.crt
fi
docker build -t fugitive-srv .
docker run --name fugitive-srv-container -p 8080:443 -v fugitive-srv-cache:/opt/srv/cache fugitive-srv

