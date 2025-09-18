"""
WebSocket routes for TrackWise Railway Optimization System
"""

import json
import asyncio
from typing import Any, Dict
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from datetime import datetime

from app.core.websocket import websocket_manager
from app.core.security import verify_token

router = APIRouter()


class WebSocketAuth:
    """WebSocket authentication handler"""
    
    @staticmethod
    def get_user_from_token(token: str) -> Dict[str, Any]:
        """Get user from WebSocket token"""
        try:
            payload = verify_token(token)
            if not payload:
                raise HTTPException(status_code=401, detail="Invalid token")
            return payload
        except Exception:
            raise HTTPException(status_code=401, detail="Authentication failed")


@router.websocket("/connect")
async def websocket_endpoint(websocket: WebSocket, token: str = None):
    """Main WebSocket endpoint for real-time communication"""
    
    user = None
    if token:
        try:
            user = WebSocketAuth.get_user_from_token(token)
        except Exception:
            await websocket.close(code=1008, reason="Authentication failed")
            return
    
    client_info = {
        "user": user,
        "connected_at": datetime.utcnow(),
        "client_type": "web"
    }
    
    await websocket_manager.connect(websocket, client_info)
    
    try:
        # Send welcome message
        await websocket_manager.send_personal_json({
            "type": "welcome",
            "message": "Connected to TrackWise WebSocket",
            "timestamp": datetime.utcnow().isoformat(),
            "user": user["username"] if user else "anonymous"
        }, websocket)
        
        # Listen for messages
        while True:
            try:
                # Wait for message with timeout
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                await handle_websocket_message(websocket, data, user)
                
            except asyncio.TimeoutError:
                # Send ping to keep connection alive
                await websocket_manager.send_personal_json({
                    "type": "ping",
                    "timestamp": datetime.utcnow().isoformat()
                }, websocket)
                
    except WebSocketDisconnect:
        websocket_manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        websocket_manager.disconnect(websocket)


@router.websocket("/trains")
async def train_updates_websocket(websocket: WebSocket, token: str = None):
    """WebSocket endpoint for train updates"""
    
    user = None
    if token:
        try:
            user = WebSocketAuth.get_user_from_token(token)
        except Exception:
            await websocket.close(code=1008, reason="Authentication failed")
            return
    
    await websocket_manager.connect(websocket, {"user": user, "subscription": "trains"})
    
    try:
        # Send initial train data
        await websocket_manager.send_personal_json({
            "type": "train_data",
            "data": get_current_train_data(),
            "timestamp": datetime.utcnow().isoformat()
        }, websocket)
        
        # Start sending periodic updates
        asyncio.create_task(send_train_updates(websocket))
        
        # Keep connection alive
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=60.0)
                message = json.loads(data)
                
                if message.get("type") == "subscribe_train":
                    train_id = message.get("train_id")
                    await websocket_manager.send_personal_json({
                        "type": "subscription_confirmed",
                        "train_id": train_id,
                        "message": f"Subscribed to train {train_id} updates"
                    }, websocket)
                    
            except asyncio.TimeoutError:
                await websocket_manager.send_personal_json({
                    "type": "heartbeat",
                    "timestamp": datetime.utcnow().isoformat()
                }, websocket)
                
    except WebSocketDisconnect:
        websocket_manager.disconnect(websocket)
    except Exception as e:
        print(f"Train WebSocket error: {e}")
        websocket_manager.disconnect(websocket)


