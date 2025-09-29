#!/bin/bash

echo "🧪 TrackWise Local Test (Network Issues Workaround)"
echo "=================================================="

# Check if we have any Python base images locally
echo "📋 Checking for local Docker images..."
docker images | grep python || echo "No Python images found locally"

echo ""
echo "🔧 Testing with a simple local build..."

# Create a simple test Dockerfile that doesn't require network
cat > Dockerfile.test << 'EOF'
FROM scratch
ADD .env.test /test.txt
EOF

echo "📦 Testing Docker build capability..."
if docker build -f Dockerfile.test -t test-build .; then
    echo "✅ Docker build works locally"
    docker rmi test-build
    rm Dockerfile.test
else
    echo "❌ Docker build failed - but this is expected with network issues"
    rm Dockerfile.test
fi

echo ""
echo "🌐 Testing network connectivity..."
if ping -c 2 8.8.8.8 >/dev/null 2>&1; then
    echo "✅ Internet connectivity works"
else
    echo "❌ No internet connectivity"
    exit 1
fi

echo ""
echo "🐳 Testing Docker Hub connectivity..."
if nslookup registry-1.docker.io >/dev/null 2>&1; then
    echo "✅ Can resolve Docker Hub"
else
    echo "❌ Cannot resolve Docker Hub"
    echo "💡 This might be a Docker Desktop DNS issue"
fi

echo ""
echo "📊 Docker Desktop Status:"
docker system df 2>/dev/null || echo "Cannot get Docker system info"

echo ""
echo "💡 Recommendations:"
echo "1. Restart Docker Desktop completely"
echo "2. Check Docker Desktop → Settings → Resources → Network"
echo "3. Set DNS to: 8.8.8.8, 1.1.1.1"
echo "4. Try 'docker pull python:3.11-slim' manually"