import json
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
from fastapi import WebSocket, WebSocketDisconnect
import asyncio

logger = logging.getLogger(__name__)

class ConnectionManager:
    """Manages WebSocket connections for real-time updates"""
    
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.subscriptions: Dict[str, List[str]] = {}  # client_id -> [topic1, topic2, ...]
        self.message_queue: Dict[str, List[Dict[str, Any]]] = {}
        
    async def connect(self, websocket: WebSocket, client_id: str):
        """Accept new WebSocket connection"""
        await websocket.accept()
        self.active_connections[client_id] = websocket
        self.subscriptions[client_id] = []
        self.message_queue[client_id] = []
        
        logger.info(f"Client {client_id} connected. Total connections: {len(self.active_connections)}")
        
        # Send welcome message
        await self.send_personal_message(json.dumps({
            "type": "connection_established",
            "client_id": client_id,
            "timestamp": datetime.now().isoformat(),
            "message": "Connected to TrackWise real-time updates"
        }), client_id)
    
    def disconnect(self, client_id: str):
        """Remove client connection"""
        if client_id in self.active_connections:
            del self.active_connections[client_id]
        if client_id in self.subscriptions:
            del self.subscriptions[client_id]
        if client_id in self.message_queue:
            del self.message_queue[client_id]
        
        logger.info(f"Client {client_id} disconnected. Total connections: {len(self.active_connections)}")
    
    async def send_personal_message(self, message: str, client_id: str):
        """Send message to specific client"""
        if client_id in self.active_connections:
            try:
                await self.active_connections[client_id].send_text(message)
            except Exception as e:
                logger.error(f"Error sending message to {client_id}: {str(e)}")
                self.disconnect(client_id)
    
    async def broadcast(self, message: str, topic: str = None):
        """Broadcast message to all connected clients or topic subscribers"""
        if topic:
            # Send to subscribed clients only
            for client_id, topics in self.subscriptions.items():
                if topic in topics:
                    await self.send_personal_message(message, client_id)
        else:
            # Send to all clients
            disconnected_clients = []
            for client_id, connection in self.active_connections.items():
                try:
                    await connection.send_text(message)
                except Exception as e:
                    logger.error(f"Error broadcasting to {client_id}: {str(e)}")
                    disconnected_clients.append(client_id)
            
            # Clean up disconnected clients
            for client_id in disconnected_clients:
                self.disconnect(client_id)
    
    async def subscribe(self, client_id: str, topic: str):
        """Subscribe client to a topic"""
        if client_id in self.subscriptions:
            if topic not in self.subscriptions[client_id]:
                self.subscriptions[client_id].append(topic)
                
                await self.send_personal_message(json.dumps({
                    "type": "subscription_confirmed",
                    "topic": topic,
                    "timestamp": datetime.now().isoformat()
                }), client_id)
                
                logger.info(f"Client {client_id} subscribed to topic: {topic}")
    
    async def unsubscribe(self, client_id: str, topic: str):
        """Unsubscribe client from a topic"""
        if client_id in self.subscriptions and topic in self.subscriptions[client_id]:
            self.subscriptions[client_id].remove(topic)
            
            await self.send_personal_message(json.dumps({
                "type": "unsubscription_confirmed",
                "topic": topic,
                "timestamp": datetime.now().isoformat()
            }), client_id)
            
            logger.info(f"Client {client_id} unsubscribed from topic: {topic}")
    
    def get_connection_stats(self) -> Dict[str, Any]:
        """Get connection statistics"""
        return {
            "total_connections": len(self.active_connections),
            "active_clients": list(self.active_connections.keys()),
            "subscription_summary": {
                topic: len([clients for clients in self.subscriptions.values() if topic in clients])
                for topic in set().union(*self.subscriptions.values())
            },
            "timestamp": datetime.now().isoformat()
        }