@router.websocket("/optimization")
async def optimization_updates_websocket(websocket: WebSocket, token: str = None):
    """WebSocket endpoint for optimization progress updates"""
    
    user = None
    if token:
        try:
            user = WebSocketAuth.get_user_from_token(token)
        except Exception:
            await websocket.close(code=1008, reason="Authentication failed")
            return
    
    await websocket_manager.connect(websocket, {"user": user, "subscription": "optimization"})
    
    try:
        # Send initial optimization status
        await websocket_manager.send_personal_json({
            "type": "optimization_status",
            "data": get_current_optimization_status(),
            "timestamp": datetime.utcnow().isoformat()
        }, websocket)
        
        # Keep connection alive and handle messages
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                message = json.loads(data)
                
                if message.get("type") == "get_optimization_status":
                    optimization_id = message.get("optimization_id")
                    status = get_optimization_status_by_id(optimization_id)
                    await websocket_manager.send_personal_json({
                        "type": "optimization_update",
                        "optimization_id": optimization_id,
                        "status": status
                    }, websocket)
                    
            except asyncio.TimeoutError:
                # Send periodic optimization updates
                await websocket_manager.send_personal_json({
                    "type": "optimization_heartbeat",
                    "active_optimizations": get_active_optimization_count(),
                    "timestamp": datetime.utcnow().isoformat()
                }, websocket)
                
    except WebSocketDisconnect:
        websocket_manager.disconnect(websocket)
    except Exception as e:
        print(f"Optimization WebSocket error: {e}")
        websocket_manager.disconnect(websocket)


@router.websocket("/alerts")
async def alerts_websocket(websocket: WebSocket, token: str = None):
    """WebSocket endpoint for real-time alerts"""
    
    user = None
    if token:
        try:
            user = WebSocketAuth.get_user_from_token(token)
        except Exception:
            await websocket.close(code=1008, reason="Authentication failed")
            return
    
    await websocket_manager.connect(websocket, {"user": user, "subscription": "alerts"})
    
    try:
        # Send current alerts
        await websocket_manager.send_personal_json({
            "type": "current_alerts",
            "alerts": get_current_alerts(),
            "timestamp": datetime.utcnow().isoformat()
        }, websocket)
        
        # Keep connection alive
        while True:
            try:
                await asyncio.wait_for(websocket.receive_text(), timeout=60.0)
            except asyncio.TimeoutError:
                # Check for new alerts
                new_alerts = check_for_new_alerts()
                if new_alerts:
                    await websocket_manager.send_personal_json({
                        "type": "new_alerts",
                        "alerts": new_alerts,
                        "timestamp": datetime.utcnow().isoformat()
                    }, websocket)
                
    except WebSocketDisconnect:
        websocket_manager.disconnect(websocket)
    except Exception as e:
        print(f"Alerts WebSocket error: {e}")
        websocket_manager.disconnect(websocket)


async def handle_websocket_message(websocket: WebSocket, data: str, user: Dict[str, Any] = None):
    """Handle incoming WebSocket messages"""
    
    try:
        message = json.loads(data)
        message_type = message.get("type")
        
        if message_type == "ping":
            await websocket_manager.send_personal_json({
                "type": "pong",
                "timestamp": datetime.utcnow().isoformat()
            }, websocket)
            
        elif message_type == "get_system_status":
            await websocket_manager.send_personal_json({
                "type": "system_status",
                "data": get_system_status(),
                "timestamp": datetime.utcnow().isoformat()
            }, websocket)
            
        elif message_type == "subscribe":
            subscription_type = message.get("subscription_type")
            await websocket_manager.send_personal_json({
                "type": "subscription_confirmed",
                "subscription_type": subscription_type,
                "message": f"Subscribed to {subscription_type} updates"
            }, websocket)
            
        elif message_type == "broadcast" and user and user.get("is_superuser"):
            # Allow superusers to broadcast messages
            broadcast_message = {
                "type": "broadcast",
                "message": message.get("message"),
                "from": user.get("username"),
                "timestamp": datetime.utcnow().isoformat()
            }
            await websocket_manager.broadcast_json(broadcast_message)
            
        else:
            await websocket_manager.send_personal_json({
                "type": "error",
                "message": f"Unknown message type: {message_type}"
            }, websocket)
            
    except json.JSONDecodeError:
        await websocket_manager.send_personal_json({
            "type": "error",
            "message": "Invalid JSON format"
        }, websocket)
    except Exception as e:
        await websocket_manager.send_personal_json({
            "type": "error",
            "message": f"Error processing message: {str(e)}"
        }, websocket)


