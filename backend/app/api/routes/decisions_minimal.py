"""
Minimal Decision Support API Routes for TrackWise
Simple working version for testing
"""

import logging
from datetime import datetime
from fastapi import APIRouter

logger = logging.getLogger(__name__)

# Create router
router = APIRouter()

@router.get("/status")
async def get_decision_status():
    """Get decision support system status"""
    return {
        "status": "active",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0",
        "message": "Decision Support API is running"
    }

@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@router.get("/test")
async def test_endpoint():
    """Simple test endpoint"""
    return {"message": "Decisions API is working", "timestamp": datetime.now().isoformat()}