"""
Deal API endpoints
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database import get_database
from app.dependencies import get_current_active_user
from app.models.user import User
from app.models.deal import Deal, DealCreate, DealUpdate, DealResponse
from app.services.deal_service import DealService

router = APIRouter()

@router.post("/", response_model=DealResponse, status_code=status.HTTP_201_CREATED)
async def create_deal(
    deal_data: DealCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Create a new deal"""
    service = DealService(db)
    deal = await service.create_deal(deal_data, str(current_user.id))
    return deal

@router.get("/", response_model=dict)
async def list_deals(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    stage: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """List deals with pagination"""
    service = DealService(db)
    deals, total = await service.list_deals(
        owner_id=str(current_user.id),
        skip=skip,
        limit=limit,
        stage=stage
    )

    return {
        "items": deals,
        "total": total,
        "skip": skip,
        "limit": limit
    }

@router.get("/{deal_id}", response_model=DealResponse)
async def get_deal(
    deal_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get deal by ID"""
    service = DealService(db)
    deal = await service.get_deal(deal_id)

    if not deal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deal not found")

    if str(deal.owner_id) != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    return deal

@router.patch("/{deal_id}", response_model=DealResponse)
async def update_deal(
    deal_id: str,
    deal_update: DealUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Update deal"""
    service = DealService(db)
    existing = await service.get_deal(deal_id)

    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deal not found")

    if str(existing.owner_id) != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    deal = await service.update_deal(deal_id, deal_update)
    return deal

@router.delete("/{deal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_deal(
    deal_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Delete deal"""
    service = DealService(db)
    existing = await service.get_deal(deal_id)

    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deal not found")

    if str(existing.owner_id) != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    await service.delete_deal(deal_id)

@router.post("/{deal_id}/move", response_model=DealResponse)
async def move_deal_stage(
    deal_id: str,
    new_stage: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Move deal to new stage"""
    service = DealService(db)
    existing = await service.get_deal(deal_id)

    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deal not found")

    if str(existing.owner_id) != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    deal = await service.move_deal_stage(deal_id, new_stage)
    return deal
