#!/usr/bin/env python3
"""
Database setup script for TrackWise Railway Optimization System
Run this script to set up the database for the first time.
"""

import asyncio
import sys
import os
from pathlib import Path

# Add the app directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

from app.core.logging import setup_logging
from app.database_init import init_database, seed_test_data, check_database_health
from app.config import settings

# Setup logging
setup_logging()

async def main():
    """Main setup function"""
    
    print("🚂 TrackWise Railway Optimization System")
    print("=" * 50)
    print("Database Setup Script")
    print(f"Environment: {settings.ENVIRONMENT}")
    print(f"Database URL: {settings.DATABASE_URL.split('@')[1] if '@' in settings.DATABASE_URL else 'configured'}")
    print()
    
    try:
        # Step 1: Initialize database
        print("📋 Step 1: Initializing database...")
        await init_database()
        print("✅ Database initialized successfully")
        print()
        
        # Step 2: Check database health
        print("🔍 Step 2: Checking database health...")
        health = await check_database_health()
        
        if health.get("database_connected"):
            print("✅ Database connection successful")
            
            counts = health.get("table_counts", {})
            print("\nTable counts:")
            for table, count in counts.items():
                print(f"  📊 {table}: {count}")
        else:
            print("❌ Database connection failed")
            return False
        print()
        
        # Step 3: Seed test data (development only)
        if not settings.is_production():
            print("🌱 Step 3: Seeding test data...")
            await seed_test_data()
            print("✅ Test data seeded successfully")
        else:
            print("⚠️  Step 3: Skipping test data (production environment)")
        print()
        
        # Final check
        print("🔍 Final verification...")
        final_health = await check_database_health()
        final_counts = final_health.get("table_counts", {})
        
        print("📊 Final table counts:")
        for table, count in final_counts.items():
            print(f"  {table}: {count}")
        print()
        
        print("🎉 Database setup completed successfully!")
        print()
        print("Next steps:")
        print("1. Run database migrations: alembic upgrade head")
        print("2. Start the application: python -m app.main")
        print("3. Access the API documentation at: http://localhost:8000/docs")
        print()
        print("Default admin credentials:")
        print("  Username: admin")
        print("  Email: admin@trackwise.com") 
        print("  Password: admin123")
        print("  ⚠️  CHANGE THESE CREDENTIALS IN PRODUCTION!")
        
        return True
        
    except Exception as e:
        print(f"❌ Database setup failed: {e}")
        print()
        print("Troubleshooting:")
        print("1. Ensure PostgreSQL is running")
        print("2. Check database credentials in .env file")
        print("3. Verify database exists and user has permissions")
        print("4. Check network connectivity to database")
        
        return False


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)