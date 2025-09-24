#!/usr/bin/env python3
"""
Simple TrackWise startup script without ML dependencies
"""

import sys
import os
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# Set environment to disable ML features temporarily
os.environ['DISABLE_ML'] = '1'

# Import and run the FastAPI app directly
if __name__ == "__main__":
    import uvicorn
    from app.main import app
    
    print("🚂 Starting TrackWise Backend (Simple Mode)")
    print("=" * 50)
    
    # Run the FastAPI server
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level="info"
    )