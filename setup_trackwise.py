#!/usr/bin/env python3
"""
TrackWise Installation Script
Complete setup and dependency installation
"""

import os
import sys
import subprocess
from pathlib import Path

def install_trackwise():
    """Complete TrackWise installation"""
    
    print("🚂 TrackWise Railway Optimization System - Installation")
    print("=" * 60)
    
    # Check Python version
    if sys.version_info < (3, 8, 0):
        print("❌ Python 3.8+ is required")
        return False
    
    print(f"✅ Python {sys.version.split()[0]} detected")
    
    # Install all requirements
    print("📦 Installing all dependencies...")
    
    try:
        subprocess.run([
            sys.executable, "-m", "pip", "install", "--upgrade", "pip"
        ], check=True)
        
        # Install from requirements.txt if exists
        if Path("requirements.txt").exists():
            subprocess.run([
                sys.executable, "-m", "pip", "install", "-r", "requirements.txt"
            ], check=True)
        else:
            # Install essential packages
            essential_packages = [
                "pydantic-settings>=2.1.0",
                "fastapi>=0.104.0", 
                "uvicorn[standard]>=0.24.0",
                "sqlalchemy[asyncio]>=2.0.0",
                "aiosqlite>=0.19.0",
                "passlib[bcrypt]>=1.7.4",
                "python-jose[cryptography]>=3.3.0",
                "python-multipart>=0.0.6"
            ]
            
            for package in essential_packages:
                subprocess.run([
                    sys.executable, "-m", "pip", "install", package
                ], check=True)
        
        print("✅ All dependencies installed successfully")
        
        # Create basic structure if needed
        Path("backend/logs").mkdir(parents=True, exist_ok=True)
        Path("backend/uploads").mkdir(parents=True, exist_ok=True)
        
        print("✅ Project structure verified")
        print("\n🎯 Installation complete!")
        print("Run: python ultimate_working_start.py")
        
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Installation failed: {e}")
        return False

if __name__ == "__main__":
    install_trackwise()