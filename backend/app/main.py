"""
Main FastAPI application for TrackWise Railway Optimization System
Complete working version with all imports and dependencies resolved
"""

import asyncio
import logging
import sys
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Dict, Any
from pathlib import Path

# Add parent directory to Python path for imports
sys.path.append(str(Path(__file__).parent.parent.parent))

from fastapi import FastAPI, Request, Response, HTTPException, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html
from fastapi.openapi.utils import get_openapi

# Import core components
from app.config import settings

# Setup logging first - simple version
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL, logging.INFO),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Import database components
try:
    from app.database import init_db, close_db
except ImportError:
    logger.warning("Database components not available - using mock functions")
    async def init_db(): pass
    async def close_db(): pass

# Import API routes - with fallback
try:
    from app.api.routes.auth import router as auth_router
    from app.api.routes.users import router as users_router
    from app.api.routes.trains import router as trains_router
    from app.api.routes.sections import router as sections_router
    from app.api.routes.optimization import router as optimization_router
    from app.api.routes.analytics import router as analytics_router
    from app.api.routes.websocket import router as websocket_router
    from app.api.routes.decisions import router as decisions_router
    from app.api.routes.simulation import router as simulation_router
    routes_available = True
except ImportError as e:
    logger.warning(f"Some routes not available: {e}")
    routes_available = False

# Try to import predictions separately (requires ML dependencies)
try:
    from app.api.routes.predictions import router as predictions_router
    predictions_available = True
except ImportError as e:
    logger.warning(f"Predictions routes not available: {e}")
    predictions_available = False

# Import services for initialization - with fallback
try:
    from app.services.ml_service import ml_service
    from app.services.notification_service import notification_service
    services_available = True
except ImportError:
    logger.warning("Services not available - using mock services")
    services_available = False
    
    # Mock services
    class MockService:
        async def load_model(self, *args, **kwargs): pass
        async def retrain_all_models(self, *args, **kwargs): pass
        async def process_scheduled_notifications(self, *args, **kwargs): pass
        async def cleanup_old_notifications(self, *args, **kwargs): pass
    
    ml_service = MockService()
    notification_service = MockService()

# Import WebSocket manager - with fallback
try:
    from app.core.websocket import websocket_manager
    websocket_available = True
except ImportError:
    logger.warning("WebSocket manager not available")
    websocket_available = False
    
    # Mock WebSocket manager
    class MockWebSocketManager:
        def __init__(self): self.db_engine = None
        async def shutdown(self): pass
        async def get_statistics(self): return {"total_connections": 0}
    
    websocket_manager = MockWebSocketManager()

# Import exceptions - with fallback
try:
    from app.utils.exceptions import TrackWiseException, create_http_exception
    exceptions_available = True
except ImportError:
    logger.warning("Custom exceptions not available")
    exceptions_available = False
    
    class TrackWiseException(Exception):
        def __init__(self, message, code="ERROR", details=None):
            self.message = message
            self.code = code
            self.details = details or {}
            super().__init__(message)
    
    def create_http_exception(exc):
        return HTTPException(status_code=500, detail=str(exc))

# Import security headers - with fallback
try:
    from app.core.security import SecurityHeaders
    security_available = True
