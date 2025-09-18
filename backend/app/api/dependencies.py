"""
API dependencies for TrackWise Railway Optimization System
"""

import time
from typing import Dict, Any
from collections import defaultdict
from fastapi import HTTPException, status
from datetime import datetime, timedelta

# Simple rate limiter for development
class SimpleRateLimiter:
    """Simple in-memory rate limiter"""
    
    def __init__(self):
        self.requests: Dict[str, list] = defaultdict(list)
        self.window_size = 60  # 1 minute window
        self.max_requests = 100  # Max requests per window
    
    def is_allowed(self, identifier: str) -> bool:
        """Check if request is allowed"""
        now = time.time()
        window_start = now - self.window_size
        
        # Clean old requests
        self.requests[identifier] = [
            req_time for req_time in self.requests[identifier]
            if req_time > window_start
        ]
        
        # Check if limit exceeded
        if len(self.requests[identifier]) >= self.max_requests:
            return False
        
        # Add current request
        self.requests[identifier].append(now)
        return True


# Global rate limiter instance
_rate_limiter = SimpleRateLimiter()


def api_rate_limiter(identifier: str = "default"):
    """Rate limiter dependency"""
    if not _rate_limiter.is_allowed(identifier):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded"
        )
    return True