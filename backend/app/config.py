"""
Configuration settings for TrackWise Railway Optimization System
"""

import os
import secrets
from typing import List, Optional, Union
from pydantic import Field, validator
from pydantic_settings import BaseSettings  # Fixed import for Pydantic v2


class Settings(BaseSettings):
    """Application settings with environment variable support"""
    
    # Application Settings
    APP_NAME: str = "TrackWise Railway Optimization API"
    APP_VERSION: str = "1.0.0"
    APP_DESCRIPTION: str = "Railway Traffic Optimization and Management System"
    DEBUG: bool = Field(default=True, env="DEBUG")
    TESTING: bool = Field(default=False, env="TESTING")
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = Field(default="development", env="ENVIRONMENT")
    
    # Server Settings
    API_HOST: str = Field(default="0.0.0.0", env="API_HOST")
    API_PORT: int = Field(default=8000, env="API_PORT")
    HOST: str = Field(default="0.0.0.0", env="HOST")
    PORT: int = Field(default=8000, env="PORT")
    WORKERS: int = Field(default=1, env="WORKERS")
    RELOAD: bool = Field(default=True, env="RELOAD")
    
    # Security Settings
    SECRET_KEY: str = Field(default_factory=lambda: secrets.token_urlsafe(32), env="SECRET_KEY")
    ENCRYPTION_KEY: str = Field(default_factory=lambda: secrets.token_urlsafe(32), env="ENCRYPTION_KEY")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30, env="ACCESS_TOKEN_EXPIRE_MINUTES")
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=7, env="REFRESH_TOKEN_EXPIRE_DAYS")
    PASSWORD_MIN_LENGTH: int = 8
    
    # CORS Settings
    ALLOWED_ORIGINS: List[str] = Field(
        default=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001", "http://127.0.0.1:3001", "http://localhost:8080"],
        env="ALLOWED_ORIGINS"
    )
    ALLOWED_METHODS: List[str] = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
    ALLOWED_HEADERS: List[str] = ["*"]
    
    # Railway Simulation Settings
    DEFAULT_TRAIN_SPEED: float = Field(default=80.0, env="DEFAULT_TRAIN_SPEED")  # km/h
    MAX_TRAIN_SPEED: float = Field(default=200.0, env="MAX_TRAIN_SPEED")  # km/h
    SIMULATION_UPDATE_INTERVAL: int = Field(default=5, env="SIMULATION_UPDATE_INTERVAL")  # seconds
    
    # Database Settings (with SQLite fallback for development)
    DATABASE_URL: Optional[str] = Field(default="sqlite:///./railway_optimization.db", env="DATABASE_URL")
    DATABASE_HOST: str = Field(default="localhost", env="DATABASE_HOST")
    DATABASE_PORT: int = Field(default=5432, env="DATABASE_PORT")
    DATABASE_USER: str = Field(default="postgres", env="DATABASE_USER")
    DATABASE_PASSWORD: str = Field(default="password", env="DATABASE_PASSWORD")
    DATABASE_NAME: str = Field(default="railway_optimization", env="DATABASE_NAME")
    DATABASE_ECHO: bool = Field(default=False, env="DATABASE_ECHO")
    DATABASE_POOL_SIZE: int = Field(default=10, env="DATABASE_POOL_SIZE")
    DATABASE_MAX_OVERFLOW: int = Field(default=20, env="DATABASE_MAX_OVERFLOW")
    
    # Redis Settings (optional for development)
    REDIS_URL: Optional[str] = Field(default="redis://localhost:6379/0", env="REDIS_URL")
    REDIS_HOST: str = Field(default="localhost", env="REDIS_HOST")
    REDIS_PORT: int = Field(default=6379, env="REDIS_PORT")
    REDIS_DB: int = Field(default=0, env="REDIS_DB")
    REDIS_PASSWORD: Optional[str] = Field(default=None, env="REDIS_PASSWORD")
    CACHE_TTL: int = Field(default=300, env="CACHE_TTL")  # 5 minutes
    
    # ML Settings
    ML_RETRAIN_INTERVAL_HOURS: int = Field(default=24, env="ML_RETRAIN_INTERVAL_HOURS")
    
    # Service Enable Settings
    ENABLE_OPTIMIZATION_SERVICE: bool = Field(default=True, env="ENABLE_OPTIMIZATION_SERVICE")
    ENABLE_SIMULATION_SERVICE: bool = Field(default=True, env="ENABLE_SIMULATION_SERVICE")
    ENABLE_ML_SERVICE: bool = Field(default=True, env="ENABLE_ML_SERVICE")
    
    # Logging Settings
    LOG_LEVEL: str = Field(default="INFO", env="LOG_LEVEL")
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    LOG_FILE: Optional[str] = Field(default="logs/trackwise.log", env="LOG_FILE")
    
    # Railway System Settings
    DEFAULT_TRAIN_SPEED: float = Field(default=80.0, env="DEFAULT_TRAIN_SPEED")  # km/h
    DEFAULT_SECTION_LENGTH: float = Field(default=10.0, env="DEFAULT_SECTION_LENGTH")  # km
    MAX_TRAINS_PER_SECTION: int = Field(default=3, env="MAX_TRAINS_PER_SECTION")
    OPTIMIZATION_TIME_LIMIT: int = Field(default=300, env="OPTIMIZATION_TIME_LIMIT")  # seconds
    SIMULATION_TIME_STEP: float = Field(default=1.0, env="SIMULATION_TIME_STEP")  # minutes
    
    # WebSocket Settings
    WEBSOCKET_TIMEOUT: int = Field(default=60, env="WEBSOCKET_TIMEOUT")  # seconds
    WEBSOCKET_HEARTBEAT_INTERVAL: int = Field(default=30, env="WEBSOCKET_HEARTBEAT_INTERVAL")  # seconds
    MAX_WEBSOCKET_CONNECTIONS: int = Field(default=1000, env="MAX_WEBSOCKET_CONNECTIONS")
    
    @validator("ALLOWED_ORIGINS", pre=True)
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)
    
    @property
    def database_url(self) -> str:
        """Get database URL"""
        return self.DATABASE_URL or "sqlite:///./railway_optimization.db"
    
    @property
    def sync_database_url(self) -> str:
        """Synchronous database URL for Alembic migrations"""
        url = self.database_url
        if url.startswith("postgresql+asyncpg://"):
            return url.replace("postgresql+asyncpg://", "postgresql://")
        return url
    
    @property
    def redis_url(self) -> str:
        """Get Redis URL"""
        return self.REDIS_URL or "redis://localhost:6379/0"
    
    def is_development(self) -> bool:
        """Check if running in development mode"""
        return self.ENVIRONMENT.lower() in ["development", "dev"] or self.DEBUG
    
    def is_production(self) -> bool:
        """Check if running in production mode"""
        return self.ENVIRONMENT.lower() in ["production", "prod"]
    
    def is_testing(self) -> bool:
        """Check if running in testing mode"""
        return self.TESTING or self.ENVIRONMENT.lower() in ["testing", "test"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


# Create settings instance
settings = Settings()

# Export commonly used settings
DATABASE_URL = settings.database_url
REDIS_URL = settings.redis_url
SECRET_KEY = settings.SECRET_KEY
DEBUG = settings.DEBUG

__all__ = [
    "Settings",
    "settings",
    "DATABASE_URL",
    "REDIS_URL", 
    "SECRET_KEY",
    "DEBUG"
]