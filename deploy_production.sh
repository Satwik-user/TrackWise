#!/bin/bash

# TrackWise Railway Optimization System - Production Deployment Script
# Complete deployment automation for production environment

set -e  # Exit on any error

echo "🚂 TrackWise Railway Optimization System - Production Deployment"
echo "================================================================"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_PORT=8000
FRONTEND_PORT=3000
DATABASE_PATH="./railway_optimization.db"
LOG_LEVEL="INFO"
ENVIRONMENT="production"

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

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# System checks
print_status "Performing system checks..."

# Check Python
if command_exists python3; then
    PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
    print_success "Python 3 found: $PYTHON_VERSION"
else
    print_error "Python 3 is required but not installed"
    exit 1
fi

# Check Node.js
if command_exists node; then
    NODE_VERSION=$(node --version)
    print_success "Node.js found: $NODE_VERSION"
else
    print_error "Node.js is required but not installed"
    exit 1
fi

# Check npm
if command_exists npm; then
    NPM_VERSION=$(npm --version)
    print_success "npm found: $NPM_VERSION"
else
    print_error "npm is required but not installed"
    exit 1
fi

# Check if ports are available
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warning "Port $1 is already in use"
        return 1
    else
        print_success "Port $1 is available"
        return 0
    fi
}

print_status "Checking port availability..."
check_port $BACKEND_PORT
check_port $FRONTEND_PORT

# Install Python dependencies
print_status "Installing Python dependencies..."
if [ -f "requirements.txt" ]; then
    pip3 install -r requirements.txt
    print_success "Python dependencies installed"
else
    print_warning "requirements.txt not found, installing core dependencies..."
    pip3 install fastapi uvicorn sqlalchemy alembic pydantic python-jose python-multipart
    pip3 install scikit-learn pandas numpy ortools
fi

# Install Node.js dependencies
print_status "Installing Node.js dependencies..."
cd Frontend
if [ -f "package.json" ]; then
    npm install
    print_success "Node.js dependencies installed"
else
    print_error "Frontend package.json not found"
    exit 1
fi
cd ..

# Database setup
print_status "Setting up database..."
if [ -f "backend/setup_database.py" ]; then
    cd backend
    python3 setup_database.py
    print_success "Database initialized"
    cd ..
else
    print_warning "Database setup script not found, creating minimal database..."
    # Create minimal database
    python3 -c "
import sqlite3
conn = sqlite3.connect('$DATABASE_PATH')
conn.execute('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT, email TEXT)')
conn.execute('CREATE TABLE IF NOT EXISTS trains (id INTEGER PRIMARY KEY, train_id TEXT, status TEXT)')
conn.execute('CREATE TABLE IF NOT EXISTS sections (id INTEGER PRIMARY KEY, section_id TEXT, capacity INTEGER)')
conn.commit()
conn.close()
print('Minimal database created')
"
fi

# Build frontend
print_status "Building frontend for production..."
cd Frontend
npm run build
print_success "Frontend build completed"
cd ..

# Create environment configuration
print_status "Creating environment configuration..."
cat > .env << EOF
# TrackWise Production Configuration
ENVIRONMENT=production
LOG_LEVEL=$LOG_LEVEL
DATABASE_URL=sqlite:///./$DATABASE_PATH
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
BACKEND_URL=http://localhost:$BACKEND_PORT
FRONTEND_URL=http://localhost:$FRONTEND_PORT

# ML Model Configuration
ML_MODEL_PATH=./ml_models/
ENABLE_ML_PREDICTIONS=true
RETRAIN_INTERVAL_HOURS=24

# Optimization Configuration
SOLVER_TIMEOUT_SECONDS=30
MAX_OPTIMIZATION_HORIZON=240
DEFAULT_OPTIMIZATION_OBJECTIVE=minimize_delays

# API Configuration
API_RATE_LIMIT=100
API_TIMEOUT_SECONDS=30
ENABLE_WEBSOCKET=true

# Security Configuration
JWT_ALGORITHM=HS256
JWT_EXPIRE_HOURS=24
CORS_ORIGINS=http://localhost:$FRONTEND_PORT,http://127.0.0.1:$FRONTEND_PORT

# Monitoring Configuration
ENABLE_METRICS=true
METRICS_PORT=9090
LOG_FILE=./logs/trackwise.log
EOF

print_success "Environment configuration created"

# Create systemd service files (optional, for Linux production deployment)
create_systemd_services() {
    print_status "Creating systemd service files..."
    
    # Backend service
    sudo tee /etc/systemd/system/trackwise-backend.service > /dev/null << EOF
[Unit]
Description=TrackWise Backend API
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)/backend
Environment=PATH=$(pwd)/venv/bin
ExecStart=$(which python3) -m uvicorn app.main:app --host 0.0.0.0 --port $BACKEND_PORT
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

    # Frontend service (using serve to serve built files)
    sudo tee /etc/systemd/system/trackwise-frontend.service > /dev/null << EOF
[Unit]
Description=TrackWise Frontend
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)/Frontend
ExecStart=$(which npx) serve -s build -l $FRONTEND_PORT
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    print_success "Systemd services created"
}

# Create startup script
print_status "Creating startup script..."
cat > start_production.sh << 'EOF'
#!/bin/bash