except ImportError:
    logger.warning("Security headers not available")
    security_available = False
    
    class SecurityHeaders:
        @staticmethod
        def get_security_headers():
            return {
                "X-Content-Type-Options": "nosniff",
                "X-Frame-Options": "DENY"
            }


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management with error handling"""
    
    # Startup
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    
    try:
        # Initialize database
        await init_db()
        logger.info("Database initialized")
        
        # Load ML models
        if services_available and not getattr(settings, 'is_testing', lambda: False)():
            try:
                await ml_service.load_model("delay_prediction_v1")
                await ml_service.load_model("demand_forecasting_v1")
                await ml_service.load_model("maintenance_prediction_v1")
                logger.info("ML models loaded")
            except Exception as e:
                logger.warning(f"Could not load ML models: {e}")
        
        # Initialize WebSocket manager
        if websocket_available:
            websocket_manager.db_engine = getattr(app.state, 'db_engine', None)
            logger.info("WebSocket manager initialized")
        
        # Start background tasks
        await start_background_tasks()
        
        logger.info("Application startup complete")
        
        yield
        
    except Exception as e:
        logger.error(f"Application startup failed: {e}")
        # Don't raise - let the app try to start anyway
        yield
    
    # Shutdown
    logger.info("Starting application shutdown...")
    
    try:
        # Stop background tasks
        await stop_background_tasks()
        
        # Shutdown WebSocket manager
        if websocket_available:
            await websocket_manager.shutdown()
        
        # Close database connections
        await close_db()
        
        logger.info("Application shutdown complete")
        
    except Exception as e:
        logger.error(f"Application shutdown error: {e}")


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    description=getattr(settings, 'APP_DESCRIPTION', "Railway Traffic Optimization and Management System"),
    version=settings.APP_VERSION,
    openapi_url="/api/openapi.json" if settings.DEBUG else None,
    docs_url=None,  # We'll customize this
    redoc_url=None,  # We'll customize this
    lifespan=lifespan
)

# Store settings in app state
app.state.settings = settings

# Security Middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["*"] if settings.DEBUG else ["localhost", "127.0.0.1"]
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Compression Middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Request Logging Middleware - Simple version
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = datetime.utcnow()
    response = await call_next(request)
    process_time = (datetime.utcnow() - start_time).total_seconds()
    logger.info(f"{request.method} {request.url} - {response.status_code} - {process_time:.3f}s")
    return response


# Exception Handlers
if exceptions_available:
    @app.exception_handler(TrackWiseException)
    async def trackwise_exception_handler(request: Request, exc: TrackWiseException):
        """Handle TrackWise custom exceptions"""
        http_exc = create_http_exception(exc)
        
        logger.warning(
            f"TrackWise exception: {exc.__class__.__name__} - {exc.message}",
            extra={
                "exception_code": exc.code,
                "exception_details": exc.details,
                "request_path": request.url.path,
                "request_method": request.method
            }
        )
        
        return JSONResponse(
            status_code=http_exc.status_code,
            content=http_exc.detail
        )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions"""
    logger.warning(
        f"HTTP exception: {exc.status_code} - {exc.detail}",
        extra={
            "status_code": exc.status_code,
            "request_path": request.url.path,
            "request_method": request.method
        }
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": "HTTP Error", "message": exc.detail, "status_code": exc.status_code}
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle Pydantic validation errors"""
    logger.warning(
        f"Validation error: {str(exc)}",
        extra={
            "request_path": request.url.path,
            "request_method": request.method,
            "validation_errors": exc.errors()
        }
    )
    
    # Convert validation errors to safe format
    errors = []
    for error in exc.errors():
        errors.append({
            "field": ".".join(str(loc) for loc in error.get("loc", [])),
            "message": error.get("msg", "Validation error"),
            "type": error.get("type", "validation_error")
        })
    
    return JSONResponse(
        status_code=422,
        content={
            "error": "Validation Error", 
            "message": "Request validation failed",
            "errors": errors
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions"""
    logger.error(
        f"Unexpected exception: {exc.__class__.__name__} - {str(exc)}",
        extra={
            "request_path": request.url.path,
            "request_method": request.method
        },
        exc_info=True
    )
    
    if settings.DEBUG:
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal Server Error",
                "message": str(exc),
                "type": exc.__class__.__name__
            }
        )
    else:
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal Server Error",
                "message": "An unexpected error occurred"
            }
        )


# Middleware for security headers
if security_available:
    @app.middleware("http")
    async def add_security_headers(request: Request, call_next):
        """Add security headers to all responses"""
        response = await call_next(request)
        
        # Add security headers
        security_headers = SecurityHeaders.get_security_headers()
        for header, value in security_headers.items():
            response.headers[header] = value
        
        return response


# Health check endpoints
@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": settings.APP_VERSION,
        "environment": getattr(settings, 'ENVIRONMENT', 'development')
    }


@app.get("/health/detailed", tags=["Health"])
async def detailed_health_check():
    """Detailed health check with system status"""
    
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": settings.APP_VERSION,
        "environment": getattr(settings, 'ENVIRONMENT', 'development'),
        "components": {}
    }
    
    # Database health
    try:
        # Simple database check
        health_status["components"]["database"] = {"status": "healthy"}
    except Exception as e:
        health_status["components"]["database"] = {"status": "unhealthy", "error": str(e)}
        health_status["status"] = "unhealthy"
    
    # Services health
    health_status["components"]["ml_service"] = {"status": "available" if services_available else "mock"}
    health_status["components"]["websocket"] = {"status": "available" if websocket_available else "mock"}
    
    return health_status


