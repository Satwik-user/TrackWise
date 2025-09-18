"""
Notification service for TrackWise Railway Optimization System
"""

from typing import List, Optional, Dict, Any, Union
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, update
from sqlalchemy.orm import selectinload
import asyncio
import logging
from dataclasses import dataclass
from enum import Enum
import json
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders

from app.models.user import User
from app.models.notification import Notification, NotificationType, NotificationChannel, NotificationStatus
from app.core.websocket import websocket_manager
from app.utils.cache import get_redis_client
from app.config import settings

logger = logging.getLogger(__name__)


@dataclass
class NotificationTemplate:
    """Notification template structure"""
    template_id: str
    subject_template: str
    body_template: str
    html_template: Optional[str] = None
    variables: List[str] = None


class NotificationPriority(str, Enum):
    """Notification priority levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class NotificationService:
    """Service for managing notifications and alerts"""
    
    def __init__(self):
        self.templates = {}
        self.load_templates()
        self.email_config = {
            "smtp_server": settings.SMTP_HOST,
            "smtp_port": settings.SMTP_PORT,
            "username": settings.SMTP_USER,
            "password": settings.SMTP_PASSWORD,
            "use_tls": settings.SMTP_TLS,
            "from_email": settings.EMAIL_FROM,
            "from_name": settings.EMAIL_FROM_NAME
        }
    
    def load_templates(self):
        """Load notification templates"""
        
        self.templates = {
            "welcome": NotificationTemplate(
                template_id="welcome",
                subject_template="Welcome to TrackWise Railway System",
                body_template="Welcome {user_name}! Your account has been created successfully.",
                html_template="""
                <h2>Welcome to TrackWise Railway System</h2>
                <p>Dear {user_name},</p>
                <p>Your account has been created successfully. You can now access the railway optimization system.</p>
                <p>Best regards,<br>TrackWise Team</p>
                """,
                variables=["user_name"]
            ),
            "password_reset": NotificationTemplate(
                template_id="password_reset",
                subject_template="Password Reset Request",
                body_template="Click the link to reset your password: {reset_link}",
                html_template="""
                <h2>Password Reset Request</h2>
                <p>Dear {user_name},</p>
                <p>You have requested a password reset. Click the link below to reset your password:</p>
                <p><a href="{reset_link}">Reset Password</a></p>
                <p>This link will expire in 1 hour.</p>
                <p>If you didn't request this, please ignore this email.</p>
                """,
                variables=["user_name", "reset_link"]
            ),
            "email_verification": NotificationTemplate(
                template_id="email_verification",
                subject_template="Verify Your Email Address",
                body_template="Please verify your email: {verification_link}",
                html_template="""
                <h2>Email Verification</h2>
                <p>Dear {user_name},</p>
                <p>Please click the link below to verify your email address:</p>
                <p><a href="{verification_link}">Verify Email</a></p>
                <p>This link will expire in 24 hours.</p>
                """,
                variables=["user_name", "verification_link"]
            ),
            "train_delay_alert": NotificationTemplate(
                template_id="train_delay_alert",
                subject_template="Train Delay Alert - {train_number}",
                body_template="Train {train_number} is delayed by {delay_minutes} minutes.",
                html_template="""
                <h2>Train Delay Alert</h2>
                <p>Train <strong>{train_number}</strong> is currently delayed by <strong>{delay_minutes} minutes</strong>.</p>
                <p>Current status: {status}</p>
                <p>Expected arrival: {expected_arrival}</p>
                <p>Reason: {delay_reason}</p>
                """,
                variables=["train_number", "delay_minutes", "status", "expected_arrival", "delay_reason"]
            ),
            "optimization_complete": NotificationTemplate(
                template_id="optimization_complete",
                subject_template="Optimization Complete - {optimization_name}",
                body_template="Optimization {optimization_name} has completed with {improvement}% improvement.",
                html_template="""
                <h2>Optimization Complete</h2>
                <p>Your optimization run <strong>{optimization_name}</strong> has completed successfully.</p>
                <p>Results:</p>
                <ul>
                    <li>Improvement: {improvement}%</li>
                    <li>Runtime: {runtime} seconds</li>
                    <li>Objective Value: {objective_value}</li>
                </ul>
                <p><a href="{results_link}">View Results</a></p>
                """,
                variables=["optimization_name", "improvement", "runtime", "objective_value", "results_link"]
            ),
            "system_alert": NotificationTemplate(
                template_id="system_alert",
                subject_template="System Alert - {alert_type}",
                body_template="System alert: {alert_message}",
                html_template="""
                <h2>System Alert</h2>
                <p><strong>Alert Type:</strong> {alert_type}</p>
                <p><strong>Message:</strong> {alert_message}</p>
                <p><strong>Time:</strong> {timestamp}</p>
                <p><strong>Severity:</strong> {severity}</p>
                {action_required}
                """,
                variables=["alert_type", "alert_message", "timestamp", "severity", "action_required"]
            )
        }
    
    async def send_notification(
        self,
        db: AsyncSession,
        user_id: int,
        notification_type: NotificationType,
        template_id: str,
        template_variables: Dict[str, Any],
        channels: List[NotificationChannel] = None,
        priority: NotificationPriority = NotificationPriority.MEDIUM,
        schedule_for: Optional[datetime] = None
    ) -> Notification:
        """Send notification to user"""
        
        # Get user
        user_query = select(User).where(User.id == user_id)
        user_result = await db.execute(user_query)
        user = user_result.scalar_one_or_none()
        
        if not user:
            raise ValueError("User not found")
        
        # Default channels
        if channels is None:
            channels = [NotificationChannel.IN_APP, NotificationChannel.EMAIL]
        
        # Create notification record
        notification = Notification(
            user_id=user_id,
            notification_type=notification_type,
            title=self._render_template_subject(template_id, template_variables),
            message=self._render_template_body(template_id, template_variables),
            data=template_variables,
            channels=channels,
            priority=priority.value,
            scheduled_for=schedule_for or datetime.utcnow(),
            status=NotificationStatus.PENDING
        )
        
        db.add(notification)
        await db.commit()
        await db.refresh(notification)
        
        # Send immediately if not scheduled for later
        if schedule_for is None or schedule_for <= datetime.utcnow():
            await self._deliver_notification(db, notification, user)
        
        logger.info(f"Notification {notification.id} created for user {user_id}")
        
        return notification
    
    async def _deliver_notification(
        self,
        db: AsyncSession,
        notification: Notification,
        user: User
    ):
        """Deliver notification through specified channels"""
        
        delivery_results = {}
        
        # Deliver through each channel
        for channel in notification.channels:
            try:
                if channel == NotificationChannel.EMAIL:
                    result = await self._send_email(notification, user)
                elif channel == NotificationChannel.SMS:
                    result = await self._send_sms(notification, user)
                elif channel == NotificationChannel.IN_APP:
                    result = await self._send_in_app(notification, user)
                elif channel == NotificationChannel.PUSH:
                    result = await self._send_push(notification, user)
                elif channel == NotificationChannel.WEBSOCKET:
                    result = await self._send_websocket(notification, user)
                else:
                    result = {"success": False, "error": f"Unknown channel: {channel}"}
                
                delivery_results[channel.value] = result
                
            except Exception as e:
                logger.error(f"Failed to deliver notification {notification.id} via {channel}: {e}")
                delivery_results[channel.value] = {"success": False, "error": str(e)}
        
        # Update notification status
        successful_deliveries = sum(1 for result in delivery_results.values() if result.get("success"))
        
        if successful_deliveries > 0:
            notification.status = NotificationStatus.SENT
            notification.sent_at = datetime.utcnow()
        else:
            notification.status = NotificationStatus.FAILED
        
        notification.delivery_results = delivery_results
        await db.commit()
    
    async def _send_email(self, notification: Notification, user: User) -> Dict[str, Any]:
        """Send email notification"""
        
        if not user.email or not self.email_config["smtp_server"]:
            return {"success": False, "error": "Email not configured"}
        
        try:
            # Get template
            template_id = self._extract_template_id(notification)
            template = self.templates.get(template_id)
            
            if not template:
                return {"success": False, "error": "Template not found"}
            
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = notification.title
            msg['From'] = f"{self.email_config['from_name']} <{self.email_config['from_email']}>"
            msg['To'] = user.email
            
            # Add text part
            text_body = self._render_template_body(template_id, notification.data or {})
            text_part = MIMEText(text_body, 'plain')
            msg.attach(text_part)
            
            # Add HTML part if available
            if template.html_template:
                html_body = self._render_template_html(template_id, notification.data or {})
                html_part = MIMEText(html_body, 'html')
                msg.attach(html_part)
            
            # Send email
            with smtplib.SMTP(self.email_config["smtp_server"], self.email_config["smtp_port"]) as server:
                if self.email_config["use_tls"]:
                    server.starttls()
                
                if self.email_config["username"] and self.email_config["password"]:
                    server.login(self.email_config["username"], self.email_config["password"])
                
                server.send_message(msg)
            
            return {"success": True, "message_id": f"email_{notification.id}"}
            
        except Exception as e:
            logger.error(f"Email sending failed: {e}")
            return {"success": False, "error": str(e)}
    
    async def _send_sms(self, notification: Notification, user: User) -> Dict[str, Any]:
        """Send SMS notification"""
        
        if not user.phone_number:
            return {"success": False, "error": "Phone number not available"}
        
        # Mock SMS sending - would integrate with SMS provider
        logger.info(f"SMS would be sent to {user.phone_number}: {notification.message}")
        
        return {"success": True, "message_id": f"sms_{notification.id}"}
    
    async def _send_in_app(self, notification: Notification, user: User) -> Dict[str, Any]:
        """Send in-app notification"""
        
        try:
            # Store in Redis for real-time retrieval
            redis_client = await get_redis_client()
            
            notification_data = {
                "id": notification.id,
                "title": notification.title,
                "message": notification.message,
                "type": notification.notification_type.value,
                "priority": notification.priority,
                "timestamp": notification.created_at.isoformat(),
                "data": notification.data
            }
            
            # Add to user's notification list
            key = f"notifications:{user.id}"
            await redis_client.lpush(key, json.dumps(notification_data))
            await redis_client.ltrim(key, 0, 99)  # Keep last 100 notifications
            await redis_client.expire(key, 86400 * 30)  # 30 days
            
            return {"success": True, "stored_in_app": True}
            
        except Exception as e:
            logger.error(f"In-app notification failed: {e}")
            return {"success": False, "error": str(e)}
    
    async def _send_push(self, notification: Notification, user: User) -> Dict[str, Any]:
        """Send push notification"""
        
        # Mock push notification - would integrate with push service
        logger.info(f"Push notification would be sent to user {user.id}: {notification.title}")
        
        return {"success": True, "message_id": f"push_{notification.id}"}
    
    async def _send_websocket(self, notification: Notification, user: User) -> Dict[str, Any]:
        """Send WebSocket notification"""
        
        try:
            # Send via WebSocket manager
            await websocket_manager.send_to_user(
                user.id,
                {
                    "type": "notification",
                    "data": {
                        "id": notification.id,
                        "title": notification.title,
                        "message": notification.message,
                        "notification_type": notification.notification_type.value,
                        "priority": notification.priority,
                        "timestamp": notification.created_at.isoformat(),
                        "data": notification.data
                    }
                }
            )
            
            return {"success": True, "sent_via_websocket": True}
            
        except Exception as e:
            logger.error(f"WebSocket notification failed: {e}")
            return {"success": False, "error": str(e)}
    
    def _render_template_subject(self, template_id: str, variables: Dict[str, Any]) -> str:
        """Render notification subject from template"""
        
        template = self.templates.get(template_id)
        if not template:
            return "Notification"
        
        try:
            return template.subject_template.format(**variables)
        except KeyError as e:
            logger.warning(f"Missing template variable {e} in subject for {template_id}")
            return template.subject_template
    
    def _render_template_body(self, template_id: str, variables: Dict[str, Any]) -> str:
        """Render notification body from template"""
        
        template = self.templates.get(template_id)
        if not template:
            return "No content"
        
        try:
            return template.body_template.format(**variables)
        except KeyError as e:
            logger.warning(f"Missing template variable {e} in body for {template_id}")
            return template.body_template
    
    def _render_template_html(self, template_id: str, variables: Dict[str, Any]) -> str:
        """Render HTML notification from template"""
        
        template = self.templates.get(template_id)
        if not template or not template.html_template:
            return self._render_template_body(template_id, variables)
        
        try:
            return template.html_template.format(**variables)
        except KeyError as e:
            logger.warning(f"Missing template variable {e} in HTML for {template_id}")
            return template.html_template
    
    def _extract_template_id(self, notification: Notification) -> str:
        """Extract template ID from notification data"""
        
        if notification.data and "template_id" in notification.data:
            return notification.data["template_id"]
        
        # Default based on notification type
        type_mapping = {
            NotificationType.TRAIN_DELAY: "train_delay_alert",
            NotificationType.OPTIMIZATION_COMPLETE: "optimization_complete",
            NotificationType.SYSTEM_ALERT: "system_alert",
            NotificationType.MAINTENANCE_ALERT: "system_alert",
            NotificationType.USER_ACTION: "system_alert"
        }
        
        return type_mapping.get(notification.notification_type, "system_alert")
    
    # Convenience methods for common notifications
    
    async def send_welcome_email(
        self,
        db: AsyncSession,
        user_id: int,
        user_name: str
    ):
        """Send welcome email to new user"""
        
        await self.send_notification(
            db,
            user_id=user_id,
            notification_type=NotificationType.USER_ACTION,
            template_id="welcome",
            template_variables={"user_name": user_name},
            channels=[NotificationChannel.EMAIL],
            priority=NotificationPriority.LOW
        )
    
    async def send_password_reset_email(
        self,
        email: str,
        user_name: str,
        reset_token: str
    ):
        """Send password reset email"""
        
        reset_link = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"
        
        # For password reset, we send directly without storing in DB
        # since user might not be authenticated
        
        template = self.templates["password_reset"]
        variables = {"user_name": user_name, "reset_link": reset_link}
        
        subject = template.subject_template.format(**variables)
        html_body = template.html_template.format(**variables)
        
        # Send email directly
        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{self.email_config['from_name']} <{self.email_config['from_email']}>"
            msg['To'] = email
            
            html_part = MIMEText(html_body, 'html')
            msg.attach(html_part)
            
            with smtplib.SMTP(self.email_config["smtp_server"], self.email_config["smtp_port"]) as server:
                if self.email_config["use_tls"]:
                    server.starttls()
                
                if self.email_config["username"] and self.email_config["password"]:
                    server.login(self.email_config["username"], self.email_config["password"])
                
                server.send_message(msg)
            
            logger.info(f"Password reset email sent to {email}")
            
        except Exception as e:
            logger.error(f"Failed to send password reset email: {e}")
            raise
    
    async def send_email_verification(
        self,
        email: str,
        user_name: str,
        verification_token: str
    ):
        """Send email verification"""
        
        verification_link = f"{settings.FRONTEND_URL}/verify-email?token={verification_token}"
        
        template = self.templates["email_verification"]
        variables = {"user_name": user_name, "verification_link": verification_link}
        
        subject = template.subject_template.format(**variables)
        html_body = template.html_template.format(**variables)
        
        # Send email directly
        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{self.email_config['from_name']} <{self.email_config['from_email']}>"
            msg['To'] = email
            
            html_part = MIMEText(html_body, 'html')
            msg.attach(html_part)
            
            with smtplib.SMTP(self.email_config["smtp_server"], self.email_config["smtp_port"]) as server:
                if self.email_config["use_tls"]:
                    server.starttls()
                
                if self.email_config["username"] and self.email_config["password"]:
                    server.login(self.email_config["username"], self.email_config["password"])
                
                server.send_message(msg)
            
            logger.info(f"Email verification sent to {email}")
        except Exception as e:
            logger.error(f"Failed to send email verification: {e}")
            raise
    
    async def send_train_delay_alert(
        self,
        db: AsyncSession,
        user_id: int,
        train_number: str,
        delay_minutes: int,
        status: str,
        expected_arrival: str,
        delay_reason: str = "Unknown"
    ):
        """Send train delay alert"""
        
        await self.send_notification(
            db,
            user_id=user_id,
            notification_type=NotificationType.TRAIN_DELAY,
            template_id="train_delay_alert",
            template_variables={
                "train_number": train_number,
                "delay_minutes": delay_minutes,
                "status": status,
                "expected_arrival": expected_arrival,
                "delay_reason": delay_reason
            },
            channels=[NotificationChannel.IN_APP, NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
            priority=NotificationPriority.HIGH if delay_minutes > 30 else NotificationPriority.MEDIUM
        )
    
    async def send_optimization_complete_notification(
        self,
        db: AsyncSession,
        user_id: int,
        optimization_name: str,
        improvement: float,
        runtime: float,
        objective_value: float,
        results_link: str
    ):
        """Send optimization completion notification"""
        
        await self.send_notification(
            db,
            user_id=user_id,
            notification_type=NotificationType.OPTIMIZATION_COMPLETE,
            template_id="optimization_complete",
            template_variables={
                "optimization_name": optimization_name,
                "improvement": improvement,
                "runtime": runtime,
                "objective_value": objective_value,
                "results_link": results_link
            },
            channels=[NotificationChannel.IN_APP, NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
            priority=NotificationPriority.MEDIUM
        )
    
    async def send_system_alert(
        self,
        db: AsyncSession,
        user_ids: List[int],
        alert_type: str,
        alert_message: str,
        severity: str = "medium",
        action_required: str = ""
    ):
        """Send system alert to multiple users"""
        
        for user_id in user_ids:
            await self.send_notification(
                db,
                user_id=user_id,
                notification_type=NotificationType.SYSTEM_ALERT,
                template_id="system_alert",
                template_variables={
                    "alert_type": alert_type,
                    "alert_message": alert_message,
                    "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
                    "severity": severity,
                    "action_required": f"<p><strong>Action Required:</strong> {action_required}</p>" if action_required else ""
                },
                channels=[NotificationChannel.IN_APP, NotificationChannel.WEBSOCKET],
                priority=NotificationPriority.URGENT if severity == "critical" else NotificationPriority.HIGH
            )
    
    async def get_user_notifications(
        self,
        db: AsyncSession,
        user_id: int,
        limit: int = 50,
        offset: int = 0,
        unread_only: bool = False
    ) -> Tuple[List[Notification], int]:
        """Get user notifications with pagination"""
        
        query = select(Notification).where(Notification.user_id == user_id)
        count_query = select(func.count(Notification.id)).where(Notification.user_id == user_id)
        
        if unread_only:
            query = query.where(Notification.read_at.is_(None))
            count_query = count_query.where(Notification.read_at.is_(None))
        
        # Get total count
        count_result = await db.execute(count_query)
        total = count_result.scalar()
        
        # Get notifications with pagination
        query = query.order_by(Notification.created_at.desc()).offset(offset).limit(limit)
        result = await db.execute(query)
        notifications = result.scalars().all()
        
        return list(notifications), total
    
    async def mark_notification_read(
        self,
        db: AsyncSession,
        notification_id: int,
        user_id: int
    ) -> bool:
        """Mark notification as read"""
        
        notification_query = select(Notification).where(
            and_(Notification.id == notification_id, Notification.user_id == user_id)
        )
        result = await db.execute(notification_query)
        notification = result.scalar_one_or_none()
        
        if not notification:
            return False
        
        notification.read_at = datetime.utcnow()
        await db.commit()
        
        return True
    
    async def mark_all_notifications_read(
        self,
        db: AsyncSession,
        user_id: int
    ) -> int:
        """Mark all user notifications as read"""
        
        update_query = update(Notification).where(
            and_(
                Notification.user_id == user_id,
                Notification.read_at.is_(None)
            )
        ).values(read_at=datetime.utcnow())
        
        result = await db.execute(update_query)
        await db.commit()
        
        return result.rowcount
    
    async def delete_notification(
        self,
        db: AsyncSession,
        notification_id: int,
        user_id: int
    ) -> bool:
        """Delete user notification"""
        
        notification_query = select(Notification).where(
            and_(Notification.id == notification_id, Notification.user_id == user_id)
        )
        result = await db.execute(notification_query)
        notification = result.scalar_one_or_none()
        
        if not notification:
            return False
        
        await db.delete(notification)
        await db.commit()
        
        return True
    
    async def process_scheduled_notifications(self, db: AsyncSession):
        """Process notifications scheduled for delivery"""
        
        # Get notifications that should be sent now
        scheduled_query = select(Notification).where(
            and_(
                Notification.status == NotificationStatus.PENDING,
                Notification.scheduled_for <= datetime.utcnow()
            )
        ).options(selectinload(Notification.user))
        
        result = await db.execute(scheduled_query)
        notifications = result.scalars().all()
        
        for notification in notifications:
            try:
                await self._deliver_notification(db, notification, notification.user)
                logger.info(f"Delivered scheduled notification {notification.id}")
            except Exception as e:
                logger.error(f"Failed to deliver scheduled notification {notification.id}: {e}")
                notification.status = NotificationStatus.FAILED
                await db.commit()
    
    async def cleanup_old_notifications(
        self,
        db: AsyncSession,
        days_to_keep: int = 90
    ) -> int:
        """Clean up old notifications"""
        
        cutoff_date = datetime.utcnow() - timedelta(days=days_to_keep)
        
        # Delete old notifications
        delete_query = select(Notification).where(
            Notification.created_at < cutoff_date
        )
        
        result = await db.execute(delete_query)
        old_notifications = result.scalars().all()
        
        count = 0
        for notification in old_notifications:
            await db.delete(notification)
            count += 1
        
        await db.commit()
        
        logger.info(f"Cleaned up {count} old notifications")
        return count
    
    async def get_notification_statistics(
        self,
        db: AsyncSession,
        user_id: Optional[int] = None,
        days: int = 30
    ) -> Dict[str, Any]:
        """Get notification statistics"""
        
        since_date = datetime.utcnow() - timedelta(days=days)
        
        base_query = select(Notification).where(Notification.created_at >= since_date)
        
        if user_id:
            base_query = base_query.where(Notification.user_id == user_id)
        
        # Total notifications
        total_result = await db.execute(
            select(func.count(Notification.id)).where(
                base_query.whereclause if hasattr(base_query, 'whereclause') else True
            )
        )
        total_notifications = total_result.scalar()
        
        # Notifications by type
        type_query = select(
            Notification.notification_type,
            func.count(Notification.id).label('count')
        ).where(
            Notification.created_at >= since_date
        )
        
        if user_id:
            type_query = type_query.where(Notification.user_id == user_id)
        
        type_query = type_query.group_by(Notification.notification_type)
        type_result = await db.execute(type_query)
        type_counts = {row.notification_type.value: row.count for row in type_result}
        
        # Notifications by status
        status_query = select(
            Notification.status,
            func.count(Notification.id).label('count')
        ).where(
            Notification.created_at >= since_date
        )
        
        if user_id:
            status_query = status_query.where(Notification.user_id == user_id)
        
        status_query = status_query.group_by(Notification.status)
        status_result = await db.execute(status_query)
        status_counts = {row.status.value: row.count for row in status_result}
        
        # Read vs unread
        read_query = select(
            func.count(Notification.id).filter(Notification.read_at.isnot(None)).label('read_count'),
            func.count(Notification.id).filter(Notification.read_at.is_(None)).label('unread_count')
        ).where(
            Notification.created_at >= since_date
        )
        
        if user_id:
            read_query = read_query.where(Notification.user_id == user_id)
        
        read_result = await db.execute(read_query)
        read_stats = read_result.first()
        
        return {
            "period_days": days,
            "total_notifications": total_notifications,
            "read_notifications": read_stats.read_count,
            "unread_notifications": read_stats.unread_count,
            "read_percentage": (read_stats.read_count / total_notifications * 100) if total_notifications > 0 else 0,
            "notifications_by_type": type_counts,
            "notifications_by_status": status_counts,
            "user_specific": user_id is not None
        }


# Create service instance
notification_service = NotificationService()

# Export service
__all__ = ["notification_service", "NotificationService", "NotificationPriority", "NotificationTemplate"]