"""
User management routes for TrackWise Railway Optimization System
"""

from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr

from app.core.security import get_current_active_user, get_current_superuser

router = APIRouter()


class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    username: str


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    username: Optional[str] = None
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None


class UserResponse(UserBase):
    id: int
    is_active: bool
    is_superuser: bool

    class Config:
        from_attributes = True


# Mock users database
MOCK_USERS = [
    {
        "id": 1,
        "username": "admin",
        "email": "admin@trackwise.com",
        "full_name": "System Administrator",
        "is_active": True,
        "is_superuser": True
    },
    {
        "id": 2,
        "username": "user",
        "email": "user@trackwise.com",
        "full_name": "Regular User",
        "is_active": True,
        "is_superuser": False
    },
    {
        "id": 3,
        "username": "operator",
        "email": "operator@trackwise.com",
        "full_name": "Railway Operator",
        "is_active": True,
        "is_superuser": False
    }
]


@router.get("/", response_model=List[UserResponse])
async def get_users(
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(get_current_superuser)
) -> List[UserResponse]:
    """Get all users (superuser only)"""
    users = MOCK_USERS[skip: skip + limit]
    return [UserResponse(**user) for user in users]


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    current_user: dict = Depends(get_current_active_user)
) -> UserResponse:
    """Get user by ID"""
    # Users can only see their own profile unless they're superuser
    current_user_id = int(current_user["sub"])
    if user_id != current_user_id and not current_user.get("is_superuser", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    user = next((u for u in MOCK_USERS if u["id"] == user_id), None)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse(**user)


@router.post("/", response_model=UserResponse)
async def create_user(
    user_in: UserCreate,
    current_user: dict = Depends(get_current_superuser)
) -> UserResponse:
    """Create new user (superuser only)"""
    # Check if username already exists
    if any(u["username"] == user_in.username for u in MOCK_USERS):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )
    
    # Check if email already exists
    if any(u["email"] == user_in.email for u in MOCK_USERS):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already exists"
        )
    
    # Create new user
    new_user = {
        "id": max((u["id"] for u in MOCK_USERS), default=0) + 1,
        "username": user_in.username,
        "email": user_in.email,
        "full_name": user_in.full_name,
        "is_active": True,
        "is_superuser": False
    }
    
    MOCK_USERS.append(new_user)
    
    return UserResponse(**new_user)


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_in: UserUpdate,
    current_user: dict = Depends(get_current_active_user)
) -> UserResponse:
    """Update user"""
    # Users can only update their own profile unless they're superuser
    current_user_id = int(current_user["sub"])
    if user_id != current_user_id and not current_user.get("is_superuser", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    user = next((u for u in MOCK_USERS if u["id"] == user_id), None)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update user fields
    update_data = user_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        if field in user:
            user[field] = value
    
    return UserResponse(**user)


@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    current_user: dict = Depends(get_current_superuser)
) -> dict:
    """Delete user (superuser only)"""
    user_index = next((i for i, u in enumerate(MOCK_USERS) if u["id"] == user_id), None)
    if user_index is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Don't allow deleting yourself
    current_user_id = int(current_user["sub"])
    if user_id == current_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    deleted_user = MOCK_USERS.pop(user_index)
    
    return {"message": f"User {deleted_user['username']} deleted successfully"}


@router.get("/me/profile", response_model=UserResponse)
async def get_my_profile(current_user: dict = Depends(get_current_active_user)) -> UserResponse:
    """Get current user's profile"""
    user_id = int(current_user["sub"])
    user = next((u for u in MOCK_USERS if u["id"] == user_id), None)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found"
        )
    
    return UserResponse(**user)


@router.put("/me/profile", response_model=UserResponse)
async def update_my_profile(
    user_in: UserUpdate,
    current_user: dict = Depends(get_current_active_user)
) -> UserResponse:
    """Update current user's profile"""
    user_id = int(current_user["sub"])
    user = next((u for u in MOCK_USERS if u["id"] == user_id), None)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found"
        )
    
    # Regular users can't change their superuser status
    update_data = user_in.dict(exclude_unset=True)
    if not current_user.get("is_superuser", False):
        update_data.pop("is_superuser", None)
        update_data.pop("is_active", None)
    
    # Update user fields
    for field, value in update_data.items():
        if field in user:
            user[field] = value
    
    return UserResponse(**user)