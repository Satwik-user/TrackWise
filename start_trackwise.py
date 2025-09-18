#!/usr/bin/env python3
"""
Fixed Ultimate TrackWise Startup Script
Addresses static directory issue and provides robust error handling
"""

import os
import sys
import subprocess
import time
import webbrowser
import threading
import json
from pathlib import Path
from datetime import datetime

def print_status(msg, status="info"):
    icons = {"info": "ℹ️", "success": "✅", "warning": "⚠️", "error": "❌"}
    print(f"{icons.get(status, 'ℹ️')} {msg}")

def create_required_directories():
    """Create all required directories for TrackWise"""
    print_status("Creating required directories...", "info")
    
    directories = [
        "backend/static",
        "backend/logs", 
        "backend/uploads",
        "uploads",
        "logs"
    ]
    
    for directory in directories:
        Path(directory).mkdir(parents=True, exist_ok=True)
        print_status(f"Created directory: {directory}", "success")
    
    # Create a basic index.html in static directory
    static_index = Path("backend/static/index.html")
    if not static_index.exists():
        with open(static_index, "w") as f:
            f.write("""<!DOCTYPE html>
<html>
<head>
    <title>TrackWise Static Files</title>
</head>
<body>
    <h1>TrackWise Railway Optimization System</h1>
    <p>Static files directory</p>
</body>
</html>""")
        print_status("Created static/index.html", "success")

def install_requirements():
    """Install essential requirements"""
    print_status("Installing essential requirements...", "info")
    
    packages = [
        "pydantic-settings>=2.1.0",
        "fastapi>=0.104.0",
        "uvicorn[standard]>=0.24.0",
        "sqlalchemy[asyncio]>=2.0.0",
        "aiosqlite>=0.19.0",
        "passlib[bcrypt]>=1.7.4",
        "python-jose[cryptography]>=3.3.0",
        "python-multipart>=0.0.6",
        "aiofiles>=23.2.0"
    ]
    
    for package in packages:
        try:
            subprocess.run([sys.executable, "-m", "pip", "install", package], 
                         check=True, capture_output=True)
            print_status(f"✅ {package}", "success")
        except subprocess.CalledProcessError:
            print_status(f"⚠️  Failed to install {package}", "warning")
    
    print_status("Requirements installation completed", "success")

def create_fixed_env():
    """Create .env file with correct configuration"""
    env_content = """# TrackWise Fixed Configuration
DEBUG=true
ENVIRONMENT=development
DATABASE_URL=sqlite+aiosqlite:///./railway_optimization.db
SECRET_KEY=trackwise-fixed-secret-key-2025
API_HOST=0.0.0.0
API_PORT=8000
LOG_LEVEL=INFO
ALLOWED_ORIGINS=["http://localhost:3000","http://127.0.0.1:3000"]

# App info
APP_NAME=TrackWise Railway Optimization API
APP_VERSION=1.0.0
APP_DESCRIPTION=Railway Traffic Optimization and Management System

# Security
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Database settings
DATABASE_ECHO=false

# Feature flags
ENABLE_OPTIMIZATION_SERVICE=true
ENABLE_SIMULATION_SERVICE=true
ENABLE_ML_SERVICE=true
"""
    
    with open(".env", "w") as f:
        f.write(env_content)
    
    print_status("Fixed .env file created", "success")

def start_backend_robust():
    """Start backend with robust error handling"""
    print_status("Starting TrackWise backend (robust mode)...", "info")
    
    backend_dir = Path("backend")
    if not backend_dir.exists():
        print_status("Backend directory not found!", "error")
        return None
    
    # Set environment
    env = os.environ.copy()
    env.update({
        "PYTHONPATH": str(backend_dir.absolute()),
        "DEBUG": "true",
        "ENVIRONMENT": "development",
        "DATABASE_URL": "sqlite+aiosqlite:///./railway_optimization.db"
    })
    
    # Start backend
    try:
        process = subprocess.Popen([
            sys.executable, "-m", "uvicorn",
            "app.main:app",
            "--host", "0.0.0.0",
            "--port", "8000",
            "--reload",
            "--log-level", "info"
        ], cwd=backend_dir, env=env,
           stdout=subprocess.PIPE,
           stderr=subprocess.STDOUT,
           universal_newlines=True,
           bufsize=1)
        
        return process
        
    except Exception as e:
        print_status(f"Failed to start backend: {e}", "error")
        return None