class WebSocketManager:
    """Enhanced WebSocket manager with topic-based messaging"""
    
    def __init__(self):
        self.connection_manager = ConnectionManager()
        self.update_intervals = {
            "train_positions": 5,      # seconds
            "optimization_results": 10,
            "system_metrics": 30,
            "alerts": 1
        }
        self.background_tasks = {}
        
    async def connect(self, websocket: WebSocket, client_id: str):
        """Handle new WebSocket connection"""
        await self.connection_manager.connect(websocket, client_id)
        
    def disconnect(self, client_id: str):
        """Handle WebSocket disconnection"""
        self.connection_manager.disconnect(client_id)
        
        # Cancel background tasks for this client
        if client_id in self.background_tasks:
            for task in self.background_tasks[client_id]:
                task.cancel()
            del self.background_tasks[client_id]
    
    async def handle_message(self, client_id: str, message: str):
        """Handle incoming WebSocket message"""
        try:
            data = json.loads(message)
            message_type = data.get("type")
            
            if message_type == "subscribe":
                topic = data.get("topic")
                if topic:
                    await self.connection_manager.subscribe(client_id, topic)
                    await self._start_topic_updates(client_id, topic)
            
            elif message_type == "unsubscribe":
                topic = data.get("topic")
                if topic:
                    await self.connection_manager.unsubscribe(client_id, topic)
                    await self._stop_topic_updates(client_id, topic)
            
            elif message_type == "get_status":
                await self._send_status_update(client_id)
            
            elif message_type == "ping":
                await self.connection_manager.send_personal_message(json.dumps({
                    "type": "pong",
                    "timestamp": datetime.now().isoformat()
                }), client_id)
            
            else:
                logger.warning(f"Unknown message type from {client_id}: {message_type}")
                
        except json.JSONDecodeError:
            logger.error(f"Invalid JSON message from {client_id}: {message}")
        except Exception as e:
            logger.error(f"Error handling message from {client_id}: {str(e)}")
    
    async def _start_topic_updates(self, client_id: str, topic: str):
        """Start background updates for a topic"""
        if client_id not in self.background_tasks:
            self.background_tasks[client_id] = []
        
        # Check if already running
        for task in self.background_tasks[client_id]:
            if not task.done() and hasattr(task, 'topic') and task.topic == topic:
                return
        
        # Start new background task
        if topic in self.update_intervals:
            task = asyncio.create_task(self._topic_update_loop(client_id, topic))
            task.topic = topic
            self.background_tasks[client_id].append(task)
    
    async def _stop_topic_updates(self, client_id: str, topic: str):
        """Stop background updates for a topic"""
        if client_id in self.background_tasks:
            for task in self.background_tasks[client_id]:
                if hasattr(task, 'topic') and task.topic == topic:
                    task.cancel()
                    self.background_tasks[client_id].remove(task)
                    break
    
    async def _topic_update_loop(self, client_id: str, topic: str):
        """Background loop for sending topic updates"""
        interval = self.update_intervals.get(topic, 10)
        
        try:
            while True:
                data = await self._get_topic_data(topic)
                message = json.dumps({
                    "type": "topic_update",
                    "topic": topic,
                    "data": data,
                    "timestamp": datetime.now().isoformat()
                })
                
                await self.connection_manager.send_personal_message(message, client_id)
                await asyncio.sleep(interval)
                
        except asyncio.CancelledError:
            logger.info(f"Topic update loop cancelled for {client_id}:{topic}")
        except Exception as e:
            logger.error(f"Error in topic update loop for {client_id}:{topic}: {str(e)}")
    
    async def _get_topic_data(self, topic: str) -> Dict[str, Any]:
        """Get data for a specific topic"""
        try:
            if topic == "train_positions":
                return await self._get_train_positions()
            elif topic == "optimization_results":
                return await self._get_latest_optimization_results()
            elif topic == "system_metrics":
                return await self._get_system_metrics()
            elif topic == "alerts":
                return await self._get_active_alerts()
            else:
                return {"error": f"Unknown topic: {topic}"}
        except Exception as e:
            logger.error(f"Error getting data for topic {topic}: {str(e)}")
            return {"error": str(e)}
    
    async def _get_train_positions(self) -> Dict[str, Any]:
        """Get current train positions"""
        # In a real implementation, this would query the database
        # For now, return mock data
        import random
        
        trains = []
        for i in range(5):  # Mock 5 trains
            trains.append({
                "train_id": i + 1,
                "train_number": f"T{1000 + i}",
                "section_id": random.randint(1, 3),
                "position": random.uniform(0, 1000),
                "speed": random.uniform(60, 120),
                "status": random.choice(["RUNNING", "DELAYED", "ON_TIME"]),
                "delay": random.uniform(0, 10)
            })
        
        return {
            "trains": trains,
            "total_trains": len(trains),
            "timestamp": datetime.now().isoformat()
        }
    
    async def _get_latest_optimization_results(self) -> Dict[str, Any]:
        """Get latest optimization results"""
        # Mock optimization results
        return {
            "run_id": f"OPT_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "status": "COMPLETED",
            "objective_value": 85.7,
            "solving_time": 2.3,
            "decisions_count": 12,
            "improvements": {
                "delay_reduction": 15.2,
                "throughput_increase": 8.5
            },
            "timestamp": datetime.now().isoformat()
        }
    
    async def _get_system_metrics(self) -> Dict[str, Any]:
        """Get system performance metrics"""
        import random
        
        return {
            "cpu_usage": random.uniform(20, 80),
            "memory_usage": random.uniform(30, 70),
            "active_trains": random.randint(10, 50),
            "sections_active": random.randint(15, 25),
            "optimization_queue": random.randint(0, 5),
            "average_delay": random.uniform(2, 8),
            "throughput": random.uniform(15, 25),
            "timestamp": datetime.now().isoformat()
        }
    
    async def _get_active_alerts(self) -> Dict[str, Any]:
        """Get active alerts and notifications"""
        import random
        
        alerts = []
        if random.random() > 0.7:  # 30% chance of alert
            alerts.append({
                "id": f"ALERT_{datetime.now().strftime('%H%M%S')}",
                "type": random.choice(["WARNING", "INFO", "ERROR"]),
                "message": random.choice([
                    "Train T1001 experiencing minor delay",
                    "Section SEC_002 approaching capacity",
                    "Weather conditions affecting speeds",
                    "Optimization completed successfully"
                ]),
                "timestamp": datetime.now().isoformat()
            })
        
        return {
            "alerts": alerts,
            "alert_count": len(alerts),
            "timestamp": datetime.now().isoformat()
        }
    
    async def _send_status_update(self, client_id: str):
        """Send comprehensive status update"""
        status = {
            "type": "status_update",
            "connection_stats": self.connection_manager.get_connection_stats(),
            "system_status": "OPERATIONAL",
            "uptime": "2h 15m",
            "version": "1.0.0",
            "timestamp": datetime.now().isoformat()
        }
        
        await self.connection_manager.send_personal_message(json.dumps(status), client_id)
    
    async def broadcast_alert(self, alert_type: str, message: str, data: Dict[str, Any] = None):
        """Broadcast alert to all subscribers"""
        alert_message = {
            "type": "alert",
            "alert_type": alert_type,
            "message": message,
            "data": data or {},
            "timestamp": datetime.now().isoformat()
        }
        
        await self.connection_manager.broadcast(json.dumps(alert_message), topic="alerts")
    
    async def broadcast_optimization_result(self, result: Dict[str, Any]):
        """Broadcast optimization result to subscribers"""
        message = {
            "type": "optimization_completed",
            "result": result,
            "timestamp": datetime.now().isoformat()
        }
        
        await self.connection_manager.broadcast(json.dumps(message), topic="optimization_results")
    
    async def send_train_update(self, train_data: Dict[str, Any]):
        """Send train position update to subscribers"""
        message = {
            "type": "train_update",
            "train_data": train_data,
            "timestamp": datetime.now().isoformat()
        }
        
        await self.connection_manager.broadcast(json.dumps(message), topic="train_positions")

# Global WebSocket manager instance
websocket_manager = WebSocketManager()