async def send_train_updates(websocket: WebSocket):
    """Send periodic train updates"""
    
    try:
        while True:
            await asyncio.sleep(5)  # Send updates every 5 seconds
            
            train_data = get_current_train_data()
            await websocket_manager.send_personal_json({
                "type": "train_update",
                "data": train_data,
                "timestamp": datetime.utcnow().isoformat()
            }, websocket)
            
    except Exception as e:
        print(f"Error sending train updates: {e}")


def get_current_train_data():
    """Get current train data for WebSocket updates"""
    
    # Mock train data - in real implementation, this would fetch from database
    return [
        {
            "id": 1,
            "train_number": "TW001",
            "status": "RUNNING",
            "current_speed": 85.0,
            "current_section": 1,
            "delay_minutes": 5.0,
            "last_update": datetime.utcnow().isoformat()
        },
        {
            "id": 2,
            "train_number": "TW002",
            "status": "STOPPED",
            "current_speed": 0.0,
            "current_section": 2,
            "delay_minutes": 0.0,
            "last_update": datetime.utcnow().isoformat()
        },
        {
            "id": 3,
            "train_number": "TW003",
            "status": "RUNNING",
            "current_speed": 60.0,
            "current_section": 3,
            "delay_minutes": 15.0,
            "last_update": datetime.utcnow().isoformat()
        }
    ]


def get_current_optimization_status():
    """Get current optimization status"""
    
    return {
        "active_optimizations": 1,
        "completed_today": 3,
        "failed_today": 0,
        "average_runtime_seconds": 45.2,
        "current_runs": [
            {
                "id": 2,
                "name": "Route Optimization Test",
                "status": "running",
                "progress": 65.0,
                "estimated_completion": (datetime.utcnow() + timedelta(minutes=5)).isoformat()
            }
        ]
    }


def get_optimization_status_by_id(optimization_id: int):
    """Get optimization status by ID"""
    
    # Mock implementation
    return {
        "id": optimization_id,
        "status": "running",
        "progress": 75.0,
        "estimated_completion": (datetime.utcnow() + timedelta(minutes=3)).isoformat()
    }


def get_active_optimization_count():
    """Get count of active optimizations"""
    return 1


def get_current_alerts():
    """Get current system alerts"""
    
    return [
        {
            "id": 1,
            "type": "warning",
            "title": "Train TW003 Delayed",
            "message": "Train TW003 is running 15 minutes behind schedule",
            "severity": "medium",
            "timestamp": datetime.utcnow().isoformat()
        }
    ]


def check_for_new_alerts():
    """Check for new alerts (mock implementation)"""
    
    import random
    
    # Randomly generate new alerts for demonstration
    if random.random() < 0.1:  # 10% chance of new alert
        return [
            {
                "id": random.randint(100, 999),
                "type": "info",
                "title": "System Update",
                "message": "Automated system health check completed successfully",
                "severity": "low",
                "timestamp": datetime.utcnow().isoformat()
            }
        ]
    
    return []


def get_system_status():
    """Get current system status"""
    
    return {
        "status": "operational",
        "uptime_hours": 720.5,
        "active_trains": 3,
        "active_sections": 4,
        "system_load": 65.2,
        "last_updated": datetime.utcnow().isoformat()
    }


# WebSocket utility endpoints
@router.get("/connections")
async def get_websocket_connections(current_user: dict = Depends(WebSocketAuth.get_user_from_token)):
    """Get current WebSocket connections (admin only)"""
    
    if not current_user.get("is_superuser"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    stats = await websocket_manager.get_statistics()
    return stats


@router.post("/broadcast")
async def broadcast_message(
    message: Dict[str, Any],
    current_user: dict = Depends(WebSocketAuth.get_user_from_token)
):
    """Broadcast message to all WebSocket connections (admin only)"""
    
    if not current_user.get("is_superuser"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    broadcast_data = {
        "type": "admin_broadcast",
        "message": message.get("message", ""),
        "from": current_user.get("username"),
        "timestamp": datetime.utcnow().isoformat()
    }
    
    await websocket_manager.broadcast_json(broadcast_data)
    
    return {"message": "Broadcast sent successfully", "connections": len(websocket_manager.active_connections)}