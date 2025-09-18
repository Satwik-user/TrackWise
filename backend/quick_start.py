#!/usr/bin/env python3
"""
TrackWise Quick Start Script
A simplified startup script for rapid development and testing.
"""

import asyncio
import sys
import os
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from app.config import settings
from app.core.logging import setup_logging

# Setup basic logging
setup_logging()

async def quick_start():
    """Quick start for development"""
    
    print("🚀 TrackWise Quick Start")
    print("=" * 30)
    
    # Set development environment
    os.environ["ENVIRONMENT"] = "development"
    os.environ["DEBUG"] = "true"
    
    try:
        # Import and run with minimal setup
        import uvicorn
        
        print(f"🌐 Starting server on http://localhost:8000")
        print("📚 API Docs: http://localhost:8000/docs")
        print("🛑 Press Ctrl+C to stop")
        
        # Start with hot reload for development
        uvicorn.run(
            "app.main:app",
            host="0.0.0.0",
            port=8000,
            reload=True,
            log_level="info",
            access_log=True
        )
        
    except Exception as e:
        print(f"❌ Quick start failed: {e}")
        print("💡 Try running the full start_app.py for detailed setup")

if __name__ == "__main__":
    try:
        asyncio.run(quick_start())
    except KeyboardInterrupt:
        print("\n👋 Quick start stopped!")