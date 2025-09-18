"""
FastAPI dependencies for TrackWise Railway Optimization System
"""

from typing import Generator, Optional, Dict, Any
from fastapi import Depends, HTTPException, status, Request, Query, Path
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as redis
from jose import JWTError, jwt
import logging

from app.database import get_async_session
from app.config import settings
from app.core.security import verify_token, get_current_user_from_token
from app.models.user import User
from app.utils.cache import get_redis_client
from app.utils.exceptions import (
    AuthenticationError,
    AuthorizationError,
    ValidationError,
    NotFoundError
)

logger = logging.getLogger(__name__)

# Security scheme
security = HTTPBearer(auto_error=False)

# Dependency aliases
DatabaseSession = Depends(get_async_session)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_async_session)
) -> User:
    """
    Get current authenticated user from JWT token
    """
    if not credentials:
        raise AuthenticationError("Authentication credentials not provided")
    
    try:
        # Verify and decode token
        payload = verify_token(credentials.credentials)
        user_id: int = payload.get("sub")
        
        if user_id is None:
            raise AuthenticationError("Invalid token payload")
        
        # Get user from database
        user = await get_current_user_from_token(db, user_id)
        if not user:
            raise AuthenticationError("User not found")
        
        if not user.is_active:
            raise AuthenticationError("User account is disabled")
        
        return user
        
    except JWTError as e:
        logger.warning(f"JWT verification failed: {e}")
        raise AuthenticationError("Invalid token")
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        raise AuthenticationError("Authentication failed")


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Get current active user (ensures user is active)
    """
    if not current_user.is_active:
        raise AuthenticationError("User account is disabled")
    return current_user


async def get_current_superuser(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Get current superuser (admin privileges required)
    """
    if not current_user.is_superuser:
        raise AuthorizationError("Admin privileges required")
    return current_user


def require_permissions(*required_permissions: str):
    """
    Dependency factory for permission-based access control
    """
    async def permission_checker(
        current_user: User = Depends(get_current_user)
    ) -> User:
        if current_user.is_superuser:
            return current_user
        
        user_permissions = {perm.name for perm in current_user.permissions}
        
        if not all(perm in user_permissions for perm in required_permissions):
            missing_perms = set(required_permissions) - user_permissions
            raise AuthorizationError(
                f"Missing required permissions: {', '.join(missing_perms)}"
            )
        
        return current_user
    
    return permission_checker


def require_roles(*required_roles: str):
    """
    Dependency factory for role-based access control
    """
    async def role_checker(
        current_user: User = Depends(get_current_user)
    ) -> User:
        if current_user.is_superuser:
            return current_user
        
        user_roles = {role.name for role in current_user.roles}
        
        if not any(role in user_roles for role in required_roles):
            raise AuthorizationError(
                f"Required roles: {', '.join(required_roles)}"
            )
        
        return current_user
    
    return role_checker


async def get_redis_client_dependency() -> redis.Redis:
    """
    Get Redis client for caching and session management
    """
    try:
        client = await get_redis_client()
        return client
    except Exception as e:
        logger.error(f"Redis connection failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Cache service unavailable"
        )


async def validate_pagination(
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(10, ge=1, le=100, description="Page size"),
) -> Dict[str, int]:
    """
    Validate pagination parameters
    """
    return {
        "page": page,
        "size": size,
        "offset": (page - 1) * size,
        "limit": size
    }


async def validate_sorting(
    sort_by: Optional[str] = Query(None, description="Field to sort by"),
    sort_order: str = Query("asc", regex="^(asc|desc)$", description="Sort order")
) -> Dict[str, Optional[str]]:
    """
    Validate sorting parameters
    """
    return {
        "sort_by": sort_by,
        "sort_order": sort_order
    }


async def validate_date_range(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)")
) -> Dict[str, Optional[str]]:
    """
    Validate date range parameters
    """
    from datetime import datetime
    
    if start_date:
        try:
            datetime.strptime(start_date, "%Y-%m-%d")
        except ValueError:
            raise ValidationError("Invalid start_date format. Use YYYY-MM-DD")
    
    if end_date:
        try:
            datetime.strptime(end_date, "%Y-%m-%d")
        except ValueError:
            raise ValidationError("Invalid end_date format. Use YYYY-MM-DD")
    
    if start_date and end_date:
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d")
        if start > end:
            raise ValidationError("start_date must be before end_date")
    
    return {
        "start_date": start_date,
        "end_date": end_date
    }