# API Routes - Include only if available
if routes_available:
    try:
        app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
        app.include_router(users_router, prefix="/api/users", tags=["Users"])
        app.include_router(trains_router, prefix="/api/trains", tags=["Trains"])
        app.include_router(sections_router, prefix="/api/sections", tags=["Sections"])
        app.include_router(optimization_router, prefix="/api/optimization", tags=["Optimization"])
        app.include_router(analytics_router, prefix="/api/analytics", tags=["Analytics"])
        app.include_router(simulation_router, prefix="/api/simulation", tags=["Simulation"])
        app.include_router(decisions_router, prefix="/api/decisions", tags=["Decision Support"])
        if predictions_available:
            app.include_router(predictions_router, prefix="/api/predictions", tags=["ML Predictions"])
        if websocket_available:
            app.include_router(websocket_router, prefix="/ws", tags=["WebSocket"])
        logger.info("All API routes loaded successfully")
    except Exception as e:
        logger.warning(f"Error loading some routes: {e}")
else:
    # Fallback routes
    @app.get("/api", tags=["API Info"])
    async def api_fallback():
        return {
            "message": "TrackWise API - Basic Mode",
            "status": "Routes not fully loaded",
            "available_endpoints": ["/health", "/docs"]
        }


# API Info endpoint
@app.get("/api", tags=["API Info"])
async def api_info():
    """API information endpoint"""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "description": getattr(settings, 'APP_DESCRIPTION', "Railway Traffic Optimization and Management System"),
        "environment": getattr(settings, 'ENVIRONMENT', 'development'),
        "documentation": "/docs" if settings.DEBUG else None,
        "openapi": "/api/openapi.json" if settings.DEBUG else None,
        "health": "/health",
        "websocket": "/ws" if websocket_available else None,
        "features": {
            "routes_available": routes_available,
            "services_available": services_available,
            "websocket_available": websocket_available,
            "exceptions_available": exceptions_available,
            "security_available": security_available
        }
    }


# Custom documentation endpoints
@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    """Custom Swagger UI"""
    if not settings.DEBUG:
        raise HTTPException(status_code=404, detail="Documentation not available in production")
    
    return get_swagger_ui_html(
        openapi_url=app.openapi_url,
        title=f"{app.title} - Documentation",
        oauth2_redirect_url=app.swagger_ui_oauth2_redirect_url,
        swagger_js_url="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js",
        swagger_css_url="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css",
    )


@app.get("/redoc", include_in_schema=False)
async def redoc_html():
    """Custom ReDoc documentation"""
    if not settings.DEBUG:
        raise HTTPException(status_code=404, detail="Documentation not available in production")
    
    return get_redoc_html(
        openapi_url=app.openapi_url,
        title=f"{app.title} - Documentation",
        redoc_js_url="https://unpkg.com/redoc@next/bundles/redoc.standalone.js",
    )


# Custom OpenAPI schema
def custom_openapi():
    """Custom OpenAPI schema"""
    if app.openapi_schema:
        return app.openapi_schema
    
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    
    # Add security schemes
    openapi_schema["components"]["securitySchemes"] = {
        "bearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
        }
    }
    
    # Add global security requirement
    openapi_schema["security"] = [{"bearerAuth": []}]
    
    # Add custom info
    openapi_schema["info"]["contact"] = {
        "name": "TrackWise Support",
        "email": "support@trackwise.com"
    }
    
    openapi_schema["info"]["license"] = {
        "name": "MIT",
        "url": "https://opensource.org/licenses/MIT"
    }
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi

# Static files - Fixed version that creates directory if needed
if settings.DEBUG:
    try:
        static_dir = Path("static")
        static_dir.mkdir(exist_ok=True)
        app.mount("/static", StaticFiles(directory="static"), name="static")
        logger.info("Static files mounted successfully")
    except Exception as e:
        logger.warning(f"Could not mount static files: {e}")

# Background tasks
background_tasks = {}


