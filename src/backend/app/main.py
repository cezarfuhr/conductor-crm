"""
Conductor CRM - Main FastAPI Application
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import logging

from app.core.config import settings
from app.database import connect_to_mongo, close_mongo_connection
from app.services.cache_service import cache_service
from app.core.errors import (
    ConductorException,
    conductor_exception_handler,
    http_exception_handler,
    validation_exception_handler,
    general_exception_handler
)

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
    openapi_url="/openapi.json" if not settings.is_production else None,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Execute on application startup"""
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    await connect_to_mongo()
    await cache_service.connect()
    logger.info("Application startup complete")

@app.on_event("shutdown")
async def shutdown_event():
    """Execute on application shutdown"""
    logger.info("Shutting down application...")
    await close_mongo_connection()
    await cache_service.close()
    logger.info("Application shutdown complete")

# Register exception handlers
app.add_exception_handler(ConductorException, conductor_exception_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "status": "running"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return JSONResponse(
        status_code=200,
        content={
            "status": "healthy",
            "app": settings.APP_NAME,
            "version": settings.APP_VERSION
        }
    )

@app.get("/health/simple")
async def simple_health():
    """Simple health check"""
    return {"status": "ok"}

# Include API routers
from app.api.v1.api import api_router
app.include_router(api_router, prefix="/api/v1")
