#!/bin/bash

ORG_PATH="/orgs/evolutionygo"
REPO_NAME="hot-db-update"
DOCKER_IMAGE_NAME="evolutionygo/server"
DOCKER_IMAGE_TAG="beta"
DOCKER_CONTAINER_NAME="evolutionygo-server-beta"
LOKI_URL="http://localhost:3100/loki/api/v1/push"

# Go to the repository
cd $ORG_PATH/$REPO_NAME

# Pull the latest changes
git pull

# Update submodules
git submodule init
git submodule update --remote

# Delete running container and image if they exist
docker stop $DOCKER_CONTAINER_NAME
docker rm -f $DOCKER_CONTAINER_NAME
docker rmi $DOCKER_IMAGE_NAME:$DOCKER_IMAGE_TAG

# Build the image
docker build -t $DOCKER_IMAGE_NAME --progress=plain . 2>&1 | tee ../docker-build.log

# Return to project root
cd $ORG_PATH

# Run the container
docker run -d --env-file ./evolution-server.env \
--name $DOCKER_CONTAINER_NAME \
-p 4000:4000 \
-p 7711:7711 \
-p 7911:7911 \
-p 7922:7922 \
-v `pwd`/certs:/app/certs \
-v `pwd`/$REPO_NAME/db/BabelCDB:/app/databases/evolution:ro \
--log-driver=loki \
--log-opt loki-url=$LOKI_URL \
$DOCKER_IMAGE_NAME:$DOCKER_IMAGE_TAG
