#!/bin/bash

# TrackWise Deployment Script for Production
# Run this script after setup-ec2.sh to deploy the application

set -e

# Configuration
APP_DIR="/opt/trackwise"
REPO_URL="${REPO_URL:-https://github.com/Satwik-user/TrackWise.git}"
BRANCH="${BRANCH:-prod}"
COMPOSE_FILE="docker-compose.prod.yml"

echo "🚀 Deploying TrackWise to Production..."

# Check if running as trackwise user
if [ "$(whoami)" != "trackwise" ]; then
    echo "❌ This script should be run as the trackwise user"
    echo "💡 Run: sudo -u trackwise $0"
    exit 1
fi

# Navigate to application directory
cd "$APP_DIR"

# Backup current deployment (if exists)
if [ -d "current" ]; then
    echo "💾 Backing up current deployment..."
    timestamp=$(date +"%Y%m%d_%H%M%S")
    mv current "backup_$timestamp"
    
    # Keep only last 3 backups
    ls -td backup_* 2>/dev/null | tail -n +4 | xargs rm -rf
fi

# Clone or update repository
echo "📦 Fetching latest code..."
if [ ! -d ".git" ]; then
    git clone -b "$BRANCH" "$REPO_URL" current
else
    cd current
    git fetch origin
    git checkout "$BRANCH"
    git pull origin "$BRANCH"
fi

cd "$APP_DIR/current"

# Check if environment file exists
if [ ! -f ".env.prod" ]; then
    echo "❌ Environment file .env.prod not found!"
    echo "💡 Please create .env.prod file with required variables"
    echo "📋 See .env.example for reference"
    exit 1
fi

# Load environment variables
set -a
source .env.prod
set +a

# Validate required environment variables
required_vars=(
    "POSTGRES_PASSWORD"
    "JWT_SECRET_KEY"
    "DATABASE_URL"
    "REDIS_URL"
)

echo "🔍 Validating environment variables..."
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Required environment variable $var is not set"
        exit 1
    fi
done

# Build and deploy
echo "🔨 Building Docker images..."
docker-compose -f "$COMPOSE_FILE" build --no-cache

# Stop existing services
echo "🛑 Stopping existing services..."
docker-compose -f "$COMPOSE_FILE" down --remove-orphans

# Start database first and wait for it to be ready
echo "🗄️ Starting database..."
docker-compose -f "$COMPOSE_FILE" up -d postgres redis
sleep 30

# Run database migrations (if needed)
echo "🔄 Running database migrations..."
docker-compose -f "$COMPOSE_FILE" run --rm backend python -m app.database_init

# Start all services
echo "🚀 Starting all services..."
docker-compose -f "$COMPOSE_FILE" up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 60

# Health check
echo "🏥 Performing health checks..."
max_retries=30
retry_count=0

while [ $retry_count -lt $max_retries ]; do
    if curl -f http://localhost/health >/dev/null 2>&1; then
        echo "✅ Frontend is healthy"
        break
    fi
    
    retry_count=$((retry_count + 1))
    echo "⏳ Waiting for frontend... ($retry_count/$max_retries)"
    sleep 10
done

if [ $retry_count -eq $max_retries ]; then
    echo "❌ Frontend health check failed"
    echo "📋 Checking logs..."
    docker-compose -f "$COMPOSE_FILE" logs --tail=50 frontend
    exit 1
fi

# Check backend
retry_count=0
while [ $retry_count -lt $max_retries ]; do
    if curl -f http://localhost/api/docs >/dev/null 2>&1; then
        echo "✅ Backend is healthy"
        break
    fi
    
    retry_count=$((retry_count + 1))
    echo "⏳ Waiting for backend... ($retry_count/$max_retries)"
    sleep 10
done

if [ $retry_count -eq $max_retries ]; then
    echo "❌ Backend health check failed"
    echo "📋 Checking logs..."
    docker-compose -f "$COMPOSE_FILE" logs --tail=50 backend
    exit 1
fi

# Clean up old Docker images and containers
echo "🧹 Cleaning up..."
docker system prune -f
docker image prune -f

# Create/update systemctl service for auto-restart
echo "⚙️ Setting up systemd service..."
sudo tee /etc/systemd/system/trackwise.service > /dev/null <<EOF
[Unit]
Description=TrackWise Railway Management System
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$APP_DIR/current
ExecStart=/usr/local/bin/docker-compose -f $COMPOSE_FILE up -d
ExecStop=/usr/local/bin/docker-compose -f $COMPOSE_FILE down
ExecReload=/usr/local/bin/docker-compose -f $COMPOSE_FILE restart
User=trackwise
Group=trackwise

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable trackwise.service

# Display deployment status
echo ""
echo "🎉 Deployment completed successfully!"
echo "=================================="
echo "📊 Container Status:"
docker-compose -f "$COMPOSE_FILE" ps

echo ""
echo "🌐 Service URLs:"
echo "Frontend: http://$(curl -s ifconfig.me)/"
echo "Backend API: http://$(curl -s ifconfig.me)/api/docs"
echo "Monitoring: http://$(curl -s ifconfig.me):3001/ (if enabled)"

echo ""
echo "📋 Management Commands:"
echo "View logs: docker-compose -f $COMPOSE_FILE logs -f [service]"
echo "Restart: docker-compose -f $COMPOSE_FILE restart [service]"
echo "Update: $0"
echo "Backup: /opt/trackwise/backup.sh"
echo "Health check: /opt/trackwise/health-check.sh"

echo ""
echo "✅ TrackWise is now running in production!"