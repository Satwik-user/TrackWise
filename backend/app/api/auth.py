"""
Authentication API routes for TrackWise Railway Optimization System
"""

from datetime import datetime, timedelta
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request, Form
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from app.database import get_async_session
from app.core.security import (
    create_access_token,
    create_refresh_token,
    verify_password,
    verify_token,
    hash_password
)
from app.models.user import User, UserLoginHistory
from app.schemas.user import (
    UserResponse,
    PasswordReset,
    PasswordResetConfirm,
    EmailVerification,
    TwoFactorSetup,
    TwoFactorVerify
)
from app.services.user_service import user_service
from app.services.notification_service import notification_service
from app.utils.exceptions import AuthenticationError, ValidationError
from app.api.dependencies import auth_rate_limiter, get_request_info
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()


class TokenResponse(BaseModel):
    """Token response schema"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


@router.post("/login", response_model=TokenResponse)
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_async_session),
    request_info: dict = Depends(get_request_info),
    _: Any = Depends(auth_rate_limiter)
):
    """
    User login with username/email and password
    """
    try:
        # Find user by username or email
        user = await user_service.get_by_username_or_email(db, form_data.username)
        
        if not user:
            await _log_login_attempt(
                db, None, form_data.username, False, 
                request_info.get("client_ip"), request_info.get("user_agent"),
                "User not found"
            )
            raise AuthenticationError("Invalid credentials")
        
        # Check if account is locked
        if user.is_locked:
            await _log_login_attempt(
                db, user.id, user.username, False,
                request_info.get("client_ip"), request_info.get("user_agent"),
                "Account locked"
            )
            raise AuthenticationError("Account is locked due to too many failed login attempts")
        
        # Verify password
        if not verify_password(form_data.password, user.hashed_password):
            # Record failed attempt
            user.record_login_attempt(False, request_info.get("client_ip"))
            await db.commit()
            
            await _log_login_attempt(
                db, user.id, user.username, False,
                request_info.get("client_ip"), request_info.get("user_agent"),
                "Invalid password"
            )
            raise AuthenticationError("Invalid credentials")
        
        # Check if account is active
        if not user.is_active:
            await _log_login_attempt(
                db, user.id, user.username, False,
                request_info.get("client_ip"), request_info.get("user_agent"),
                "Account disabled"
            )
            raise AuthenticationError("Account is disabled")
        
        # Check if email is verified (if required)
        if not user.is_verified and settings.REQUIRE_EMAIL_VERIFICATION:
            await _log_login_attempt(
                db, user.id, user.username, False,
                request_info.get("client_ip"), request_info.get("user_agent"),
                "Email not verified"
            )
            raise AuthenticationError("Email address not verified")
        
        # Check if password has expired
        if user.password_expired:
            await _log_login_attempt(
                db, user.id, user.username, False,
                request_info.get("client_ip"), request_info.get("user_agent"),
                "Password expired"
            )
            raise AuthenticationError("Password has expired. Please reset your password.")
        
        # Create tokens
        access_token = create_access_token(
            data={"sub": str(user.id), "username": user.username}
        )
        refresh_token = create_refresh_token(
            data={"sub": str(user.id), "username": user.username}
        )
        
        # Record successful login
        user.record_login_attempt(True, request_info.get("client_ip"))
        await db.commit()
        
        await _log_login_attempt(
            db, user.id, user.username, True,
            request_info.get("client_ip"), request_info.get("user_agent"),
            None
        )
        
        logger.info(f"User {user.username} logged in successfully from {request_info.get('client_ip')}")
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user=UserResponse.from_orm(user)
        )
        
    except AuthenticationError:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    refresh_token: str = Form(...),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Refresh access token using refresh token
    """
    try:
        # Verify refresh token
        payload = verify_token(refresh_token, token_type="refresh")
        user_id = payload.get("sub")
        
        if not user_id:
            raise AuthenticationError("Invalid refresh token")
        
        # Get user
        user = await user_service.get_by_id(db, int(user_id))
        if not user or not user.is_active:
            raise AuthenticationError("User not found or inactive")
        
        # Create new tokens
        new_access_token = create_access_token(
            data={"sub": str(user.id), "username": user.username}
        )
        new_refresh_token = create_refresh_token(
            data={"sub": str(user.id), "username": user.username}
        )
        
        return TokenResponse(
            access_token=new_access_token,
            refresh_token=new_refresh_token,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user=UserResponse.from_orm(user)
        )
        
    except Exception as e:
        logger.error(f"Token refresh error: {e}")
        raise AuthenticationError("Invalid refresh token")


