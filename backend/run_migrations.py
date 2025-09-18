#!/usr/bin/env python3
"""
Migration runner script for TrackWise Railway Optimization System
"""

import subprocess
import sys
import os
from pathlib import Path

def run_command(cmd, description):
    """Run a command and handle output"""
    print(f"🔄 {description}...")
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, shell=True)
        
        if result.returncode == 0:
            print(f"✅ {description} completed successfully")
            if result.stdout.strip():
                print(f"📝 Output: {result.stdout.strip()}")
            return True
        else:
            print(f"❌ {description} failed")
            if result.stderr.strip():
                print(f"🚨 Error: {result.stderr.strip()}")
            return False
            
    except Exception as e:
        print(f"❌ {description} failed with exception: {e}")
        return False

def main():
    """Main migration function"""
    
    print("🚂 TrackWise Railway Optimization System")
    print("=" * 50)
    print("Database Migration Runner")
    print()
    
    # Change to the backend directory
    backend_dir = Path(__file__).parent
    os.chdir(backend_dir)
    
    # Check if alembic is available
    if not run_command("alembic --version", "Checking Alembic installation"):
        print("❌ Alembic is not installed or not in PATH")
        print("📦 Install it with: pip install alembic")
        return False
    
    print()
    
    # Check current migration status
    if not run_command("alembic current", "Checking current migration status"):
        print("⚠️  Unable to check current migration status")
    
    print()
    
    # Run migrations
    if not run_command("alembic upgrade head", "Running database migrations"):
        print("❌ Migration failed")
        print()
        print("Troubleshooting:")
        print("1. Ensure database is running and accessible")
        print("2. Check DATABASE_URL in .env file")
        print("3. Verify database user has necessary permissions")
        print("4. Check if initial tables exist")
        return False
    
    print()
    
    # Show final status
    if not run_command("alembic current", "Checking final migration status"):
        print("⚠️  Unable to verify final migration status")
    
    print()
    print("🎉 Database migrations completed successfully!")
    print()
    print("Next steps:")
    print("1. Start the application: python -m app.main")
    print("2. Or use the CLI: python -m app.cli server run")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)