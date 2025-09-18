"""
Command Line Interface for TrackWise Railway Optimization System
"""

import asyncio
import click
import logging
from datetime import datetime
from typing import Optional

from app.config import settings
from app.core.logging import setup_logging
from app.database_init import (
    init_database, check_database_health, seed_test_data, 
    reset_database, backup_database
)

# Setup logging
setup_logging()
logger = logging.getLogger(__name__)


@click.group()
@click.option('--debug', is_flag=True, help='Enable debug mode')
def cli(debug):
    """TrackWise Railway Optimization System CLI"""
    if debug:
        settings.DEBUG = True
        settings.LOG_LEVEL = "DEBUG"
        setup_logging()
    
    click.echo(f"TrackWise CLI - Environment: {settings.ENVIRONMENT}")


@cli.group()
def db():
    """Database management commands"""
    pass


@db.command()
def init():
    """Initialize the database with tables and initial data"""
    click.echo("Initializing database...")
    
    try:
        asyncio.run(init_database())
        click.echo(click.style("✓ Database initialized successfully", fg='green'))
    except Exception as e:
        click.echo(click.style(f"✗ Database initialization failed: {e}", fg='red'))
        raise click.Abort()


@db.command()
def health():
    """Check database health and connectivity"""
    click.echo("Checking database health...")
    
    try:
        health_status = asyncio.run(check_database_health())
        
        if health_status.get("database_connected"):
            click.echo(click.style("✓ Database connection successful", fg='green'))
            
            counts = health_status.get("table_counts", {})
            click.echo("\nTable counts:")
            for table, count in counts.items():
                click.echo(f"  {table}: {count}")
        else:
            click.echo(click.style("✗ Database connection failed", fg='red'))
            error = health_status.get("error", "Unknown error")
            click.echo(f"Error: {error}")
            
    except Exception as e:
        click.echo(click.style(f"✗ Health check failed: {e}", fg='red'))
        raise click.Abort()


@db.command()
@click.option('--force', is_flag=True, help='Force seed even if data exists')
def seed(force):
    """Seed test data for development"""
    
    if settings.is_production() and not force:
        click.echo(click.style("✗ Cannot seed test data in production environment", fg='red'))
        return
    
    click.echo("Seeding test data...")
    
    try:
        asyncio.run(seed_test_data())
        click.echo(click.style("✓ Test data seeded successfully", fg='green'))
    except Exception as e:
        click.echo(click.style(f"✗ Seeding failed: {e}", fg='red'))
        raise click.Abort()


@db.command()
@click.confirmation_option(prompt='This will DELETE ALL DATA. Are you sure?')
def reset():
    """Reset database - DROP and recreate all tables (DEVELOPMENT ONLY)"""
    
    if settings.is_production():
        click.echo(click.style("✗ Cannot reset database in production environment", fg='red'))
        return
    
    click.echo("Resetting database...")
    
    try:
        asyncio.run(reset_database())
        click.echo(click.style("✓ Database reset completed", fg='green'))
    except Exception as e:
        click.echo(click.style(f"✗ Database reset failed: {e}", fg='red'))
        raise click.Abort()


@db.command()
@click.option('--output', '-o', help='Output directory for backup file')
def backup(output):
    """Create database backup"""
    click.echo("Creating database backup...")
    
    try:
        backup_path = asyncio.run(backup_database())
        click.echo(click.style(f"✓ Backup created: {backup_path}", fg='green'))
    except Exception as e:
        click.echo(click.style(f"✗ Backup failed: {e}", fg='red'))
        raise click.Abort()


@db.command()
def migrate():
    """Run database migrations"""
    import subprocess
    
    click.echo("Running database migrations...")
    
    try:
        # Run alembic upgrade
        result = subprocess.run(['alembic', 'upgrade', 'head'], 
                              capture_output=True, text=True)
        
        if result.returncode == 0:
            click.echo(click.style("✓ Migrations completed successfully", fg='green'))
            if result.stdout:
                click.echo(result.stdout)
        else:
            click.echo(click.style("✗ Migration failed", fg='red'))
            if result.stderr:
                click.echo(result.stderr)
            raise click.Abort()
            
    except FileNotFoundError:
        click.echo(click.style("✗ Alembic not found. Please install alembic.", fg='red'))
        raise click.Abort()
    except Exception as e:
        click.echo(click.style(f"✗ Migration failed: {e}", fg='red'))
        raise click.Abort()


