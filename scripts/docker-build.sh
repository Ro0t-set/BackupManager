#!/bin/bash

# Build Docker images

set -e

echo "🐳 Building Docker images..."

# Build with no cache option
BUILD_ARGS=""
if [ "$1" == "--no-cache" ]; then
    BUILD_ARGS="--no-cache"
    echo "Building with --no-cache flag"
fi

docker-compose build $BUILD_ARGS

echo "✅ Docker images built successfully!"
echo ""
echo "To start the services, run:"
echo "  docker-compose up -d"
