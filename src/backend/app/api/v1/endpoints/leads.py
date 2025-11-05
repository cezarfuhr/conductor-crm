"""
Lead API endpoints
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database import get_database
from app.dependencies import get_current_active_user
from app.models.user import User
from app.models.lead import Lead, LeadCreate, LeadUpdate, LeadResponse
from app.services.lead_service import LeadService

router = APIRouter()

@router.post("/", response_model=LeadResponse, status_code=status.HTTP_201_CREATED)
async def create_lead(
    lead_data: LeadCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Create a new lead"""
    service = LeadService(db)
    lead = await service.create_lead(lead_data, str(current_user.id))
    return lead

@router.get("/", response_model=dict)
async def list_leads(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """List leads with pagination and filters"""
    service = LeadService(db)
    leads, total = await service.list_leads(
        owner_id=str(current_user.id),
        skip=skip,
        limit=limit,
        status=status,
        search=search
    )

    return {
        "items": leads,
        "total": total,
        "skip": skip,
        "limit": limit
    }

@router.get("/{lead_id}", response_model=LeadResponse)
async def get_lead(
    lead_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get lead by ID"""
    service = LeadService(db)
    lead = await service.get_lead(lead_id)

    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead not found"
        )

    # Check ownership
    if str(lead.owner_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this lead"
        )

    return lead

@router.patch("/{lead_id}", response_model=LeadResponse)
async def update_lead(
    lead_id: str,
    lead_update: LeadUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Update lead"""
    service = LeadService(db)

    # Check if lead exists and user owns it
    existing_lead = await service.get_lead(lead_id)
    if not existing_lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead not found"
        )

    if str(existing_lead.owner_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this lead"
        )

    lead = await service.update_lead(lead_id, lead_update)
    return lead

@router.delete("/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lead(
    lead_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Delete lead"""
    service = LeadService(db)

    # Check ownership
    existing_lead = await service.get_lead(lead_id)
    if not existing_lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead not found"
        )

    if str(existing_lead.owner_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this lead"
        )

    await service.delete_lead(lead_id)
    return None