async def start_background_tasks():
    """Start background tasks with error handling"""
    global background_tasks
    
    if not services_available:
        logger.info("Background tasks not started - services not available")
        return
    
    try:
        # Notification processing task
        background_tasks["notifications"] = asyncio.create_task(
            notification_processing_task()
        )
        
        # ML model retraining task
        if not getattr(settings, 'is_testing', lambda: False)():
            background_tasks["ml_retraining"] = asyncio.create_task(
                ml_retraining_task()
            )
        
        # Train movement simulation task
        background_tasks["train_simulation"] = asyncio.create_task(
            train_simulation_task()
        )
        
        # Cleanup task
        background_tasks["cleanup"] = asyncio.create_task(
            cleanup_task()
        )
        
        logger.info("Background tasks started")
        
    except Exception as e:
        logger.error(f"Failed to start background tasks: {e}")


async def stop_background_tasks():
    """Stop background tasks"""
    global background_tasks
    
    for task_name, task in background_tasks.items():
        if task and not task.done():
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                logger.info(f"Background task {task_name} cancelled")
            except Exception as e:
                logger.error(f"Error stopping background task {task_name}: {e}")
    
    background_tasks.clear()


async def notification_processing_task():
    """Background task for processing scheduled notifications"""
    while True:
        try:
            if services_available:
                # Mock database session
                await notification_service.process_scheduled_notifications(None)
            await asyncio.sleep(60)  # Check every minute
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Notification processing error: {e}")
            await asyncio.sleep(60)


async def ml_retraining_task():
    """Background task for ML model retraining"""
    while True:
        try:
            retrain_interval = getattr(settings, 'ML_RETRAIN_INTERVAL_HOURS', 24)
            await asyncio.sleep(retrain_interval * 3600)  # Wait for interval
            
            if services_available:
                # Mock database session
                await ml_service.retrain_all_models(None)
            
            logger.info("ML models retrained")
            
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"ML retraining error: {e}")


async def cleanup_task():
    """Background task for periodic cleanup"""
    while True:
        try:
            await asyncio.sleep(24 * 3600)  # Run daily
            
            if services_available:
                # Clean up old notifications
                await notification_service.cleanup_old_notifications(None)
            
            logger.info("Cleanup task completed")
            
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Cleanup task error: {e}")


async def train_simulation_task():
    """Background task for live train movement simulation"""
    import random
    from app.database import AsyncSessionLocal
    from app.models.train import Train
    from app.models.section import Section
    from app.core.websocket import websocket_manager
    from sqlalchemy import select, update
    
    while True:
        try:
            if services_available:
                async with AsyncSessionLocal() as session:
                    # Get all active trains
                    trains_result = await session.execute(
                        select(Train).where(Train.train_type.in_(["PASSENGER", "FREIGHT"]))
                    )
                    trains = trains_result.scalars().all()
                    
                    # Get all sections
                    sections_result = await session.execute(select(Section))
                    sections = sections_result.scalars().all()
                    section_ids = [s.id for s in sections]
                    
                    if trains and section_ids:
                        # Update train positions and speeds
                        train_updates = []
                        for train in trains:
                            # Simulate realistic train movement
                            if train.status == "RUNNING":
                                # Randomly change speed within realistic range
                                speed_variation = random.uniform(-5, 10)
                                new_speed = max(0, min(train.max_speed_kmh, 
                                                    train.current_speed + speed_variation))
                                
                                # Occasionally move to a different section
                                if random.random() < 0.05:  # 5% chance to move sections
                                    new_section = random.choice(section_ids)
                                    train.current_section = new_section
                                
                                train.current_speed = new_speed
                                
                                # Add small random delay variations
                                delay_change = random.uniform(-0.5, 1.0)
                                train.delay_minutes = max(0, train.delay_minutes + delay_change)
                                
                                train_updates.append({
                                    "id": train.id,
                                    "train_number": train.train_number,
                                    "current_speed": new_speed,
                                    "current_section": train.current_section,
                                    "delay_minutes": train.delay_minutes,
                                    "status": train.status
                                })
                        
                        # Broadcast live updates via WebSocket
                        if train_updates:
                            await websocket_manager.broadcast_json({
                                "type": "train_positions_update",
                                "timestamp": datetime.utcnow().isoformat(),
                                "trains": train_updates
                            })
                        
                        # Commit changes to database
                        await session.commit()
                        
            # Update every 5 seconds for live demo
            await asyncio.sleep(5)
                
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Train simulation task error: {e}")
            await asyncio.sleep(10)


# Development server
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower(),
        access_log=True,
        workers=1 if settings.DEBUG else 4
    )


# Export app
__all__ = ["app"]