@db.command()
@click.argument('message')
def create_migration(message):
    """Create a new database migration"""
    import subprocess
    
    click.echo(f"Creating migration: {message}")
    
    try:
        # Run alembic revision
        result = subprocess.run(['alembic', 'revision', '--autogenerate', '-m', message],
                              capture_output=True, text=True)
        
        if result.returncode == 0:
            click.echo(click.style("✓ Migration created successfully", fg='green'))
            if result.stdout:
                click.echo(result.stdout)
        else:
            click.echo(click.style("✗ Migration creation failed", fg='red'))
            if result.stderr:
                click.echo(result.stderr)
            raise click.Abort()
            
    except FileNotFoundError:
        click.echo(click.style("✗ Alembic not found. Please install alembic.", fg='red'))
        raise click.Abort()
    except Exception as e:
        click.echo(click.style(f"✗ Migration creation failed: {e}", fg='red'))
        raise click.Abort()


@cli.group()
def user():
    """User management commands"""
    pass


@user.command()
@click.argument('username')
@click.argument('email')
@click.argument('password')
@click.option('--superuser', is_flag=True, help='Create as superuser')
@click.option('--role', help='Assign role to user')
def create(username, email, password, superuser, role):
    """Create a new user"""
    
    async def create_user():
        from app.database import get_async_session
        from app.services.user_service import user_service
        from app.schemas.user import UserCreate
        from app.core.security import hash_password
        
        user_data = UserCreate(
            username=username,
            email=email,
            full_name=username.title(),
            password=password
        )
        
        async with get_async_session() as db:
            try:
                user = await user_service.create(db, user_data)
                if superuser:
                    user.is_superuser = True
                    await db.commit()
                
                return user
            except Exception as e:
                await db.rollback()
                raise e
    
    try:
        user = asyncio.run(create_user())
        click.echo(click.style(f"✓ User '{username}' created successfully", fg='green'))
        
        if superuser:
            click.echo("  - Granted superuser privileges")
            
    except Exception as e:
        click.echo(click.style(f"✗ User creation failed: {e}", fg='red'))
        raise click.Abort()


@user.command()
@click.argument('username')
def delete(username):
    """Delete a user (soft delete)"""
    
    async def delete_user():
        from app.database import get_async_session
        from app.services.user_service import user_service
        
        async with get_async_session() as db:
            user = await user_service.get_by_username(db, username)
            if not user:
                raise ValueError(f"User '{username}' not found")
            
            await user_service.remove(db, user.id)
            return user
    
    try:
        user = asyncio.run(delete_user())
        click.echo(click.style(f"✓ User '{username}' deleted successfully", fg='green'))
        
    except Exception as e:
        click.echo(click.style(f"✗ User deletion failed: {e}", fg='red'))
        raise click.Abort()


@user.command()
def list():
    """List all users"""
    
    async def list_users():
        from app.database import get_async_session
        from app.services.user_service import user_service
        
        async with get_async_session() as db:
            users, total = await user_service.get_multi(db, limit=100)
            return users, total
    
    try:
        users, total = asyncio.run(list_users())
        
        click.echo(f"Total users: {total}")
        click.echo()
        
        if users:
            click.echo("ID\tUsername\tEmail\t\t\tActive\tSuperuser")
            click.echo("-" * 60)
            
            for user in users:
                active = "✓" if user.is_active else "✗"
                superuser = "✓" if user.is_superuser else "✗"
                click.echo(f"{user.id}\t{user.username}\t{user.email}\t{active}\t{superuser}")
        else:
            click.echo("No users found")
            
    except Exception as e:
        click.echo(click.style(f"✗ Failed to list users: {e}", fg='red'))
        raise click.Abort()


@cli.group()
def server():
    """Server management commands"""
    pass


@server.command()
@click.option('--host', default='0.0.0.0', help='Host to bind to')
@click.option('--port', default=8000, help='Port to bind to')
@click.option('--reload', is_flag=True, help='Enable auto-reload')
@click.option('--workers', default=1, help='Number of worker processes')
def run(host, port, reload, workers):
    """Run the FastAPI server"""
    
    import uvicorn
    
    click.echo(f"Starting TrackWise server on {host}:{port}")
    
    if settings.is_development() or reload:
        # Development mode - single worker with reload
        uvicorn.run(
            "app.main:app",
            host=host,
            port=port,
            reload=reload,
            log_level=settings.LOG_LEVEL.lower(),
            access_log=True
        )
    else:
        # Production mode - multiple workers
        uvicorn.run(
            "app.main:app",
            host=host,
            port=port,
            workers=workers,
            log_level=settings.LOG_LEVEL.lower(),
            access_log=True
        )


