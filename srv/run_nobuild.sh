#!/bin/bash
function cleanup {
  echo "Removing container"
  docker rm fugitive-srv-container
}

trap cleanup EXIT
docker run --name fugitive-srv-container -p 8080:443 -v fugitive-srv-cache:/opt/srv/cache fugitive-srv

