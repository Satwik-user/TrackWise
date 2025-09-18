"""
WebSocket manager for TrackWise Railway Optimization System
"""

import logging
import json
from typing import List, Dict, Any, Optional
from fastapi import WebSocket, WebSocketDisconnect
from datetime import datetime

logger = logging.getLogger(__name__)


class ConnectionManager:
    """WebSocket connection manager"""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.connection_info: Dict[WebSocket, Dict[str, Any]] = {}
        self.db_engine = None
    
    async def connect(self, websocket: WebSocket, client_info: Optional[Dict[str, Any]] = None):
        """Accept and track a WebSocket connection"""
        await websocket.accept()
        self.active_connections.append(websocket)
        self.connection_info[websocket] = {
            "connected_at": datetime.utcnow(),
            "client_info": client_info or {},
            "last_ping": datetime.utcnow()
        }
        logger.info(f"WebSocket connection established. Total connections: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection"""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if websocket in self.connection_info:
            del self.connection_info[websocket]
        logger.info(f"WebSocket connection closed. Total connections: {len(self.active_connections)}")
    
    async def send_personal_message(self, message: str, websocket: WebSocket):
        """Send a message to a specific WebSocket connection"""
        try:
            await websocket.send_text(message)
        except Exception as e:
            logger.error(f"Error sending personal message: {e}")
            self.disconnect(websocket)
    
    async def send_personal_json(self, data: Dict[str, Any], websocket: WebSocket):
        """Send JSON data to a specific WebSocket connection"""
        try:
            await websocket.send_json(data)
        except Exception as e:
            logger.error(f"Error sending personal JSON: {e}")
            self.disconnect(websocket)
    
    async def broadcast(self, message: str):
        """Broadcast a message to all connected WebSocket clients"""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except WebSocketDisconnect:
                disconnected.append(connection)
            except Exception as e:
                logger.error(f"Error broadcasting message: {e}")
                disconnected.append(connection)
        
        # Remove disconnected clients
        for connection in disconnected:
            self.disconnect(connection)
    
    async def broadcast_json(self, data: Dict[str, Any]):
        """Broadcast JSON data to all connected WebSocket clients"""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(data)
            except WebSocketDisconnect:
                disconnected.append(connection)
            except Exception as e:
                logger.error(f"Error broadcasting JSON: {e}")
                disconnected.append(connection)
        
        # Remove disconnected clients
        for connection in disconnected:
            self.disconnect(connection)
    
    async def get_statistics(self) -> Dict[str, Any]:
        """Get WebSocket connection statistics"""
        return {
            "total_connections": len(self.active_connections),
            "connections": [
                {
                    "connected_at": info["connected_at"].isoformat(),
                    "client_info": info.get("client_info", {}),
                    "last_ping": info.get("last_ping", datetime.utcnow()).isoformat()
                }
                for info in self.connection_info.values()
            ]
        }
    
    async def shutdown(self):
        """Shutdown WebSocket manager and close all connections"""
        logger.info("Shutting down WebSocket manager...")
        
        # Close all active connections
        for connection in self.active_connections.copy():
            try:
                await connection.close()
            except Exception as e:
                logger.error(f"Error closing WebSocket connection: {e}")
            self.disconnect(connection)
        
        logger.info("WebSocket manager shutdown complete")


# Global WebSocket manager instance
websocket_manager = ConnectionManager()