"""
Notification Service for TrackWise Railway Optimization System
"""

import logging
import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from enum import Enum

logger = logging.getLogger(__name__)


class NotificationType(str, Enum):
    """Types of notifications"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    ALERT = "alert"


class NotificationService:
    """Service for managing notifications and alerts"""
    
    def __init__(self):
        self.notifications: List[Dict[str, Any]] = []
        self.subscribers: List[Any] = []
    
    async def send_notification(
        self,
        title: str,
        message: str,
        notification_type: NotificationType = NotificationType.INFO,
        recipient: Optional[str] = None,
        data: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Send a notification"""
        try:
            notification = {
                "id": len(self.notifications) + 1,
                "title": title,
                "message": message,
                "type": notification_type.value,
                "recipient": recipient,
                "data": data or {},
                "created_at": datetime.utcnow(),
                "read": False
            }
            
            self.notifications.append(notification)
            
            # Log notification
            logger.info(f"Notification sent: {title} ({notification_type.value})")
            
            # Notify subscribers (WebSocket, etc.)
            await self._notify_subscribers(notification)
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to send notification: {e}")
            return False
    
    async def process_scheduled_notifications(self, db_session) -> None:
        """Process any scheduled notifications"""
        try:
            # This would typically check for scheduled notifications in the database
            # For now, we'll just log that the process ran
            logger.debug("Processing scheduled notifications...")
            
            # Simulate processing
            await asyncio.sleep(0.1)
            
        except Exception as e:
            logger.error(f"Error processing scheduled notifications: {e}")
    
    async def cleanup_old_notifications(self, db_session) -> None:
        """Clean up old notifications"""
        try:
            # Remove notifications older than 30 days
            cutoff_date = datetime.utcnow() - timedelta(days=30)
            
            # Filter out old notifications
            self.notifications = [
                notif for notif in self.notifications
                if notif["created_at"] > cutoff_date
            ]
            
            logger.info("Old notifications cleaned up")
            
        except Exception as e:
            logger.error(f"Error cleaning up notifications: {e}")
    
    def get_notifications(
        self,
        recipient: Optional[str] = None,
        unread_only: bool = False
    ) -> List[Dict[str, Any]]:
        """Get notifications for a recipient"""
        notifications = self.notifications
        
        if recipient:
            notifications = [n for n in notifications if n.get("recipient") == recipient]
        
        if unread_only:
            notifications = [n for n in notifications if not n.get("read", False)]
        
        return sorted(notifications, key=lambda x: x["created_at"], reverse=True)
    
    async def mark_notification_read(self, notification_id: int) -> bool:
        """Mark a notification as read"""
        try:
            for notification in self.notifications:
                if notification["id"] == notification_id:
                    notification["read"] = True
                    return True
            return False
        except Exception as e:
            logger.error(f"Error marking notification as read: {e}")
            return False
    
    async def _notify_subscribers(self, notification: Dict[str, Any]) -> None:
        """Notify all subscribers about a new notification"""
        for subscriber in self.subscribers:
            try:
                await subscriber(notification)
            except Exception as e:
                logger.warning(f"Error notifying subscriber: {e}")
    
    def subscribe(self, callback) -> None:
        """Subscribe to notifications"""
        self.subscribers.append(callback)
    
    def unsubscribe(self, callback) -> None:
        """Unsubscribe from notifications"""
        if callback in self.subscribers:
            self.subscribers.remove(callback)


# Global notification service instance
notification_service = NotificationService()