async def get_request_info(request: Request) -> Dict[str, Any]:
    """
    Extract request information for logging and analytics
    """
    return {
        "method": request.method,
        "url": str(request.url),
        "client_ip": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent"),
        "referer": request.headers.get("referer"),
        "content_type": request.headers.get("content-type"),
        "content_length": request.headers.get("content-length")
    }


class CommonQueryParams:
    """
    Common query parameters for API endpoints
    """
    def __init__(
        self,
        page: int = Query(1, ge=1, description="Page number"),
        size: int = Query(10, ge=1, le=100, description="Items per page"),
        search: Optional[str] = Query(None, description="Search query"),
        sort_by: Optional[str] = Query(None, description="Sort field"),
        sort_order: str = Query("asc", regex="^(asc|desc)$", description="Sort order"),
        include_inactive: bool = Query(False, description="Include inactive items")
    ):
        self.page = page
        self.size = size
        self.search = search
        self.sort_by = sort_by
        self.sort_order = sort_order
        self.include_inactive = include_inactive
        self.offset = (page - 1) * size
        self.limit = size


# Railway-specific dependencies
async def validate_train_id(
    train_id: int = Path(..., description="Train ID"),
    db: AsyncSession = Depends(get_async_session)
) -> int:
    """
    Validate train ID exists
    """
    from app.services.train_service import train_service
    
    train = await train_service.get_by_id(db, train_id)
    if not train:
        raise NotFoundError("Train not found")
    
    return train_id


async def validate_section_id(
    section_id: int = Path(..., description="Section ID"),
    db: AsyncSession = Depends(get_async_session)
) -> int:
    """
    Validate section ID exists
    """
    from app.services.section_service import section_service
    
    section = await section_service.get_by_id(db, section_id)
    if not section:
        raise NotFoundError("Section not found")
    
    return section_id


async def validate_optimization_id(
    optimization_id: int = Path(..., description="Optimization run ID"),
    db: AsyncSession = Depends(get_async_session)
) -> int:
    """
    Validate optimization run ID exists
    """
    from app.services.optimization_service import optimization_service
    
    optimization = await optimization_service.get_by_id(db, optimization_id)
    if not optimization:
        raise NotFoundError("Optimization run not found")
    
    return optimization_id


# Rate limiting dependency
class RateLimiter:
    """
    Simple rate limiting using Redis
    """
    def __init__(self, max_requests: int = 100, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
    
    async def __call__(
        self,
        request: Request,
        redis_client: redis.Redis = Depends(get_redis_client_dependency)
    ):
        client_ip = request.client.host if request.client else "unknown"
        key = f"rate_limit:{client_ip}"
        
        try:
            current = await redis_client.get(key)
            if current is None:
                await redis_client.setex(key, self.window_seconds, 1)
            else:
                count = int(current)
                if count >= self.max_requests:
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail="Rate limit exceeded"
                    )
                await redis_client.incr(key)
        except redis.RedisError:
            # Allow request if Redis is unavailable
            logger.warning("Rate limiting unavailable - Redis error")


# Create rate limiter instances
api_rate_limiter = RateLimiter(max_requests=1000, window_seconds=60)
auth_rate_limiter = RateLimiter(max_requests=10, window_seconds=60)

# Export commonly used dependencies
__all__ = [
    "get_current_user",
    "get_current_active_user", 
    "get_current_superuser",
    "require_permissions",
    "require_roles",
    "get_redis_client_dependency",
    "validate_pagination",
    "validate_sorting",
    "validate_date_range",
    "get_request_info",
    "CommonQueryParams",
    "validate_train_id",
    "validate_section_id",
    "validate_optimization_id",
    "api_rate_limiter",
    "auth_rate_limiter",
    "DatabaseSession"
]