@router.post("/logout")
async def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
    request_info: dict = Depends(get_request_info)
):
    """
    User logout
    """
    try:
        # Invalidate user session
        current_user.invalidate_session()
        await db.commit()
        
        # Log logout
        await _log_login_attempt(
            db, current_user.id, current_user.username, True,
            request_info.get("client_ip"), request_info.get("user_agent"),
            "Logout"
        )
        
        logger.info(f"User {current_user.username} logged out")
        
        return {"message": "Successfully logged out"}
        
    except Exception as e:
        logger.error(f"Logout error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Logout failed"
        )


@router.post("/password-reset")
async def request_password_reset(
    password_reset: PasswordReset,
    db: AsyncSession = Depends(get_async_session),
    _: Any = Depends(auth_rate_limiter)
):
    """
    Request password reset email
    """
    try:
        user = await user_service.get_by_email(db, password_reset.email)
        
        if user and user.is_active:
            # Generate reset token
            reset_token = user.generate_password_reset_token()
            await db.commit()
            
            # Send reset email
            await notification_service.send_password_reset_email(
                user.email, user.full_name, reset_token
            )
            
            logger.info(f"Password reset requested for user {user.username}")
        
        # Always return success to prevent email enumeration
        return {"message": "If the email exists, a password reset link has been sent"}
        
    except Exception as e:
        logger.error(f"Password reset request error: {e}")
        return {"message": "If the email exists, a password reset link has been sent"}


@router.post("/password-reset/confirm")
async def confirm_password_reset(
    reset_data: PasswordResetConfirm,
    db: AsyncSession = Depends(get_async_session)
):
    """
    Confirm password reset with token
    """
    try:
        # Find user by reset token
        user = await user_service.get_by_password_reset_token(db, reset_data.token)
        
        if not user or not user.verify_password_reset_token(reset_data.token):
            raise ValidationError("Invalid or expired reset token")
        
        # Set new password
        user.set_password(reset_data.new_password)
        user.clear_password_reset_token()
        await db.commit()
        
        logger.info(f"Password reset completed for user {user.username}")
        
        return {"message": "Password has been reset successfully"}
        
    except ValidationError:
        raise
    except Exception as e:
        logger.error(f"Password reset confirm error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password reset failed"
        )


@router.post("/verify-email")
async def verify_email(
    verification: EmailVerification,
    db: AsyncSession = Depends(get_async_session)
):
    """
    Verify email address with token
    """
    try:
        # Find user by verification token
        user = await user_service.get_by_email_verification_token(db, verification.token)
        
        if not user or not user.verify_email_token(verification.token):
            raise ValidationError("Invalid or expired verification token")
        
        await db.commit()
        
        logger.info(f"Email verified for user {user.username}")
        
        return {"message": "Email has been verified successfully"}
        
    except ValidationError:
        raise
    except Exception as e:
        logger.error(f"Email verification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Email verification failed"
        )