@cli.group()
def ml():
    """Machine Learning model management"""
    pass


@ml.command()
def train():
    """Train ML models"""
    
    async def train_models():
        from app.database import get_async_session
        from app.services.ml_service import ml_service
        
        async with get_async_session() as db:
            # Train delay prediction model
            click.echo("Training delay prediction model...")
            await ml_service.train_delay_prediction_model(db, retrain=True)
            
            # Train demand forecasting model
            click.echo("Training demand forecasting model...")
            await ml_service.train_demand_forecasting_model(db, retrain=True)
            
            # Train maintenance prediction model
            click.echo("Training maintenance prediction model...")
            await ml_service.train_maintenance_prediction_model(db, retrain=True)
    
    try:
        asyncio.run(train_models())
        click.echo(click.style("✓ All ML models trained successfully", fg='green'))
        
    except Exception as e:
        click.echo(click.style(f"✗ ML model training failed: {e}", fg='red'))
        raise click.Abort()


@ml.command()
def list():
    """List available ML models"""
    
    async def list_models():
        from app.services.ml_service import ml_service
        return await ml_service.list_available_models()
    
    try:
        models = asyncio.run(list_models())
        
        if models:
            click.echo("Available ML Models:")
            click.echo("-" * 50)
            
            for model in models:
                status_color = 'green' if model['status'] == 'deployed' else 'yellow'
                click.echo(f"Model ID: {model['model_id']}")
                click.echo(f"Type: {model['model_type']}")
                click.echo(f"Status: {click.style(model['status'], fg=status_color)}")
                click.echo(f"Version: {model['version']}")
                if model.get('last_trained'):
                    click.echo(f"Last Trained: {model['last_trained']}")
                click.echo()
        else:
            click.echo("No ML models found")
            
    except Exception as e:
        click.echo(click.style(f"✗ Failed to list models: {e}", fg='red'))
        raise click.Abort()


@cli.command()
def status():
    """Show system status"""
    
    async def get_status():
        from app.database import get_async_session
        from app.services.analytics_service import analytics_service
        
        status_info = {
            "environment": settings.ENVIRONMENT,
            "debug": settings.DEBUG,
            "database_url": settings.DATABASE_URL.split('@')[1] if '@' in settings.DATABASE_URL else "configured",
            "version": "1.0.0"
        }
        
        # Check database
        try:
            health = await check_database_health()
            status_info["database"] = "connected" if health.get("database_connected") else "disconnected"
            status_info["table_counts"] = health.get("table_counts", {})
        except:
            status_info["database"] = "error"
        
        # Get system metrics if available
        try:
            async with get_async_session() as db:
                dashboard_metrics = await analytics_service.get_dashboard_metrics(db)
                status_info["metrics"] = {
                    "total_trains": dashboard_metrics.train_analytics.total_trains,
                    "active_trains": dashboard_metrics.train_analytics.active_trains,
                    "total_sections": dashboard_metrics.section_analytics.total_sections,
                }
        except:
            status_info["metrics"] = "unavailable"
        
        return status_info
    
    try:
        status = asyncio.run(get_status())
        
        click.echo("TrackWise System Status")
        click.echo("=" * 30)
        
        # Environment info
        click.echo(f"Environment: {status['environment']}")
        click.echo(f"Debug Mode: {status['debug']}")
        click.echo(f"Version: {status['version']}")
        
        # Database status
        db_status = status.get('database', 'unknown')
        db_color = 'green' if db_status == 'connected' else 'red'
        click.echo(f"Database: {click.style(db_status, fg=db_color)}")
        
        if 'table_counts' in status:
            click.echo("\nDatabase Tables:")
            for table, count in status['table_counts'].items():
                click.echo(f"  {table}: {count}")
        
        # System metrics
        if status.get('metrics') != 'unavailable':
            metrics = status['metrics']
            click.echo("\nSystem Metrics:")
            click.echo(f"  Total Trains: {metrics.get('total_trains', 0)}")
            click.echo(f"  Active Trains: {metrics.get('active_trains', 0)}")
            click.echo(f"  Total Sections: {metrics.get('total_sections', 0)}")
        
    except Exception as e:
        click.echo(click.style(f"✗ Failed to get status: {e}", fg='red'))
        raise click.Abort()


def main():
    """Main CLI entry point"""
    cli()


if __name__ == '__main__':
    main()


# Export CLI
__all__ = ["cli", "main"]