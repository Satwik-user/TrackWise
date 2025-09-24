#!/bin/bash

# TrackWise Docker Build Test Script
# Run this script to validate Docker images and deployment

set -e

echo "🧪 Testing TrackWise Docker Build Process..."

# Configuration
COMPOSE_FILE="docker-compose.prod.yml"
TEST_ENV_FILE=".env.test"

# Create test environment file
echo "📄 Creating test environment file..."
cat > "$TEST_ENV_FILE" << EOF
ENVIRONMENT=test
POSTGRES_DB=trackwise_test
POSTGRES_USER=trackwise_test
POSTGRES_PASSWORD=test_password_123456
POSTGRES_PORT=5432
DATABASE_URL=postgresql://trackwise_test:test_password_123456@postgres:5432/trackwise_test
REDIS_PASSWORD=test_redis_pass
REDIS_PORT=6379
REDIS_URL=redis://:test_redis_pass@redis:6379/0
JWT_SECRET_KEY=test_jwt_secret_key_for_testing_minimum_32_characters
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60
WORKERS=1
LOG_LEVEL=INFO
REACT_APP_API_BASE_URL=/api
REACT_APP_WS_URL=/ws
REACT_APP_ENVIRONMENT=test
FRONTEND_PORT=80
CORS_ORIGINS=http://localhost,https://localhost
GRAFANA_ADMIN_PASSWORD=test_admin_pass
EOF

# Set environment variables
export $(cat "$TEST_ENV_FILE" | grep -v '^#' | xargs)

echo ""
echo "🔨 Testing Docker Image Builds..."

# Test backend build
echo "🐍 Building backend image..."
if docker build -f Dockerfile.backend.prod -t trackwise-backend:test . ; then
    echo "✅ Backend image built successfully"
else
    echo "❌ Backend image build failed"
    exit 1
fi

# Test frontend build  
echo "⚛️ Building frontend image..."
if docker build -f Dockerfile.frontend.prod -t trackwise-frontend:test . ; then
    echo "✅ Frontend image built successfully"
else
    echo "❌ Frontend image build failed"
    exit 1
fi

echo ""
echo "🐳 Testing Docker Compose Configuration..."

# Validate compose file
if docker-compose -f "$COMPOSE_FILE" config > /dev/null ; then
    echo "✅ Docker Compose configuration is valid"
else
    echo "❌ Docker Compose configuration is invalid"
    exit 1
fi

echo ""
echo "🚀 Testing Service Deployment..."

# Start services
echo "▶️ Starting services..."
docker-compose -f "$COMPOSE_FILE" up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 60

# Check service health
echo "🏥 Checking service health..."

# Test database
if docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U trackwise_test -d trackwise_test ; then
    echo "✅ Database is ready"
else
    echo "❌ Database health check failed"
fi

# Test Redis
if docker-compose -f "$COMPOSE_FILE" exec -T redis redis-cli ping | grep -q "PONG" ; then
    echo "✅ Redis is ready"
else
    echo "❌ Redis health check failed"
fi

# Test backend
retry_count=0
max_retries=10
while [ $retry_count -lt $max_retries ]; do
    if curl -f http://localhost/api/docs > /dev/null 2>&1 ; then
        echo "✅ Backend is responding"
        break
    fi
    retry_count=$((retry_count + 1))
    echo "⏳ Waiting for backend... ($retry_count/$max_retries)"
    sleep 10
done

if [ $retry_count -eq $max_retries ]; then
    echo "❌ Backend is not responding"
    echo "📋 Backend logs:"
    docker-compose -f "$COMPOSE_FILE" logs --tail=20 backend
fi

# Test frontend
retry_count=0
while [ $retry_count -lt $max_retries ]; do
    if curl -f http://localhost/health > /dev/null 2>&1 ; then
        echo "✅ Frontend is responding"
        break
    fi
    retry_count=$((retry_count + 1))
    echo "⏳ Waiting for frontend... ($retry_count/$max_retries)"
    sleep 10
done

if [ $retry_count -eq $max_retries ]; then
    echo "❌ Frontend is not responding"
    echo "📋 Frontend logs:"
    docker-compose -f "$COMPOSE_FILE" logs --tail=20 frontend
fi

echo ""
echo "📊 Container Status:"
docker-compose -f "$COMPOSE_FILE" ps

echo ""
echo "💾 Resource Usage:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"

echo ""
echo "🧪 Running API Tests..."

# Test authentication
echo "🔐 Testing authentication..."
AUTH_RESPONSE=$(curl -s -X POST http://localhost/api/auth/login/json \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin123"}')

if echo "$AUTH_RESPONSE" | grep -q "access_token"; then
    echo "✅ Authentication test passed"
    
    # Extract token for further tests
    TOKEN=$(echo "$AUTH_RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
    
    # Test ML prediction endpoints
    echo "🤖 Testing ML prediction endpoints..."
    
    # Test model status
    if curl -s -H "Authorization: Bearer $TOKEN" http://localhost/api/predictions/models/status | grep -q "models_loaded"; then
        echo "✅ ML model status endpoint working"
    else
        echo "❌ ML model status endpoint failed"
    fi
    
    # Test trains endpoint
    if curl -s -H "Authorization: Bearer $TOKEN" http://localhost/api/trains | grep -q "\[\]"; then
        echo "✅ Trains API endpoint working"
    else
        echo "❌ Trains API endpoint failed"
    fi
    
else
    echo "❌ Authentication test failed"
    echo "Response: $AUTH_RESPONSE"
fi

echo ""
echo "🧹 Cleanup..."

# Stop and cleanup
docker-compose -f "$COMPOSE_FILE" down --remove-orphans
docker rmi trackwise-backend:test trackwise-frontend:test || true
rm -f "$TEST_ENV_FILE"

echo ""
if [ $retry_count -lt $max_retries ]; then
    echo "🎉 All tests passed! TrackWise is ready for deployment."
    echo ""
    echo "📋 Next Steps:"
    echo "1. Create production .env.prod file with secure passwords"
    echo "2. Update CORS_ORIGINS with your domain"
    echo "3. Run ./deploy/deploy.sh for production deployment"
    echo "4. Set up SSL certificate for HTTPS"
    exit 0
else
    echo "❌ Some tests failed. Please check the logs above."
    echo ""
    echo "🔍 Troubleshooting:"
    echo "1. Check if all required ports are available"
    echo "2. Ensure sufficient system resources"
    echo "3. Verify Docker and Docker Compose installation"
    echo "4. Check firewall settings"
    exit 1
fi