@router.post("/resend-verification")
async def resend_verification_email(
    email: str = Form(...),
    db: AsyncSession = Depends(get_async_session),
    _: Any = Depends(auth_rate_limiter)
):
    """
    Resend email verification
    """
    try:
        user = await user_service.get_by_email(db, email)
        
        if user and user.is_active and not user.is_verified:
            # Generate new verification token
            verification_token = user.generate_email_verification_token()
            await db.commit()
            
            # Send verification email
            await notification_service.send_email_verification(
                user.email, user.full_name, verification_token
            )
            
            logger.info(f"Verification email resent to {user.username}")
        
        # Always return success to prevent email enumeration
        return {"message": "If the email exists and is unverified, a verification email has been sent"}
        
    except Exception as e:
        logger.error(f"Resend verification error: {e}")
        return {"message": "If the email exists and is unverified, a verification email has been sent"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """
    Get current user information
    """
    return UserResponse.from_orm(current_user)


@router.post("/2fa/setup", response_model=TwoFactorSetup)
async def setup_two_factor_auth(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Setup two-factor authentication
    """
    try:
        import pyotp
        import qrcode
        import io
        import base64
        
        # Generate secret
        secret = pyotp.random_base32()
        
        # Create TOTP URI
        totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
            name=current_user.email,
            issuer_name="TrackWise Railway System"
        )
        
        # Generate QR code
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(totp_uri)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        buffered = io.BytesIO()
        img.save(buffered, format="PNG")
        qr_code_b64 = base64.b64encode(buffered.getvalue()).decode()
        
        # Generate backup codes
        backup_codes = [pyotp.random_base32()[:8] for _ in range(10)]
        
        # Store secret temporarily (not enabled until verified)
        current_user.two_factor_secret = secret
        await db.commit()
        
        return TwoFactorSetup(
            secret=secret,
            qr_code=f"data:image/png;base64,{qr_code_b64}",
            backup_codes=backup_codes
        )
        
    except Exception as e:
        logger.error(f"2FA setup error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Two-factor authentication setup failed"
        )


@router.post("/2fa/verify")
async def verify_two_factor_auth(
    verification: TwoFactorVerify,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Verify and enable two-factor authentication
    """
    try:
        import pyotp
        
        if not current_user.two_factor_secret:
            raise ValidationError("Two-factor authentication not set up")
        
        # Verify code
        totp = pyotp.TOTP(current_user.two_factor_secret)
        if not totp.verify(verification.code):
            raise ValidationError("Invalid verification code")
        
        # Enable 2FA
        current_user.two_factor_enabled = True
        await db.commit()
        
        logger.info(f"2FA enabled for user {current_user.username}")
        
        return {"message": "Two-factor authentication enabled successfully"}
        
    except ValidationError:
        raise
    except Exception as e:
        logger.error(f"2FA verification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Two-factor authentication verification failed"
        )


@router.post("/2fa/disable")
async def disable_two_factor_auth(
    verification: TwoFactorVerify,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Disable two-factor authentication
    """
    try:
        import pyotp
        
        if not current_user.two_factor_enabled:
            raise ValidationError("Two-factor authentication is not enabled")
        
        # Verify code before disabling
        totp = pyotp.TOTP(current_user.two_factor_secret)
        if not totp.verify(verification.code):
            raise ValidationError("Invalid verification code")
        
        # Disable 2FA
        current_user.two_factor_enabled = False
        current_user.two_factor_secret = None
        await db.commit()
        
        logger.info(f"2FA disabled for user {current_user.username}")
        
        return {"message": "Two-factor authentication disabled successfully"}
        
    except ValidationError:
        raise
    except Exception as e:
        logger.error(f"2FA disable error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Two-factor authentication disable failed"
        )


async def _log_login_attempt(
    db: AsyncSession,
    user_id: Optional[int],
    username: str,
    success: bool,
    ip_address: Optional[str],
    user_agent: Optional[str],
    failure_reason: Optional[str]
):
    """
    Log login attempt to database
    """
    try:
        login_history = UserLoginHistory(
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            success=success,
            failure_reason=failure_reason
        )
        
        db.add(login_history)
        await db.commit()
        
    except Exception as e:
        logger.error(f"Failed to log login attempt: {e}")


# Export router
__all__ = ["router"]