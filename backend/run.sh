#!/bin/bash
# TrackWise Railway Optimization System - Startup Script

set -e  # Exit on any error

echo "🚂 TrackWise Railway Optimization System"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    print_error "Python 3 is not installed"
    exit 1
fi

print_status "Python 3 found: $(python3 --version)"

# Check if we're in a virtual environment
if [[ "$VIRTUAL_ENV" != "" ]]; then
    print_status "Virtual environment active: $VIRTUAL_ENV"
else
    print_warning "No virtual environment detected"
    read -p "Continue without virtual environment? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Create a virtual environment with:"
        print_info "  python3 -m venv venv"
        print_info "  source venv/bin/activate  # On Linux/Mac"
        print_info "  venv\\Scripts\\activate     # On Windows"
        exit 1
    fi
fi

# Install requirements if requirements.txt exists
if [ -f "requirements.txt" ]; then
    print_info "Installing/updating requirements..."
    pip install -r requirements.txt
    print_status "Requirements installed"
else
    print_warning "requirements.txt not found"
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        print_info "Creating .env from .env.example..."
        cp .env.example .env
        print_warning "Please update .env with your actual configuration!"
    else
        print_error ".env file not found and no .env.example available"
        exit 1
    fi
fi

# Check database setup option
echo
echo "🗄️  Database Setup Options:"
echo "1. Use Docker Compose (recommended for development)"
echo "2. Use existing PostgreSQL installation"
echo "3. Skip database setup"
read -p "Choose option (1-3): " -n 1 -r db_option
echo

case $db_option in
    1)
        if command -v docker-compose &> /dev/null || command -v docker &> /dev/null; then
            print_info "Starting database services with Docker Compose..."
            if command -v docker-compose &> /dev/null; then
                docker-compose up -d postgres redis
            else
                docker compose up -d postgres redis
            fi
            print_status "Database services started"
            sleep 5  # Wait for services to be ready
        else
            print_error "Docker or Docker Compose not found"
            exit 1
        fi
        ;;
    2)
        print_info "Using existing PostgreSQL installation"
        print_warning "Make sure your database is running and .env is configured correctly"
        ;;
    3)
        print_warning "Skipping database setup - application may not work properly"
        ;;
    *)
        print_error "Invalid option"
        exit 1
        ;;
esac

# Choose startup method
echo
echo "🚀 Startup Options:"
echo "1. Full startup (recommended)"
echo "2. Quick start (development)"
echo "3. Custom uvicorn command"
read -p "Choose startup method (1-3): " -n 1 -r startup_option
echo

case $startup_option in
    1)
        print_info "Starting TrackWise with full initialization..."
        python3 start_app.py
        ;;
    2)
        print_info "Starting TrackWise in quick development mode..."
        python3 quick_start.py
        ;;
    3)
        print_info "Starting with custom uvicorn command..."
        uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
        ;;
    *)
        print_error "Invalid option"
        exit 1
        ;;
esac