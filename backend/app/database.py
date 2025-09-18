"""
Database configuration for TrackWise Railway Optimization System
Fixed for SQLite compatibility with async operations
"""

import os
import logging
from typing import AsyncGenerator, Optional
from sqlalchemy import create_engine, MetaData, event
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

from app.config import settings

logger = logging.getLogger(__name__)

# Create base class for models
Base = declarative_base()
metadata = MetaData()

# Database configuration based on URL
database_url = settings.database_url
logger.info(f"Database URL: {database_url}")

# Handle different database types
if database_url.startswith("sqlite"):
    # SQLite configuration
    if database_url.startswith("sqlite+aiosqlite"):
        # Already has async driver
        async_database_url = database_url
    else:
        # Convert to async SQLite
        async_database_url = database_url.replace("sqlite://", "sqlite+aiosqlite://")
    
    # Create async engine for SQLite
    async_engine = create_async_engine(
        async_database_url,
        echo=settings.DATABASE_ECHO,
        poolclass=StaticPool,
        connect_args={
            "check_same_thread": False,
        },
        future=True
    )
    
    # Create sync engine for migrations and sync operations
    sync_engine = create_engine(
        database_url,
        echo=settings.DATABASE_ECHO,
        poolclass=StaticPool,
        connect_args={
            "check_same_thread": False,
        },
        future=True
    )

elif database_url.startswith("postgresql"):
    # PostgreSQL configuration
    if database_url.startswith("postgresql+asyncpg"):
        async_database_url = database_url
    else:
        async_database_url = database_url.replace("postgresql://", "postgresql+asyncpg://")
    
    # Create async engine for PostgreSQL
    async_engine = create_async_engine(
        async_database_url,
        echo=settings.DATABASE_ECHO,
        pool_size=settings.DATABASE_POOL_SIZE,
        max_overflow=settings.DATABASE_MAX_OVERFLOW,
        future=True
    )
    
    # Create sync engine
    sync_database_url = database_url.replace("postgresql+asyncpg://", "postgresql://")
    sync_engine = create_engine(
        sync_database_url,
        echo=settings.DATABASE_ECHO,
        pool_size=settings.DATABASE_POOL_SIZE,
        max_overflow=settings.DATABASE_MAX_OVERFLOW,
        future=True
    )

else:
    raise ValueError(f"Unsupported database URL: {database_url}")

# Create sessionmakers
AsyncSessionLocal = async_sessionmaker(
    async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

SessionLocal = sessionmaker(
    sync_engine,
    autocommit=False,
    autoflush=False,
)

# Legacy aliases for backward compatibility
engine = sync_engine


async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    """Get async database session"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception as e:
            await session.rollback()
            logger.error(f"Database session error: {e}")
            raise
        finally:
            await session.close()


def get_sync_session() -> Session:
    """Get sync database session"""
    return SessionLocal()


async def init_db() -> None:
    """Initialize database with tables"""
    logger.info("Initializing database...")
    
    try:
        # Import all models to ensure they're registered
        from app.models import train, section, user, decision, analytics  # Import your models
        
        async with async_engine.begin() as conn:
            # Create all tables
            await conn.run_sync(Base.metadata.create_all)
            logger.info("Database tables created successfully")
            
        # Create initial data if needed
        await create_initial_data()
        
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        raise


async def close_db() -> None:
    """Close database connections"""
    logger.info("Closing database connections...")
    
    try:
        await async_engine.dispose()
        sync_engine.dispose()
        logger.info("Database connections closed")
    except Exception as e:
        logger.error(f"Error closing database connections: {e}")


async def create_initial_data() -> None:
    """Create initial data for development"""
    
    try:
        async with AsyncSessionLocal() as session:
            # Check if we already have data
            from app.models.user import User
            from app.models.train import Train
            from app.models.section import Section
            
            # Check if admin user exists
            from sqlalchemy import select
            result = await session.execute(select(User).where(User.username == "admin"))
            admin_user = result.scalar_one_or_none()
            
            if not admin_user:
                logger.info("Creating initial admin user...")
                from app.core.security import get_password_hash
                
                admin_user = User(
                    username="admin",
                    email="admin@trackwise.com",
                    full_name="System Administrator",
                    hashed_password=get_password_hash("admin123"),
                    is_active=True,
                    is_superuser=True
                )
                session.add(admin_user)
            
            # Check if we have trains
            result = await session.execute(select(Train))
            trains = result.scalars().all()
            
            if not trains:
                logger.info("Creating sample trains...")
                sample_trains = [
                    Train(
                        train_number="TW001",
                        name="Central Express",
                        train_type="PASSENGER",
                        status="RUNNING",
                        max_speed_kmh=120.0,
                        current_speed=85.0,
                        current_section=1
                    ),
                    Train(
                        train_number="TW002",
                        name="Northern Commuter",
                        train_type="PASSENGER",
                        status="STOPPED",
                        max_speed_kmh=100.0,
                        current_speed=0.0,
                        current_section=2
                    ),
                    Train(
                        train_number="TW003",
                        name="Freight Hauler",
                        train_type="FREIGHT",
                        status="RUNNING",
                        max_speed_kmh=80.0,
                        current_speed=60.0,
                        current_section=3
                    )
                ]
                
                for train in sample_trains:
                    session.add(train)
            
            # Check if we have sections
            result = await session.execute(select(Section))
            sections = result.scalars().all()
            
            if not sections:
                logger.info("Creating sample sections...")
                sample_sections = [
                    Section(
                        section_code="SEC-001",
                        name="Central Terminal",
                        section_type="STATION",
                        status="AVAILABLE",
                        length_km=5.0,
                        max_speed_kmh=60.0,
                        max_capacity=3
                    ),
                    Section(
                        section_code="SEC-002",
                        name="Main Line North",
                        section_type="MAIN_LINE",
                        status="AVAILABLE",
                        length_km=15.0,
                        max_speed_kmh=120.0,
                        max_capacity=2
                    ),
                    Section(
                        section_code="SEC-003",
                        name="Junction Alpha",
                        section_type="JUNCTION",
                        status="AVAILABLE",
                        length_km=8.0,
                        max_speed_kmh=80.0,
                        max_capacity=2
                    )
                ]
                
                for section in sample_sections:
                    session.add(section)
            
            await session.commit()
            logger.info("Initial data created successfully")
            
    except Exception as e:
        logger.error(f"Failed to create initial data: {e}")
        # Don't raise - let the app continue


async def check_database_health() -> dict:
    """Check database health and connectivity"""
    health_info = {
        "database_connected": False,
        "database_type": "unknown",
        "database_url": database_url,
        "error": None,
        "table_counts": {}
    }
    
    try:
        async with AsyncSessionLocal() as session:
            # Test basic connectivity
            await session.execute("SELECT 1")
            health_info["database_connected"] = True
            
            # Determine database type
            if database_url.startswith("sqlite"):
                health_info["database_type"] = "sqlite"
            elif database_url.startswith("postgresql"):
                health_info["database_type"] = "postgresql"
            
            # Count tables (if they exist)
            try:
                from app.models.train import Train
                from app.models.section import Section
                from app.models.user import User
                
                from sqlalchemy import select, func
                
                # Count trains
                result = await session.execute(select(func.count(Train.id)))
                health_info["table_counts"]["trains"] = result.scalar()
                
                # Count sections
                result = await session.execute(select(func.count(Section.id)))
                health_info["table_counts"]["sections"] = result.scalar()
                
                # Count users
                result = await session.execute(select(func.count(User.id)))
                health_info["table_counts"]["users"] = result.scalar()
                
            except Exception as e:
                health_info["table_counts"]["error"] = str(e)
            
    except Exception as e:
        health_info["error"] = str(e)
        logger.error(f"Database health check failed: {e}")
    
    return health_info


# For backward compatibility and imports
__all__ = [
    "Base",
    "metadata", 
    "engine",
    "async_engine",
    "sync_engine",
    "AsyncSessionLocal",
    "SessionLocal",
    "get_async_session",
    "get_sync_session",
    "init_db",
    "close_db",
    "check_database_health"
]