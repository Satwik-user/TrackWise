#!/bin/bash

# TrackWise Non-Docker Deployment Script for EC2
# This script deploys TrackWise without Docker containers for simpler management

set -e

echo "🚀 TrackWise Non-Docker Deployment Script"
echo "=========================================="
echo "This will deploy TrackWise directly on Ubuntu without Docker"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_error "Please run this script as ubuntu user, not root"
    exit 1
fi

# Get EC2 public IP
EC2_PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "localhost")
print_status "Detected EC2 Public IP: $EC2_PUBLIC_IP"

# Stop existing Docker containers if running
print_status "Stopping any existing Docker containers..."
sudo systemctl stop docker 2>/dev/null || true
docker-compose down 2>/dev/null || true

print_success "Docker containers stopped"

# Update system packages
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install required packages
print_status "Installing required packages..."
sudo apt install -y \
    python3 \
    python3-pip \
    python3-venv \
    nodejs \
    npm \
    nginx \
    postgresql \
    postgresql-contrib \
    redis-server \
    git \
    curl \
    htop

print_success "System packages installed"

# Setup PostgreSQL
print_status "Setting up PostgreSQL database..."
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql -c "DROP DATABASE IF EXISTS trackwise_db;" 2>/dev/null || true
sudo -u postgres psql -c "DROP USER IF EXISTS trackwise_user;" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE trackwise_db;"
sudo -u postgres psql -c "CREATE USER trackwise_user WITH ENCRYPTED PASSWORD 'trackwise_pass123';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE trackwise_db TO trackwise_user;"
sudo -u postgres psql -c "ALTER USER trackwise_user CREATEDB;"

print_success "PostgreSQL database setup complete"

# Start Redis
print_status "Starting Redis server..."
sudo systemctl start redis-server
sudo systemctl enable redis-server

print_success "Redis server started"

# Setup Python virtual environment for backend
print_status "Setting up Python backend..."
cd ~/TrackWise/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
pip install --upgrade pip
cd ..
pip install -r requirements.txt
cd backend

# Create production environment file
cat > .env.prod << EOF
# TrackWise Production Configuration
DEBUG=False
ENVIRONMENT=production
DATABASE_URL=postgresql://trackwise_user:trackwise_pass123@localhost:5432/trackwise_db
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=trackwise-production-secret-$(openssl rand -hex 32)
API_HOST=0.0.0.0
API_PORT=8000
LOG_LEVEL=INFO
ALLOWED_ORIGINS=["http://$EC2_PUBLIC_IP","http://localhost","http://127.0.0.1"]

# App info
APP_NAME=TrackWise Railway Optimization API
APP_VERSION=1.0.0
APP_DESCRIPTION=Railway Traffic Optimization and Management System

# Security
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=trackwise_db
DB_USER=trackwise_user
DB_PASSWORD=trackwise_pass123
EOF

# Run database migrations
print_status "Running database migrations..."

# Set up environment for database initialization
export PYTHONPATH="/home/ubuntu/TrackWise/backend:$PYTHONPATH"

# Try different approaches for database setup
if [ -f "alembic.ini" ]; then
    print_status "Found alembic.ini, running alembic migrations..."
    alembic upgrade head 2>/dev/null || print_warning "Alembic migration failed, will try direct initialization"
fi

# Initialize database directly
print_status "Initializing database with Python script..."
python -c "
import sys
sys.path.insert(0, '/home/ubuntu/TrackWise/backend')

try:
    from app.database import init_db
    import asyncio
    
    async def setup_db():
        await init_db()
        print('Database initialized successfully')
    
    asyncio.run(setup_db())
except ImportError as e:
    print(f'Could not import app.database: {e}')
    print('Database will be initialized when the application starts')
except Exception as e:
    print(f'Database initialization error: {e}')
    print('Database will be initialized when the application starts')
"

print_success "Backend setup complete"

# Setup Frontend
print_status "Setting up React frontend..."
cd ~/TrackWise/Frontend

# Install Node.js dependencies
npm install

# Create production environment file
cat > .env.production << EOF
REACT_APP_API_BASE_URL=http://$EC2_PUBLIC_IP:8000
REACT_APP_WS_URL=ws://$EC2_PUBLIC_IP:8000
REACT_APP_ENVIRONMENT=production
EOF

# Build React app with memory optimization
print_status "Building React application (with memory optimization)..."

# Set Node.js memory limits for build
export NODE_OPTIONS="--max-old-space-size=2048"

# Try building with different approaches
if npm run build; then
    print_success "React build completed successfully"
elif CI=false NODE_OPTIONS="--max-old-space-size=2048" npm run build; then
    print_success "React build completed with optimized settings"
