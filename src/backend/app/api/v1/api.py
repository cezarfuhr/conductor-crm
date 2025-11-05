"""
API v1 router aggregation
"""

from fastapi import APIRouter
from app.api.v1.endpoints import leads, deals

api_router = APIRouter()

api_router.include_router(leads.router, prefix="/leads", tags=["leads"])
api_router.include_router(deals.router, prefix="/deals", tags=["deals"])

# Additional routers will be added here:
# api_router.include_router(contacts.router, prefix="/contacts", tags=["contacts"])
# api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