# TrackWise Production Startup Script
echo "🚂 Starting TrackWise Railway Optimization System"

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | xargs)
fi

# Start backend
echo "Starting backend API server..."
cd backend
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4 &
BACKEND_PID=$!
echo "Backend started with PID: $BACKEND_PID"
cd ..

# Wait for backend to start
sleep 5

# Start frontend (serving built files)
echo "Starting frontend server..."
cd Frontend
if command -v serve >/dev/null 2>&1; then
    npx serve -s build -l 3000 &
else
    # Fallback to development server
    npm start &
fi
FRONTEND_PID=$!
echo "Frontend started with PID: $FRONTEND_PID"
cd ..

# Create PID file for process management
echo $BACKEND_PID > .backend.pid
echo $FRONTEND_PID > .frontend.pid

echo "✅ TrackWise system is running!"
echo "📊 Dashboard: http://localhost:3000"
echo "🔧 API Documentation: http://localhost:8000/docs"
echo ""
echo "To stop the system, run: ./stop_production.sh"

# Keep script running
wait
EOF

chmod +x start_production.sh

# Create stop script
cat > stop_production.sh << 'EOF'
#!/bin/bash

echo "🛑 Stopping TrackWise Railway Optimization System"

# Stop processes using PID files
if [ -f .backend.pid ]; then
    BACKEND_PID=$(cat .backend.pid)
    if kill -0 $BACKEND_PID 2>/dev/null; then
        kill $BACKEND_PID
        echo "Backend stopped (PID: $BACKEND_PID)"
    fi
    rm .backend.pid
fi

if [ -f .frontend.pid ]; then
    FRONTEND_PID=$(cat .frontend.pid)
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        kill $FRONTEND_PID
        echo "Frontend stopped (PID: $FRONTEND_PID)"
    fi
    rm .frontend.pid
fi

# Fallback: kill by port
pkill -f "uvicorn app.main:app"
pkill -f "serve -s build"
pkill -f "npm start"

echo "✅ TrackWise system stopped"
EOF

chmod +x stop_production.sh

# Create health check script
cat > health_check.sh << 'EOF'
#!/bin/bash

# TrackWise Health Check Script
echo "🔍 TrackWise System Health Check"
echo "================================"

# Check backend health
echo "Checking backend API..."
if curl -s http://localhost:8000/health >/dev/null 2>&1; then
    echo "✅ Backend API is healthy"
    
    # Check specific endpoints
    echo "Checking authentication endpoint..."
    if curl -s http://localhost:8000/api/auth/health >/dev/null 2>&1; then
        echo "✅ Authentication service is healthy"
    else
        echo "⚠️  Authentication service may have issues"
    fi
    
    echo "Checking optimization endpoint..."
    if curl -s http://localhost:8000/api/optimization/health >/dev/null 2>&1; then
        echo "✅ Optimization service is healthy"
    else
        echo "⚠️  Optimization service may have issues"
    fi
    
else
    echo "❌ Backend API is not responding"
fi

# Check frontend
echo "Checking frontend..."
if curl -s http://localhost:3000 >/dev/null 2>&1; then
    echo "✅ Frontend is accessible"
else
    echo "❌ Frontend is not responding"
fi

# Check database
echo "Checking database..."
if [ -f "railway_optimization.db" ]; then
    echo "✅ Database file exists"
    # Test database connection
    python3 -c "
import sqlite3
try:
    conn = sqlite3.connect('railway_optimization.db')
    conn.execute('SELECT 1')
    print('✅ Database connection successful')
    conn.close()
except Exception as e:
    print(f'❌ Database connection failed: {e}')
"
else
    echo "❌ Database file not found"
fi

# Check ports
echo "Checking port usage..."
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "✅ Port 8000 (Backend) is in use"
else
    echo "❌ Port 8000 (Backend) is not in use"
fi

if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "✅ Port 3000 (Frontend) is in use"
else
    echo "❌ Port 3000 (Frontend) is not in use"
fi

echo ""
echo "Health check completed!"
EOF

chmod +x health_check.sh

# Create logs directory
mkdir -p logs

# Final deployment summary
print_success "🎉 TrackWise deployment completed successfully!"
echo ""
echo "📋 Deployment Summary:"
echo "====================="
echo "✅ System requirements checked"
echo "✅ Dependencies installed"
echo "✅ Database configured"
echo "✅ Frontend built for production"
echo "✅ Environment configuration created"
echo "✅ Startup and management scripts created"
echo ""
echo "🚀 To start the system:"
echo "   ./start_production.sh"
echo ""
echo "🛑 To stop the system:"
echo "   ./stop_production.sh"
echo ""
echo "🔍 To check system health:"
echo "   ./health_check.sh"
echo ""
echo "📊 Access URLs:"
echo "   Frontend Dashboard: http://localhost:$FRONTEND_PORT"
echo "   Backend API: http://localhost:$BACKEND_PORT"
echo "   API Documentation: http://localhost:$BACKEND_PORT/docs"
echo ""
echo "📁 Important files:"
echo "   Configuration: .env"
echo "   Database: $DATABASE_PATH"
echo "   Logs: ./logs/trackwise.log"
echo ""
print_success "TrackWise is ready for production deployment! 🚂"