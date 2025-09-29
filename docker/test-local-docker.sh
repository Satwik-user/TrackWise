#!/bin/bash

# Test script for TrackWise using Windows Docker Desktop from WSL
echo "🧪 Testing TrackWise with Docker Desktop..."

# Use Windows Docker executable
DOCKER_CMD="/mnt/c/Program Files/Docker/Docker/resources/bin/docker.exe"
DOCKER_COMPOSE_CMD="/mnt/c/Program Files/Docker/Docker/resources/bin/docker-compose.exe"

# Check if Docker is running
echo "📋 Checking Docker status..."
if ! "$DOCKER_CMD" version >/dev/null 2>&1; then
    echo "❌ Docker Desktop is not running. Please start Docker Desktop first."
    exit 1
fi

echo "✅ Docker Desktop is running"
"$DOCKER_CMD" version

echo ""
echo "🔨 Testing Docker Image Builds..."

# Create test environment file
echo "📄 Creating test environment file..."
cp .env.prod.example .env.test
echo "✅ Test environment created"

echo ""
echo "🐍 Building backend image..."
if "$DOCKER_CMD" build -f Dockerfile.backend.prod -t trackwise-backend-test .; then
    echo "✅ Backend image built successfully"
else
    echo "❌ Backend image build failed"
    exit 1
fi

echo ""
echo "⚛️ Building frontend image..."
if "$DOCKER_CMD" build -f Dockerfile.frontend.prod -t trackwise-frontend-test ./Frontend; then
    echo "✅ Frontend image built successfully"
else
    echo "❌ Frontend image build failed"
    exit 1
fi

echo ""
echo "🎯 All Docker images built successfully!"
echo "🚀 Ready to test with docker-compose..."

echo ""
echo "📊 Image sizes:"
"$DOCKER_CMD" images | grep trackwise-

echo ""
echo "🧹 Cleaning up test images..."
"$DOCKER_CMD" rmi trackwise-backend-test trackwise-frontend-test 2>/dev/null || true

echo "✅ Local Docker test completed successfully!"
echo "🎉 Your application is ready for deployment!"