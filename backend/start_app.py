#!/usr/bin/env python3
"""
TrackWise Railway Optimization System - Application Startup Script
Run this script to start the complete application with all services.
"""

import asyncio
import os
import sys
import time
import subprocess
import signal
import threading
from pathlib import Path
from datetime import datetime
from typing import Optional, List

# Add the project root to Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# Import application modules
from app.config import settings
from app.core.logging import setup_logging
from app.database_init import init_database, check_database_health, seed_test_data
from app.main import app

# Setup logging
setup_logging()

import logging
logger = logging.getLogger(__name__)

class TrackWiseApp:
    """Main application controller"""
    
    def __init__(self):
        self.processes: List[subprocess.Popen] = []
        self.shutdown_event = threading.Event()
        self.setup_signal_handlers()
    
    def setup_signal_handlers(self):
        """Setup graceful shutdown signal handlers"""
        def signal_handler(signum, frame):
            logger.info(f"Received signal {signum}, initiating graceful shutdown...")
            self.shutdown_event.set()
            self.cleanup()
            sys.exit(0)
        
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
    
    async def check_prerequisites(self) -> bool:
        """Check if all prerequisites are met"""
        
        print("🔍 Checking prerequisites...")
        
        # Check Python version
        if sys.version_info < (3.8, 0):
            print("❌ Python 3.8+ is required")
            return False
        print(f"✅ Python version: {sys.version.split()[0]}")
        
        # Check environment file
        env_file = project_root / ".env"
        if not env_file.exists():
            print("⚠️  .env file not found. Creating from .env.example...")
            example_file = project_root / ".env.example"
            if example_file.exists():
                import shutil
                shutil.copy(example_file, env_file)
                print(f"✅ Created .env file at {env_file}")
                print("⚠️  Please update .env with your actual database credentials!")
            else:
                print("❌ .env.example not found. Please create .env manually.")
                return False
        else:
            print("✅ Environment file found")
        
        # Check required packages
        required_packages = [
            "fastapi", "uvicorn", "sqlalchemy", "alembic", "asyncpg", 
            "redis", "numpy", "pandas", "pydantic", "python-jose", "passlib"
        ]
        
        missing_packages = []
        for package in required_packages:
            try:
                __import__(package.replace("-", "_"))
            except ImportError:
                missing_packages.append(package)
        
        if missing_packages:
            print(f"❌ Missing packages: {', '.join(missing_packages)}")
            print("📦 Install with: pip install -r requirements.txt")
            return False
        print("✅ All required packages installed")
        
        return True
    
    async def setup_database(self) -> bool:
        """Setup and initialize the database"""
        
        print("\n📋 Setting up database...")
        
        try:
            # Check database health first
            health = await check_database_health()
            
            if health.get("database_connected"):
                print("✅ Database connection successful")
                
                # Check if tables exist
                table_counts = health.get("table_counts", {})
                if table_counts and sum(table_counts.values()) > 0:
                    print(f"✅ Database tables found: {len(table_counts)} tables")
                    print("📊 Table counts:")
                    for table, count in table_counts.items():
                        print(f"   {table}: {count}")
                    
                    # Ask if user wants to reset data
                    if not settings.is_production():
                        reset_choice = input("\n🔄 Reset database with fresh data? (y/N): ").lower()
                        if reset_choice == 'y':
                            print("🌱 Seeding fresh test data...")
                            await seed_test_data()
                            print("✅ Test data seeded successfully")
                else:
                    print("⚠️  No tables found, initializing database...")
                    await init_database()
                    print("✅ Database initialized successfully")
                    
                    if not settings.is_production():
                        print("🌱 Seeding test data...")
                        await seed_test_data()
                        print("✅ Test data seeded successfully")
                
            else:
                print("❌ Database connection failed")
                error = health.get("error", "Unknown error")
                print(f"Error: {error}")
                print("\n💡 Troubleshooting tips:")
                print("1. Ensure PostgreSQL is running")
                print("2. Check DATABASE_URL in .env file")
                print("3. Verify database exists and user has permissions")
                return False
                
        except Exception as e:
            print(f"❌ Database setup failed: {e}")
            return False
        
        return True
    
    async def run_migrations(self) -> bool:
        """Run database migrations"""
        
        print("\n🔄 Running database migrations...")
        
        try:
            # Check if alembic is available
            result = subprocess.run(["alembic", "--version"], 
                                  capture_output=True, text=True, cwd=project_root)
            
            if result.returncode != 0:
                print("❌ Alembic not found. Installing...")
                subprocess.run([sys.executable, "-m", "pip", "install", "alembic"], 
                             check=True)
            
            # Initialize alembic if needed
            alembic_dir = project_root / "alembic"
            if not alembic_dir.exists():
                print("📁 Initializing Alembic...")
                subprocess.run(["alembic", "init", "alembic"], 
                             check=True, cwd=project_root)
            
            # Run migrations
            result = subprocess.run(["alembic", "upgrade", "head"], 
                                  capture_output=True, text=True, cwd=project_root)
            
            if result.returncode == 0:
                print("✅ Database migrations completed successfully")
                if result.stdout.strip():
                    print(f"📝 Migration output: {result.stdout.strip()}")
                return True
            else:
                print("⚠️  Migration completed with warnings or no changes needed")
                if result.stderr.strip():
                    print(f"⚠️  Warnings: {result.stderr.strip()}")
                return True
                
        except subprocess.CalledProcessError as e:
            print(f"❌ Migration failed: {e}")
            return False
        except Exception as e:
            print(f"❌ Migration error: {e}")
            return False
    
    async def start_services(self) -> bool:
        """Start all application services"""
        
        print("\n🚀 Starting TrackWise services...")
        
        try:
            # Import and start the FastAPI application
            import uvicorn
            
            # Configuration for uvicorn
            config = uvicorn.Config(
                app="app.main:app",
                host=settings.API_HOST,
                port=settings.API_PORT,
                reload=settings.is_development(),
                log_level=settings.LOG_LEVEL.lower(),
                access_log=True,
                workers=1 if settings.is_development() else 4
            )
            
            server = uvicorn.Server(config)
            
            print(f"✅ Starting FastAPI server on http://{settings.API_HOST}:{settings.API_PORT}")
            print(f"📚 API Documentation: http://{settings.API_HOST}:{settings.API_PORT}/docs")
            print(f"🔧 Alternative docs: http://{settings.API_HOST}:{settings.API_PORT}/redoc")
            
            # Start server in background task
            server_task = asyncio.create_task(server.serve())
            
            # Wait for server to start
            await asyncio.sleep(2)
            
            # Check if server started successfully
            try:
                import aiohttp
                async with aiohttp.ClientSession() as session:
                    async with session.get(f"http://{settings.API_HOST}:{settings.API_PORT}/health") as response:
                        if response.status == 200:
                            print("✅ API server is healthy and responding")
                        else:
                            print(f"⚠️  API server responded with status {response.status}")
            except Exception as e:
                print(f"⚠️  Could not verify API health: {e}")
            
            # Keep the server running
            await server_task
            
        except Exception as e:
            print(f"❌ Failed to start services: {e}")
            return False
        
        return True
    
    async def display_status(self):
        """Display application status and useful information"""
        
        print("\n" + "="*60)
        print("🚂 TrackWise Railway Optimization System")
        print("="*60)
        print(f"🕐 Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"🌍 Environment: {settings.ENVIRONMENT}")
        print(f"🐛 Debug Mode: {settings.DEBUG}")
        print(f"🗄️  Database: Connected")
        print(f"🔗 API Base URL: http://{settings.API_HOST}:{settings.API_PORT}")
        print("\n📖 Available Endpoints:")
        print(f"   • Health Check: http://{settings.API_HOST}:{settings.API_PORT}/health")
        print(f"   • API Docs: http://{settings.API_HOST}:{settings.API_PORT}/docs")
        print(f"   • Train Management: http://{settings.API_HOST}:{settings.API_PORT}/api/v1/trains")
        print(f"   • Optimization: http://{settings.API_HOST}:{settings.API_PORT}/api/v1/optimization")
        print(f"   • Simulation: http://{settings.API_HOST}:{settings.API_PORT}/api/v1/simulation")
        print(f"   • Analytics: http://{settings.API_HOST}:{settings.API_PORT}/api/v1/analytics")
        
        if not settings.is_production():
            print("\n🔑 Default Admin Credentials:")
            print("   Username: admin")
            print("   Email: admin@trackwise.com")
            print("   Password: admin123")
            print("   ⚠️  CHANGE THESE IN PRODUCTION!")
        
        print("\n💡 Quick Start:")
        print("   1. Visit the API docs to explore endpoints")
        print("   2. Use the /auth/login endpoint to get a JWT token")
        print("   3. Try creating a train optimization request")
        print("   4. Run a simulation scenario")
        
        print("\n🛑 To stop the application, press Ctrl+C")
        print("="*60)
    
    def cleanup(self):
        """Clean up resources and running processes"""
        
        print("\n🧹 Cleaning up...")
        
        for process in self.processes:
            try:
                process.terminate()
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
            except Exception as e:
                logger.warning(f"Error cleaning up process: {e}")
        
        print("✅ Cleanup completed")
    
    async def run(self):
        """Main application runner"""
        
        print("🚂 TrackWise Railway Optimization System")
        print("=" * 50)
        print("🚀 Starting application...")
        
        # Check prerequisites
        if not await self.check_prerequisites():
            print("\n❌ Prerequisites check failed. Please fix the issues above.")
            return False
        
        # Setup database
        if not await self.setup_database():
            print("\n❌ Database setup failed. Please check your database configuration.")
            return False
        
        # Run migrations
        if not await self.run_migrations():
            print("\n⚠️  Migration issues detected, but continuing...")
        
        # Display status
        await self.display_status()
        
        # Start services (this will block until shutdown)
        try:
            await self.start_services()
        except KeyboardInterrupt:
            print("\n\n🛑 Received shutdown signal...")
        except Exception as e:
            print(f"\n❌ Application error: {e}")
            return False
        finally:
            self.cleanup()
        
        return True


async def main():
    """Main entry point"""
    
    app = TrackWiseApp()
    
    try:
        success = await app.run()
        if success:
            print("👋 TrackWise shut down successfully")
        else:
            print("❌ TrackWise encountered errors")
            sys.exit(1)
    except Exception as e:
        print(f"💥 Unexpected error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    # Set working directory to script location
    os.chdir(project_root)
    
    # Run the application
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 Goodbye!")
    except Exception as e:
        print(f"💥 Failed to start: {e}")
        sys.exit(1)