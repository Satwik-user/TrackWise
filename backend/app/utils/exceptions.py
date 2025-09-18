"""
Custom exceptions for TrackWise Railway Optimization System
"""

from typing import Any, Dict, Optional
from fastapi import HTTPException, status


class TrackWiseException(Exception):
    """Base exception for TrackWise application"""
    
    def __init__(
        self,
        message: str,
        code: str = "TRACKWISE_ERROR",
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.code = code
        self.details = details or {}
        super().__init__(self.message)


class ValidationError(TrackWiseException):
    """Validation error"""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, "VALIDATION_ERROR", details)


class NotFoundError(TrackWiseException):
    """Resource not found error"""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, "NOT_FOUND", details)


class AuthenticationError(TrackWiseException):
    """Authentication error"""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, "AUTHENTICATION_ERROR", details)


class AuthorizationError(TrackWiseException):
    """Authorization error"""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, "AUTHORIZATION_ERROR", details)


class OptimizationError(TrackWiseException):
    """Optimization process error"""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, "OPTIMIZATION_ERROR", details)


class SimulationError(TrackWiseException):
    """Simulation process error"""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, "SIMULATION_ERROR", details)


def create_http_exception(exc: TrackWiseException) -> HTTPException:
    """Convert TrackWise exception to HTTP exception"""
    
    status_code_map = {
        "VALIDATION_ERROR": status.HTTP_400_BAD_REQUEST,
        "NOT_FOUND": status.HTTP_404_NOT_FOUND,
        "AUTHENTICATION_ERROR": status.HTTP_401_UNAUTHORIZED,
        "AUTHORIZATION_ERROR": status.HTTP_403_FORBIDDEN,
        "OPTIMIZATION_ERROR": status.HTTP_422_UNPROCESSABLE_ENTITY,
        "SIMULATION_ERROR": status.HTTP_422_UNPROCESSABLE_ENTITY,
    }
    
    status_code = status_code_map.get(exc.code, status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    detail = {
        "error": exc.code,
        "message": exc.message,
        "details": exc.details
    }
    
    return HTTPException(status_code=status_code, detail=detail)