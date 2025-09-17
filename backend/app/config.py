from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://trackwise:trackwise123@localhost/trackwise_db"
    
    # API
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "TrackWise - Railway Traffic Optimization"
    VERSION: str = "1.0.0"
    
    # Security
    SECRET_KEY: str = "your-secret-key-here-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days
    
    # CORS
    BACKEND_CORS_ORIGINS: list = [
        "http://localhost:3000",
        "http://localhost:8080",
        "http://127.0.0.1:3000"
    ]
    
    # Optimization
    OPTIMIZATION_TIMEOUT_SECONDS: int = 5
    MAX_TRAINS_PER_SECTION: int = 20
    
    # ML Models
    MODEL_PATH: str = "ml_models/models"
    ENABLE_ML_PREDICTIONS: bool = True
    
    # WebSocket
    WEBSOCKET_HEARTBEAT_INTERVAL: int = 30
    
    class Config:
        env_file = ".env"

settings = Settings()