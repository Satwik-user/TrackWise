"""
User schemas for API request/response validation
"""

from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, validator, Field
import re

from app.models.user import User as UserModel


class UserBase(BaseModel):
    """Base user schema with common fields"""
    username: str = Field(..., min_length=3, max_length=100, description="Unique username")
    email: EmailStr = Field(..., description="User email address")
    full_name: str = Field(..., min_length=1, max_length=255, description="Full name")
    phone_number: Optional[str] = Field(None, max_length=20, description="Phone number")
    department: Optional[str] = Field(None, max_length=100, description="Department")
    position: Optional[str] = Field(None, max_length=100, description="Job position")
    employee_id: Optional[str] = Field(None, max_length=50, description="Employee ID")
    timezone: str = Field("UTC", description="User timezone")
    language: str = Field("en", description="Preferred language")
    theme: str = Field("light", description="UI theme preference")
    
    @validator('username')
    def validate_username(cls, v):
        if not re.match(r'^[a-zA-Z0-9_.-]+$', v):
            raise ValueError('Username can only contain letters, numbers, dots, hyphens, and underscores')
        return v.lower()
    
    @validator('phone_number')
    def validate_phone_number(cls, v):
        if v and not re.match(r'^\+?[\d\s\-\(\)]+$', v):
            raise ValueError('Invalid phone number format')
        return v
    
    @validator('timezone')
    def validate_timezone(cls, v):
        import pytz
        if v not in pytz.all_timezones:
            raise ValueError('Invalid timezone')
        return v
    
    @validator('language')
    def validate_language(cls, v):
        valid_languages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko']
        if v not in valid_languages:
            raise ValueError(f'Language must be one of: {", ".join(valid_languages)}')
        return v
    
    @validator('theme')
    def validate_theme(cls, v):
        valid_themes = ['light', 'dark', 'auto']
        if v not in valid_themes:
            raise ValueError(f'Theme must be one of: {", ".join(valid_themes)}')
        return v


class UserCreate(UserBase):
    """Schema for creating a new user"""
    password: str = Field(..., min_length=8, max_length=128, description="User password")
    confirm_password: str = Field(..., description="Password confirmation")
    is_active: bool = Field(True, description="Whether user account is active")
    role_ids: Optional[List[int]] = Field(None, description="List of role IDs to assign")
    send_welcome_email: bool = Field(True, description="Send welcome email to user")
    
    @validator('password')
    def validate_password(cls, v):
        # Password strength validation
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one digit')
        
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('Password must contain at least one special character')
        
        return v
    
    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'password' in values and v != values['password']:
            raise ValueError('Passwords do not match')
        return v


class UserUpdate(BaseModel):
    """Schema for updating user information"""
    full_name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = Field(None, max_length=20)
    department: Optional[str] = Field(None, max_length=100)
    position: Optional[str] = Field(None, max_length=100)
    employee_id: Optional[str] = Field(None, max_length=50)
    timezone: Optional[str] = None
    language: Optional[str] = None
    theme: Optional[str] = None
    is_active: Optional[bool] = None
    role_ids: Optional[List[int]] = None
    
    @validator('timezone')
    def validate_timezone(cls, v):
        if v is not None:
            import pytz
            if v not in pytz.all_timezones:
                raise ValueError('Invalid timezone')
        return v


class PasswordChange(BaseModel):
    """Schema for password change"""
    current_password: str = Field(..., description="Current password")
    new_password: str = Field(..., min_length=8, max_length=128, description="New password")
    confirm_password: str = Field(..., description="New password confirmation")
    
    @validator('new_password')
    def validate_new_password(cls, v):
        # Same validation as UserCreate.password
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one digit')
        
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('Password must contain at least one special character')
        
        return v
    
    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('Passwords do not match')
        return v


class PasswordReset(BaseModel):
    """Schema for password reset"""
    email: EmailStr = Field(..., description="User email address")


class PasswordResetConfirm(BaseModel):
    """Schema for password reset confirmation"""
    token: str = Field(..., description="Password reset token")
    new_password: str = Field(..., min_length=8, max_length=128, description="New password")
    confirm_password: str = Field(..., description="New password confirmation")
    
    @validator('new_password')
    def validate_new_password(cls, v):
        # Same validation as UserCreate.password
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one digit')
        
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('Password must contain at least one special character')
        
        return v
    
    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('Passwords do not match')
        return v


class RoleBase(BaseModel):
    """Base role schema"""
    name: str = Field(..., min_length=1, max_length=50, description="Role name")
    description: Optional[str] = Field(None, description="Role description")
    is_default: bool = Field(False, description="Whether this is a default role")


class RoleCreate(RoleBase):
    """Schema for creating a new role"""
    permission_ids: Optional[List[int]] = Field(None, description="List of permission IDs")


class RoleUpdate(BaseModel):
    """Schema for updating a role"""
    name: Optional[str] = Field(None, min_length=1, max_length=50)
    description: Optional[str] = None
    is_default: Optional[bool] = None
    permission_ids: Optional[List[int]] = None


class PermissionBase(BaseModel):
    """Base permission schema"""
    name: str = Field(..., min_length=1, max_length=100, description="Permission name")
    description: Optional[str] = Field(None, description="Permission description")
    resource: str = Field(..., max_length=50, description="Resource type")
    action: str = Field(..., max_length=50, description="Action type")


