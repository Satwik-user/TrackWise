"""
TrackWise Railway Optimization System - Backend Application

This module initializes the FastAPI backend application for the TrackWise
railway optimization system, providing APIs for train management, section
control, optimization algorithms, and real-time monitoring.
"""

__version__ = "1.0.0"
__author__ = "TrackWise Development Team"
__email__ = "dev@trackwise.com"
__description__ = "Advanced Railway Traffic Optimization System Backend"

from app.core.config import settings
from app.database import engine, SessionLocal, Base
from app.models import *  # Import all models
from app.schemas import *  # Import all schemas

# Application metadata
APP_INFO = {
    "title": "TrackWise Railway Optimization API",
    "description": __description__,
    "version": __version__,
    "author": __author__,
    "contact": {
        "name": "TrackWise Support",
        "email": __email__,
        "url": "https://trackwise.com/support"
    },
    "license": {
        "name": "MIT License",
        "url": "https://opensource.org/licenses/MIT"
    }
}

# Export commonly used components
__all__ = [
    "settings",
    "engine", 
    "SessionLocal",
    "Base",
    "APP_INFO"
]