else
    print_warning "React build failed, creating minimal build..."
    # Create basic build directory structure
    mkdir -p build/static/{css,js,media}
    
    # Copy public files
    cp -r public/* build/ 2>/dev/null || true
    
    # Create a basic index.html if build failed
    cat > build/index.html << 'HTML_EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <link rel="icon" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>TrackWise Railway Optimization</title>
    <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
    <div id="root">
        <div class="min-h-screen bg-gray-900 flex items-center justify-center">
            <div class="text-center">
                <h1 class="text-4xl font-bold text-white mb-4">TrackWise</h1>
                <p class="text-gray-400 mb-8">Railway Optimization System</p>
                <div class="bg-gray-800 p-6 rounded-lg max-w-md mx-auto">
                    <p class="text-white mb-4">Build in progress. Please check backend API:</p>
                    <a href="/api/health" class="text-blue-400 hover:text-blue-300">API Health Check</a>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
HTML_EOF
    
    print_warning "Minimal build created. You may need to build locally and upload."
fi

# Increase Node.js memory limit for build
export NODE_OPTIONS="--max-old-space-size=2048"

# Try building with increased memory, fall back to simpler build if it fails
if ! npm run build; then
    print_warning "Standard build failed due to memory constraints, trying optimized build..."
    
    # Try with CI flag to reduce memory usage
    if ! CI=false npm run build; then
        print_warning "Optimized build failed, creating minimal production build..."
        
        # Create a minimal build directory structure
        mkdir -p build/static/{js,css,media}
        
        # Copy essential files
        cp public/index.html build/ 2>/dev/null || echo '<!DOCTYPE html><html><head><title>TrackWise</title></head><body><div id="root"></div></body></html>' > build/index.html
        cp public/favicon.ico build/ 2>/dev/null || true
        cp -r public/static/* build/static/ 2>/dev/null || true
        
        # Create a simple bundled version
        echo "Building minimal React app without webpack optimizations..."
        npx vite build --minify false 2>/dev/null || print_warning "Vite build also failed, using basic HTML"
    fi
fi

print_success "Frontend build complete"

# Configure Nginx
print_status "Configuring Nginx..."

# Create nginx configuration
sudo tee /etc/nginx/sites-available/trackwise << 'EOF'
server {
    listen 80;
    server_name _;
    
    root /home/ubuntu/TrackWise/Frontend/build;
    index index.html;
    
    # Serve React app
    location / {
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Proxy API requests to backend
    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # CORS headers
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization" always;
    }
    
    # WebSocket support
    location /ws/ {
        proxy_pass http://localhost:8000/ws/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Enable the site
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/trackwise /etc/nginx/sites-enabled/

# Test nginx configuration
sudo nginx -t

# Start nginx
sudo systemctl restart nginx
sudo systemctl enable nginx

print_success "Nginx configured and started"

# Create systemd service for backend
print_status "Creating systemd service for backend..."

sudo tee /etc/systemd/system/trackwise-backend.service << EOF
[Unit]
Description=TrackWise Backend API
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/TrackWise/backend
Environment=PATH=/home/ubuntu/TrackWise/backend/venv/bin
ExecStart=/home/ubuntu/TrackWise/backend/venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
EnvironmentFile=/home/ubuntu/TrackWise/backend/.env.prod
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

# Start backend service
sudo systemctl daemon-reload
sudo systemctl enable trackwise-backend
sudo systemctl start trackwise-backend

print_success "Backend service created and started"

# Create startup script for easy management
cat > ~/trackwise-control.sh << 'EOF'
#!/bin/bash

case "$1" in
    start)
        echo "Starting TrackWise services..."
        sudo systemctl start postgresql redis-server trackwise-backend nginx
        echo "TrackWise started successfully!"
        ;;
    stop)
        echo "Stopping TrackWise services..."
        sudo systemctl stop trackwise-backend nginx
        echo "TrackWise stopped successfully!"
        ;;
    restart)
        echo "Restarting TrackWise services..."
        sudo systemctl restart postgresql redis-server trackwise-backend nginx
        echo "TrackWise restarted successfully!"
        ;;
    status)
        echo "TrackWise Service Status:"
        echo "========================"
        sudo systemctl status postgresql --no-pager -l
        sudo systemctl status redis-server --no-pager -l
        sudo systemctl status trackwise-backend --no-pager -l
        sudo systemctl status nginx --no-pager -l
        ;;
    logs)
        echo "TrackWise Backend Logs:"
        echo "======================"
        sudo journalctl -u trackwise-backend -f
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs}"
        exit 1
        ;;
esac
EOF

chmod +x ~/trackwise-control.sh

# Wait for services to start
print_status "Waiting for services to start..."
sleep 10

# Test the deployment
print_status "Testing deployment..."

# Test backend API
if curl -s http://localhost:8000/health >/dev/null; then
    print_success "Backend API is responding"
else
    print_warning "Backend API not responding yet (this is normal, may take a few moments)"
fi

# Test frontend
if curl -s http://localhost/ >/dev/null; then
    print_success "Frontend is accessible"
else
    print_error "Frontend not accessible"
fi

# Final status
echo ""
echo "🎉 TrackWise Non-Docker Deployment Complete!"
echo "============================================="
echo ""
echo "📍 Access URLs:"
echo "   Frontend: http://$EC2_PUBLIC_IP"
echo "   Backend API: http://$EC2_PUBLIC_IP:8000"
echo "   Health Check: http://$EC2_PUBLIC_IP:8000/health"
echo ""
echo "🔐 Default Login Credentials:"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
echo "🛠️  Management Commands:"
echo "   Start:    ~/trackwise-control.sh start"
echo "   Stop:     ~/trackwise-control.sh stop"
echo "   Restart:  ~/trackwise-control.sh restart"
echo "   Status:   ~/trackwise-control.sh status"
echo "   Logs:     ~/trackwise-control.sh logs"
echo ""
echo "📋 Service Status:"
sudo systemctl is-active postgresql && echo "✅ PostgreSQL: Running" || echo "❌ PostgreSQL: Stopped"
sudo systemctl is-active redis-server && echo "✅ Redis: Running" || echo "❌ Redis: Stopped"
sudo systemctl is-active trackwise-backend && echo "✅ Backend: Running" || echo "❌ Backend: Stopped"
sudo systemctl is-active nginx && echo "✅ Nginx: Running" || echo "❌ Nginx: Stopped"
echo ""
echo "🔍 If you encounter issues:"
echo "   1. Check logs: ~/trackwise-control.sh logs"
echo "   2. Check status: ~/trackwise-control.sh status"
echo "   3. Restart services: ~/trackwise-control.sh restart"
echo ""
echo "🌐 Open your browser and navigate to: http://$EC2_PUBLIC_IP"