def monitor_backend_robust(process):
    """Monitor backend with robust error handling"""
    import urllib.request
    import urllib.error
    
    print_status("Monitoring backend startup...", "info")
    
    # Real-time log monitoring
    def log_monitor():
        if process.stdout:
            for line in process.stdout:
                current_time = datetime.now().strftime("%H:%M:%S")
                print(f"🔧 [{current_time}] {line.strip()}")
                
                # Look for success indicators
                if "Uvicorn running on" in line:
                    print_status("Uvicorn server started!", "success")
                elif "Application startup complete" in line:
                    print_status("Application startup complete!", "success")
    
    # Start log monitoring
    log_thread = threading.Thread(target=log_monitor, daemon=True)
    log_thread.start()
    
    # Health check with longer timeout
    for attempt in range(60):  # 1 minute timeout
        try:
            # Check if process is still running
            if process.poll() is not None:
                print_status(f"Backend process exited with code {process.returncode}", "error")
                return False
            
            # Try health check
            urllib.request.urlopen("http://localhost:8000/health", timeout=5)
            print_status("Backend health check successful!", "success")
            return True
            
        except urllib.error.URLError:
            if attempt % 10 == 0:
                print_status(f"Waiting for backend... ({attempt}/60 seconds)", "info")
            time.sleep(1)
    
    print_status("Backend did not respond within 60 seconds", "warning")
    return False

def test_basic_endpoints():
    """Test basic endpoints"""
    print_status("Testing basic endpoints...", "info")
    
    import urllib.request
    
    endpoints = [
        ("/health", "Health Check"),
        ("/api", "API Info"),
        ("/docs", "Documentation")
    ]
    
    working = 0
    for endpoint, name in endpoints:
        try:
            urllib.request.urlopen(f"http://localhost:8000{endpoint}", timeout=5)
            print_status(f"✅ {name}: {endpoint}", "success")
            working += 1
        except Exception as e:
            print_status(f"⚠️  {name}: {endpoint} - {e}", "warning")
    
    return working

def display_success_info():
    """Display success information"""
    print("\n" + "="*80)
    print("🎉 TrackWise is Successfully Running!")
    print("="*80)
    print(f"🕐 Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    print("🌐 Application URLs:")
    print("  • 🏠 Health Check:        http://localhost:8000/health")
    print("  • 📚 API Documentation:   http://localhost:8000/docs")
    print("  • 🔍 API Info:           http://localhost:8000/api")
    print("  • 📖 ReDoc:              http://localhost:8000/redoc")
    print()
    print("🔑 Default Credentials:")
    print("  • Username: admin")
    print("  • Password: admin123")
    print()
    print("🧪 Quick Tests:")
    print("  curl http://localhost:8000/health")
    print("  curl http://localhost:8000/api")
    print()
    print("📊 System Status:")
    print("  • Database: SQLite (railway_optimization.db)")
    print("  • Environment: Development")
    print("  • Debug Mode: Enabled")
    print("  • Auto-reload: Active")
    print()
    print("🛑 Press Ctrl+C to stop")
    print("="*80)

def main():
    """Main startup function"""
    print("🚂 TrackWise Railway Optimization System")
    print("=" * 60)
    print("🔧 Fixed Ultimate Startup")
    print("=" * 60)
    
    project_root = Path(__file__).parent
    os.chdir(project_root)
    
    try:
        # Step 1: Create required directories
        create_required_directories()
        
        # Step 2: Install requirements
        install_requirements()
        
        # Step 3: Create fixed environment
        create_fixed_env()
        
        # Step 4: Start backend
        backend_process = start_backend_robust()
        
        if not backend_process:
            print_status("Failed to start backend", "error")
            return
        
        # Step 5: Monitor backend
        if monitor_backend_robust(backend_process):
            
            # Step 6: Test endpoints
            working_endpoints = test_basic_endpoints()
            
            if working_endpoints > 0:
                # Step 7: Display success info
                display_success_info()
                
                # Step 8: Open browser
                choice = input("\n🌐 Open TrackWise in browser? (Y/n): ").lower()
                if choice != 'n':
                    try:
                        webbrowser.open("http://localhost:8000/docs")
                        print_status("Browser opened", "success")
                    except:
                        print_status("Could not open browser", "warning")
                
                # Step 9: Keep running
                try:
                    print_status("TrackWise is running... Press Ctrl+C to stop", "info")
                    backend_process.wait()
                except KeyboardInterrupt:
                    print("\n🛑 Stopping TrackWise...")
                    backend_process.terminate()
                    backend_process.wait(timeout=5)
                    print_status("TrackWise stopped successfully", "success")
            else:
                print_status("No endpoints working - check configuration", "error")
                backend_process.terminate()
        else:
            print_status("Backend failed to start properly", "error")
            if backend_process:
                backend_process.terminate()
    
    except Exception as e:
        print_status(f"Startup failed: {e}", "error")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()