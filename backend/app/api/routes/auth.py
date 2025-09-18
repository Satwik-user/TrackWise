"""
Authentication routes for TrackWise Railway Optimization System
"""

from datetime import timedelta
from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr

from app.core.security import (
    authenticate_user,
    create_tokens_for_user,
    get_current_active_user,
    verify_token,
    create_access_token
)

router = APIRouter()


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str


class TokenData(BaseModel):
    username: str = None


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    is_active: bool
    is_superuser: bool


class RefreshTokenRequest(BaseModel):
    refresh_token: str


@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()) -> Any:
    """Login and return access token"""
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    tokens = create_tokens_for_user(user)
    
    return {
        "access_token": tokens["access_token"],
        "refresh_token": tokens["refresh_token"],
        "token_type": "bearer"
    }


@router.post("/login/json", response_model=Token)
async def login_json(user_data: UserLogin) -> Any:
    """Login with JSON data and return access token"""
    user = authenticate_user(user_data.username, user_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    tokens = create_tokens_for_user(user)
    
    return {
        "access_token": tokens["access_token"],
        "refresh_token": tokens["refresh_token"],
        "token_type": "bearer"
    }


@router.post("/refresh", response_model=Token)
async def refresh_token(refresh_data: RefreshTokenRequest) -> Any:
    """Refresh access token using refresh token"""
    payload = verify_token(refresh_data.refresh_token)
    
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    # Mock user lookup
    user_id = payload.get("sub")
    if user_id == "1":
        user = {
            "id": 1,
            "username": "admin",
            "email": "admin@trackwise.com",
            "full_name": "System Administrator",
            "is_active": True,
            "is_superuser": True
        }
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    tokens = create_tokens_for_user(user)
    
    return {
        "access_token": tokens["access_token"],
        "refresh_token": tokens["refresh_token"],
        "token_type": "bearer"
    }


@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: Dict = Depends(get_current_active_user)) -> Any:
    """Get current user info"""
    return UserResponse(
        id=int(current_user["sub"]),
        username=current_user["username"],
        email=current_user["email"],
        full_name=current_user["full_name"],
        is_active=current_user.get("active", True),
        is_superuser=current_user.get("is_superuser", False)
    )


@router.post("/logout")
async def logout(current_user: Dict = Depends(get_current_active_user)) -> Any:
    """Logout user (in a real app, you'd invalidate the token)"""
    return {"message": "Successfully logged out"}


@router.get("/test")
async def test_auth() -> Any:
    """Test authentication endpoint (no auth required)"""
    return {
        "message": "Authentication system is working",
        "timestamp": "2024-01-01T00:00:00Z",
        "endpoints": [
            "POST /auth/login - Login with form data",
            "POST /auth/login/json - Login with JSON",
            "POST /auth/refresh - Refresh token",
            "GET /auth/me - Get current user",
            "POST /auth/logout - Logout"
        ]
    }