#!/bin/bash
# TrackWise Quick Start Script - Fixed Version

set -e

echo "🚂 TrackWise Railway Optimization System"
echo "========================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

print_info "Working directory: $SCRIPT_DIR"

# Check prerequisites
print_info "Checking prerequisites..."

if ! command -v python3 &> /dev/null; then
    print_error "Python 3 is required"
    exit 1
fi

if ! command -v node &> /dev/null; then
    print_error "Node.js is required - install from https://nodejs.org/"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    print_error "npm is required"
    exit 1
fi

print_status "Prerequisites OK"

# Check and create frontend directory if needed
if [ ! -d "frontend" ] && [ ! -d "Frontend" ]; then
    print_warning "Frontend directory not found - creating basic structure"
    mkdir -p frontend/src
    cd frontend
    
    # Create basic package.json
    cat > package.json << 'EOF'
{
  "name": "trackwise-frontend",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1",
    "axios": "^1.4.0",
    "react-router-dom": "^6.3.0"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  },
  "proxy": "http://localhost:8000"
}
EOF

    # Create basic React app structure
    mkdir -p public src
    
    cat > public/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>TrackWise Railway Optimization</title>
</head>
<body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
</body>
</html>
EOF
    
    cat > src/index.js << 'EOF'
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
EOF

    cat > src/App.js << 'EOF'
import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await axios.get('/health');
        setHealth(response.data);
      } catch (err) {
        setError(err.message);
      }
    };
    
    checkHealth();
    const interval = setInterval(checkHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🚂 TrackWise Railway Optimization System</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>System Status</h2>
        {health ? (
          <div style={{ color: 'green' }}>
            ✅ Backend is healthy - {health.status}
            <br />
            Version: {health.version}
            <br />
            Environment: {health.environment}
          </div>
        ) : error ? (
          <div style={{ color: 'red' }}>
            ❌ Backend connection failed: {error}
          </div>
        ) : (
          <div>⏳ Checking backend status...</div>
        )}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>Quick Links</h2>
        <ul>
          <li><a href="/api/v1/docs" target="_blank">API Documentation</a></li>
          <li><a href="/health" target="_blank">Health Check</a></li>
          <li><a href="/api/v1/trains" target="_blank">Trains API</a></li>
        </ul>
      </div>

      <div>
        <h2>Features</h2>
        <ul>
          <li>🚂 Train Management</li>
          <li>🛤️ Section Management</li>
          <li>⚡ Route Optimization</li>
          <li>📊 Analytics & Reporting</li>
          <li>🎮 Simulation Engine</li>
          <li>🤖 ML Predictions</li>
        </ul>
      </div>
    </div>
  );
}

export default App;
EOF
    
    cd ..
    print_status "Created basic frontend structure"
fi

# Determine frontend directory
FRONTEND_DIR=""
if [ -d "Frontend" ]; then
    FRONTEND_DIR="Frontend"
elif [ -d "frontend" ]; then
    FRONTEND_DIR="frontend"
else
    print_error "No frontend directory found"
    exit 1
fi

print_info "Using frontend directory: $FRONTEND_DIR"

# Install dependencies
print_info "Installing dependencies..."

# Install Python dependencies
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt --quiet
else
    # Install essential packages
    pip install fastapi uvicorn pydantic-settings sqlalchemy asyncpg redis aiohttp --quiet
fi

# Install Node dependencies
if [ -d "$FRONTEND_DIR" ]; then
    cd "$FRONTEND_DIR"
    npm install --silent
    cd ..
fi

print_status "Dependencies installed"

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
    print_info "Creating .env file..."
    cat > .env << 'EOF'
# TrackWise Environment Configuration
DEBUG=true
ENVIRONMENT=development
DATABASE_URL=sqlite:///./railway_optimization.db
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=trackwise-dev-secret-key-change-in-production
API_HOST=0.0.0.0
API_PORT=8000
LOG_LEVEL=INFO
ALLOWED_ORIGINS=["http://localhost:3000","http://127.0.0.1:3000"]
EOF
    print_status ".env file created"
fi

# Create a simple database file if using SQLite
if grep -q "sqlite" .env; then
    print_info "Using SQLite database for quick start"
    touch railway_optimization.db
fi

# Start backend with better error handling
print_info "Starting backend..."
cd backend

# Check if app directory exists
if [ ! -d "app" ]; then
    print_error "Backend app directory not found"
    exit 1
fi

# Start backend with proper error handling
export PYTHONPATH="$PWD:$PYTHONPATH"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait for backend to start
print_info "Waiting for backend to start..."
sleep 3

# Check if backend is running
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    print_error "Backend failed to start. Check backend.log for details:"
    tail -n 20 backend.log
    exit 1
fi

# Test backend health
for i in {1..10}; do
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        print_status "Backend is running"
        break
    fi
    if [ $i -eq 10 ]; then
        print_error "Backend health check failed"
        print_info "Backend log:"
        tail -n 10 backend.log
        kill $BACKEND_PID 2>/dev/null
        exit 1
    fi
    sleep 2
done

# Start frontend
print_info "Starting frontend..."
cd "$FRONTEND_DIR"
BROWSER=none npm start > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Wait for frontend
print_info "Waiting for frontend to start..."
sleep 5

# Check if frontend is running
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    print_warning "Frontend may have issues. Check frontend.log"
else
    print_status "Frontend is starting"
fi

print_status "TrackWise is starting up!"
echo ""
print_info "🌐 Application URLs:"
print_info "  • Frontend:  http://localhost:3000"
print_info "  • Backend:   http://localhost:8000"
print_info "  • API Docs:  http://localhost:8000/docs"
print_info "  • Health:    http://localhost:8000/health"
echo ""
print_info "📋 Default Admin Credentials:"
print_info "  • Username: admin"
print_info "  • Password: admin123"
echo ""
print_info "📜 Logs:"
print_info "  • Backend:   tail -f backend.log"
print_info "  • Frontend:  tail -f frontend.log"
echo ""

# Try to open browser
if command -v xdg-open &> /dev/null; then
    sleep 3
    xdg-open http://localhost:3000 2>/dev/null &
elif command -v open &> /dev/null; then
    sleep 3
    open http://localhost:3000 2>/dev/null &
fi

print_info "Press Ctrl+C to stop all services"

# Function to cleanup
cleanup() {
    print_info "Stopping services..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    print_status "Services stopped"
}

# Wait for interrupt
trap cleanup INT
wait