from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
import json
from datetime import datetime

from app.core.config import settings
from app.core.database import engine, Base
from app.api.v1 import trains, optimization, analytics, simulation
from app.utils.websocket_manager import WebSocketManager

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket manager
websocket_manager = WebSocketManager()

# Include routers
app.include_router(trains.router, prefix=f"{settings.API_V1_STR}/trains", tags=["trains"])
app.include_router(optimization.router, prefix=f"{settings.API_V1_STR}/optimization", tags=["optimization"])
app.include_router(analytics.router, prefix=f"{settings.API_V1_STR}/analytics", tags=["analytics"])
app.include_router(simulation.router, prefix=f"{settings.API_V1_STR}/simulation", tags=["simulation"])

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await websocket_manager.connect(websocket, client_id)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Echo back with timestamp
            response = {
                "type": "echo",
                "data": message,
                "timestamp": datetime.now().isoformat(),
                "client_id": client_id
            }
            await websocket_manager.send_personal_message(json.dumps(response), client_id)
    except WebSocketDisconnect:
        websocket_manager.disconnect(client_id)

@app.get("/")
async def root():
    return {
        "message": "TrackWise Railway Optimization API",
        "version": settings.VERSION,
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": settings.VERSION
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )