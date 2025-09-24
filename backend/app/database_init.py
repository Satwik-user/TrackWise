"""
Database initialization utility for TrackWise Railway Optimization System
"""

import asyncio
import logging
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

from app.config import settings
from app.models.base import Base
from app.models.user import User
from app.models.train import Train
from app.models.section import Section

logger = logging.getLogger(__name__)


async def init_database():
    """Initialize database with tables and initial data"""
    
    logger.info("Initializing database...")
    
    # Create async engine
    engine = create_async_engine(
        settings.get_database_url(),
        echo=settings.DATABASE_ECHO,
        pool_size=settings.DATABASE_POOL_SIZE,
        max_overflow=settings.DATABASE_MAX_OVERFLOW,
        pool_timeout=settings.DATABASE_POOL_TIMEOUT,
        pool_recycle=settings.DATABASE_POOL_RECYCLE,
    )
    
    try:
        # Test database connection
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        
        logger.info("Database connection successful")
        
        # Create all tables
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        
        logger.info("Database tables created successfully")
        
        # Check if we need to run migrations
        async with engine.begin() as conn:
            # Check if alembic_version table exists
            result = await conn.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'alembic_version'
                );
            """))
            
            has_alembic = result.scalar()
            
            if not has_alembic:
                logger.warning("Alembic version table not found. Please run migrations manually:")
                logger.warning("alembic upgrade head")
        
        # Verify        # Verify tables were created
        async with engine.begin() as conn:
            result = await conn.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_type = 'BASE TABLE'
                ORDER BY table_name;
            """))
            
            tables = [row[0] for row in result.fetchall()]
            logger.info(f"Created tables: {', '.join(tables)}")
            
            # Expected core tables
            expected_tables = [
                'users', 'roles', 'permissions', 'user_roles', 'user_permissions',
                'trains', 'sections', 'schedules', 'optimization_runs', 
                'optimization_decisions', 'notifications', 'audit_logs'
            ]
            
            missing_tables = [table for table in expected_tables if table not in tables]
            if missing_tables:
                logger.warning(f"Missing expected tables: {', '.join(missing_tables)}")
            else:
                logger.info("All expected tables created successfully")
        
        return engine
        
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        await engine.dispose()
        raise


async def check_database_health():
    """Check database health and connectivity"""
    
    logger.info("Checking database health...")
    
    engine = create_async_engine(settings.get_database_url())
    
    try:
        async with engine.begin() as conn:
            # Test basic connectivity
            await conn.execute(text("SELECT 1"))
            
            # Check table counts
            result = await conn.execute(text("""
                SELECT 
                    (SELECT COUNT(*) FROM users) as user_count,
                    (SELECT COUNT(*) FROM trains) as train_count,
                    (SELECT COUNT(*) FROM sections) as section_count,
                    (SELECT COUNT(*) FROM roles) as role_count;
            """))
            
            counts = result.first()
            
            health_status = {
                "database_connected": True,
                "table_counts": {
                    "users": counts.user_count,
                    "trains": counts.train_count,
                    "sections": counts.section_count,
                    "roles": counts.role_count
                }
            }
            
            logger.info(f"Database health check passed: {health_status}")
            return health_status
            
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return {
            "database_connected": False,
            "error": str(e)
        }
    finally:
        await engine.dispose()


async def seed_test_data():
    """Seed additional test data for development"""
    
    if settings.is_production():
        logger.warning("Skipping test data seeding in production environment")
        return
    
    logger.info("Seeding test data...")
    
    engine = create_async_engine(settings.get_database_url())
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    try:
        async with async_session() as session:
            # Check if test data already exists
            from sqlalchemy import select
            
            result = await session.execute(select(User).where(User.username == "test_operator"))
            if result.scalar_one_or_none():
                logger.info("Test data already exists, skipping seeding")
                return
            
            # Create test users
            from app.core.security import hash_password
            
            test_users = [
                {
                    "username": "test_operator",
                    "email": "operator@test.com",
                    "full_name": "Test Operator",
                    "hashed_password": hash_password("testpass123"),
                    "is_active": True,
                    "is_verified": True
                },
                {
                    "username": "test_dispatcher",
                    "email": "dispatcher@test.com", 
                    "full_name": "Test Dispatcher",
                    "hashed_password": hash_password("testpass123"),
                    "is_active": True,
                    "is_verified": True
                }
            ]
            
            for user_data in test_users:
                user = User(**user_data)
                session.add(user)
            
            # Create additional test sections
            test_sections = [
                {
                    "section_code": "TEST-001",
                    "name": "Test Section 1",
                    "description": "Test section for development",
                    "section_type": "MAIN_LINE",
                    "status": "AVAILABLE",
                    "railway_line": "Test Line",
                    "length_km": 10.0,
                    "max_speed_kmh": 100.0,
                    "max_capacity": 2,
                    "created_by": 1
                },
                {
                    "section_code": "TEST-002", 
                    "name": "Test Section 2",
                    "description": "Another test section for development",
                    "section_type": "BRANCH_LINE",
                    "status": "AVAILABLE",
                    "railway_line": "Test Line",
                    "length_km": 8.5,
                    "max_speed_kmh": 80.0,
                    "max_capacity": 1,
                    "created_by": 1
                }
            ]
            
            for section_data in test_sections:
                section = Section(**section_data)
                session.add(section)
            
            # Create additional test trains
            test_trains = [
                {
                    "train_number": "TEST001",
                    "name": "Test Express",
                    "train_type": "PASSENGER",
                    "status": "STOPPED",
                    "operator": "Test Railways",
                    "max_speed_kmh": 120.0,
                    "capacity_passengers": 250,
                    "current_section": 1,
                    "created_by": 1
                },
                {
                    "train_number": "TEST002",
                    "name": "Test Local",
                    "train_type": "PASSENGER", 
                    "status": "STOPPED",
                    "operator": "Test Railways",
                    "max_speed_kmh": 100.0,
                    "capacity_passengers": 180,
                    "current_section": 2,
                    "created_by": 1
                }
            ]
            
            for train_data in test_trains:
                train = Train(**train_data)
                session.add(train)
            
            await session.commit()
            logger.info("Test data seeded successfully")
            
    except Exception as e:
        logger.error(f"Failed to seed test data: {e}")
        raise
    finally:
        await engine.dispose()


async def reset_database():
    """Reset database - DROP and recreate all tables (DANGER!)"""
    
    if settings.is_production():
        raise ValueError("Cannot reset database in production environment")
    
    logger.warning("RESETTING DATABASE - ALL DATA WILL BE LOST!")
    
    engine = create_async_engine(settings.get_database_url())
    
    try:
        async with engine.begin() as conn:
            # Drop all tables
            await conn.run_sync(Base.metadata.drop_all)
            logger.info("All tables dropped")
            
            # Recreate all tables
            await conn.run_sync(Base.metadata.create_all)
            logger.info("All tables recreated")
            
        logger.warning("Database reset completed")
        
    except Exception as e:
        logger.error(f"Database reset failed: {e}")
        raise
    finally:
        await engine.dispose()


async def backup_database():
    """Create database backup (simplified version)"""
    
    import subprocess
    import os
    from datetime import datetime
    
    logger.info("Creating database backup...")
    
    try:
        # Parse database URL to get connection details
        db_url = settings.get_sync_database_url()
        
        # Create backup filename with timestamp
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        backup_filename = f"trackwise_backup_{timestamp}.sql"
        backup_path = os.path.join("backups", backup_filename)
        
        # Create backups directory if it doesn't exist
        os.makedirs("backups", exist_ok=True)
        
        # Use pg_dump to create backup
        # Note: This is a simplified version - in production you'd want more robust backup
        cmd = [
            "pg_dump",
            db_url,
            "-f", backup_path,
            "--verbose",
            "--no-owner",
            "--no-privileges"
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            logger.info(f"Database backup created successfully: {backup_path}")
            return backup_path
        else:
            logger.error(f"Backup failed: {result.stderr}")
            raise Exception(f"pg_dump failed: {result.stderr}")
            
    except Exception as e:
        logger.error(f"Database backup failed: {e}")
        raise


# CLI functions for database management
async def main():
    """Main function for CLI database operations"""
    
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python database_init.py <command>")
        print("Commands:")
        print("  init     - Initialize database")
        print("  health   - Check database health")
        print("  seed     - Seed test data")
        print("  reset    - Reset database (development only)")
        print("  backup   - Create database backup")
        return
    
    command = sys.argv[1]
    
    try:
        if command == "init":
            await init_database()
            print("Database initialized successfully")
            
        elif command == "health":
            health = await check_database_health()
            print(f"Database health: {health}")
            
        elif command == "seed":
            await seed_test_data()
            print("Test data seeded successfully")
            
        elif command == "reset":
            if settings.is_production():
                print("ERROR: Cannot reset database in production")
                sys.exit(1)
            
            confirm = input("This will DELETE ALL DATA. Are you sure? (yes/no): ")
            if confirm.lower() == "yes":
                await reset_database()
                print("Database reset completed")
            else:
                print("Reset cancelled")
                
        elif command == "backup":
            backup_path = await backup_database()
            print(f"Backup created: {backup_path}")
            
        else:
            print(f"Unknown command: {command}")
            sys.exit(1)
            
    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())


# Export functions
__all__ = [
    "init_database",
    "check_database_health", 
    "seed_test_data",
    "reset_database",
    "backup_database"
]