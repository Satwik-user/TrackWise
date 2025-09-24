"""
API routes initialization for TrackWise Railway Optimization System
"""

from fastapi import APIRouter
from . import auth, users, trains, sections, optimization, analytics, websocket, simulation, decisions, predictions

# Create main API router
api_router = APIRouter()

# Include all route modules
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["User Management"])
api_router.include_router(trains.router, prefix="/trains", tags=["Trains"])
api_router.include_router(sections.router, prefix="/sections", tags=["Sections"])
api_router.include_router(optimization.router, prefix="/optimization", tags=["Optimization"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
api_router.include_router(simulation.router, prefix="/simulation", tags=["Simulation"])
api_router.include_router(decisions.router, prefix="/decisions", tags=["Decisions"])
api_router.include_router(predictions.router, prefix="/predictions", tags=["Predictions"])
api_router.include_router(websocket.router, prefix="/ws", tags=["WebSocket"])

__all__ = ["api_router"]