"""
Logging configuration for TrackWise Railway Optimization System
"""

import logging
import logging.config
import sys
from pathlib import Path
from typing import Any, Dict
from datetime import datetime

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from app.config import settings


def setup_logging():
    """Setup logging configuration"""
    
    # Create logs directory if it doesn't exist
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)
    
    # Logging configuration
    log_config: Dict[str, Any] = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "detailed": {
                "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
                "datefmt": "%Y-%m-%d %H:%M:%S"
            },
            "simple": {
                "format": "%(levelname)s - %(message)s"
            }
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "level": settings.LOG_LEVEL,
                "formatter": "simple",
                "stream": sys.stdout
            }
        },
        "loggers": {
            "": {  # root logger
                "level": settings.LOG_LEVEL,
                "handlers": ["console"],
                "propagate": False
            },
            "uvicorn.access": {
                "level": "INFO",
                "handlers": ["console"],
                "propagate": False
            },
            "uvicorn.error": {
                "level": "INFO", 
                "handlers": ["console"],
                "propagate": False
            }
        }
    }
    
    # Add file handler if log file is specified
    if settings.LOG_FILE:
        log_config["handlers"]["file"] = {
            "class": "logging.FileHandler",
            "level": settings.LOG_LEVEL,
            "formatter": "detailed",
            "filename": settings.LOG_FILE,
            "mode": "a"
        }
        # Add file handler to root logger
        log_config["loggers"][""]["handlers"].append("file")
    
    # Apply logging configuration
    logging.config.dictConfig(log_config)
    
    # Log startup message
    logger = logging.getLogger(__name__)
    logger.info(f"Logging initialized - Level: {settings.LOG_LEVEL}")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware for logging HTTP requests"""
    
    async def dispatch(self, request: Request, call_next):
        start_time = datetime.utcnow()
        
        # Log request
        logger = logging.getLogger("trackwise.requests")
        logger.info(f"{request.method} {request.url}")
        
        # Process request
        response = await call_next(request)
        
        # Log response
        process_time = (datetime.utcnow() - start_time).total_seconds()
        logger.info(
            f"{request.method} {request.url} - "
            f"Status: {response.status_code} - "
            f"Time: {process_time:.3f}s"
        )
        
        return response