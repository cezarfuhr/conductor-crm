"""
API v1 router aggregation
"""

from fastapi import APIRouter
from app.api.v1.endpoints import leads, deals, ai, auth, notifications, settings

api_router = APIRouter()

# Authentication (no auth required)
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])

# Core resources (auth required)
api_router.include_router(leads.router, prefix="/leads", tags=["leads"])
api_router.include_router(deals.router, prefix="/deals", tags=["deals"])

# AI & Intelligence
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])

# User features
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(settings.router, prefix="/settings", tags=["settings"])