class PermissionCreate(PermissionBase):
    """Schema for creating a new permission"""
    pass


class PermissionUpdate(BaseModel):
    """Schema for updating a permission"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    resource: Optional[str] = Field(None, max_length=50)
    action: Optional[str] = Field(None, max_length=50)


class Permission(PermissionBase):
    """Permission response schema"""
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class Role(RoleBase):
    """Role response schema"""
    id: int
    created_at: datetime
    updated_at: datetime
    permissions: List[Permission] = []
    
    class Config:
        from_attributes = True


class UserResponse(UserBase):
    """User response schema (public information)"""
    id: int
    is_active: bool
    is_verified: bool
    last_login: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    roles: List[Role] = []
    
    class Config:
        from_attributes = True


class UserDetail(UserResponse):
    """Detailed user response schema"""
    is_superuser: bool
    failed_login_attempts: int
    locked_until: Optional[datetime]
    password_changed_at: datetime
    two_factor_enabled: bool
    permissions: List[str] = []
    
    @validator('permissions', pre=True, always=True)
    def get_user_permissions(cls, v, values):
        # This would be populated by the service layer
        return v or []


class UserList(BaseModel):
    """Paginated user list response"""
    users: List[UserResponse]
    total: int
    page: int
    size: int
    pages: int


class UserSession(BaseModel):
    """User session schema"""
    id: int
    session_token: str
    expires_at: datetime
    ip_address: Optional[str]
    user_agent: Optional[str]
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class UserLoginHistory(BaseModel):
    """User login history schema"""
    id: int
    ip_address: Optional[str]
    user_agent: Optional[str]
    success: bool
    failure_reason: Optional[str]
    location: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


class UserProfile(BaseModel):
    """User profile summary"""
    id: int
    username: str
    full_name: str
    email: str
    department: Optional[str]
    position: Optional[str]
    is_active: bool
    last_login: Optional[datetime]
    roles: List[str] = []
    permissions: List[str] = []


class UserStats(BaseModel):
    """User statistics"""
    total_users: int
    active_users: int
    inactive_users: int
    verified_users: int
    locked_users: int
    recent_logins: int
    failed_logins_today: int
    new_users_this_month: int


class TwoFactorSetup(BaseModel):
    """Two-factor authentication setup"""
    secret: str = Field(..., description="2FA secret key")
    qr_code: str = Field(..., description="QR code for 2FA setup")
    backup_codes: List[str] = Field(..., description="Backup codes")


class TwoFactorVerify(BaseModel):
    """Two-factor authentication verification"""
    code: str = Field(..., min_length=6, max_length=6, description="6-digit verification code")
    
    @validator('code')
    def validate_code(cls, v):
        if not v.isdigit():
            raise ValueError('Code must be 6 digits')
        return v


class EmailVerification(BaseModel):
    """Email verification schema"""
    token: str = Field(..., description="Email verification token")


class UserBulkCreate(BaseModel):
    """Schema for bulk user creation"""
    users: List[UserCreate] = Field(..., min_items=1, max_items=100)
    default_role_ids: Optional[List[int]] = Field(None, description="Default roles for all users")
    send_welcome_emails: bool = Field(True, description="Send welcome emails to all users")


class UserBulkUpdate(BaseModel):
    """Schema for bulk user updates"""
    user_ids: List[int] = Field(..., min_items=1, max_items=1000)
    updates: UserUpdate
    send_notifications: bool = Field(False, description="Send notification emails")


class UserImport(BaseModel):
    """Schema for user import from CSV/Excel"""
    file_content: str = Field(..., description="Base64 encoded file content")
    file_format: str = Field(..., description="File format (csv, xlsx)")
    mapping: Dict[str, str] = Field(..., description="Column mapping")
    default_role_ids: Optional[List[int]] = None
    skip_duplicates: bool = Field(True, description="Skip duplicate users")
    update_existing: bool = Field(False, description="Update existing users")


class UserExport(BaseModel):
    """Schema for user export configuration"""
    user_ids: Optional[List[int]] = Field(None, description="Specific users to export")
    include_roles: bool = Field(True, description="Include role information")
    include_permissions: bool = Field(False, description="Include permission information")
    include_login_history: bool = Field(False, description="Include login history")
    format: str = Field("csv", description="Export format (csv, xlsx, json)")
    date_range: Optional[Dict[str, str]] = Field(None, description="Date range filter")


# Export schemas
__all__ = [
    "UserBase",
    "UserCreate", 
    "UserUpdate",
    "UserResponse",
    "UserDetail",
    "UserList",
    "UserProfile",
    "UserStats",
    "PasswordChange",
    "PasswordReset",
    "PasswordResetConfirm",
    "RoleBase",
    "RoleCreate",
    "RoleUpdate", 
    "Role",
    "PermissionBase",
    "PermissionCreate",
    "PermissionUpdate",
    "Permission",
    "UserSession",
    "UserLoginHistory",
    "TwoFactorSetup",
    "TwoFactorVerify",
    "EmailVerification",
    "UserBulkCreate",
    "UserBulkUpdate",
    "UserImport",
    "UserExport"
]