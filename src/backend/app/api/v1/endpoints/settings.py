"""
User Settings & Preferences endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

from app.database import get_database
from app.dependencies import get_current_active_user
from app.models.user import User, UserUpdate, UserResponse

router = APIRouter()


class NotificationPreferences(BaseModel):
    email_notifications: bool = True
    push_notifications: bool = True
    lead_qualified: bool = True
    deal_won: bool = True
    deal_lost: bool = True
    new_activity: bool = True
    quiet_hours_enabled: bool = False
    quiet_hours_start: Optional[str] = "22:00"
    quiet_hours_end: Optional[str] = "08:00"


class IntegrationSettings(BaseModel):
    google_calendar_enabled: bool = False
    gmail_sync_enabled: bool = False
    auto_enrich_leads: bool = True
    auto_qualify_leads: bool = True


@router.get("/profile", response_model=UserResponse)
async def get_profile(
    current_user: User = Depends(get_current_active_user)
):
    """Get user profile"""
    return UserResponse(**current_user.model_dump())


@router.patch("/profile", response_model=UserResponse)
async def update_profile(
    profile_update: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Update user profile"""

    update_data = profile_update.model_dump(exclude_unset=True)

    if not update_data:
        return UserResponse(**current_user.model_dump())

    update_data["updated_at"] = datetime.utcnow()

    result = await db.users.find_one_and_update(
        {"_id": current_user.id},
        {"$set": update_data},
        return_document=True
    )

    updated_user = User(**result)
    return UserResponse(**updated_user.model_dump())


@router.get("/notifications", response_model=NotificationPreferences)
async def get_notification_preferences(
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get notification preferences"""

    # Get from user preferences or return defaults
    prefs = await db.user_preferences.find_one({
        "user_id": current_user.id,
        "type": "notifications"
    })

    if prefs and "settings" in prefs:
        return NotificationPreferences(**prefs["settings"])

    return NotificationPreferences()


@router.put("/notifications", response_model=NotificationPreferences)
async def update_notification_preferences(
    preferences: NotificationPreferences,
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Update notification preferences"""

    await db.user_preferences.update_one(
        {"user_id": current_user.id, "type": "notifications"},
        {
            "$set": {
                "settings": preferences.model_dump(),
                "updated_at": datetime.utcnow()
            },
            "$setOnInsert": {
                "user_id": current_user.id,
                "type": "notifications",
                "created_at": datetime.utcnow()
            }
        },
        upsert=True
    )

    return preferences


@router.get("/integrations", response_model=IntegrationSettings)
async def get_integration_settings(
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get integration settings"""

    prefs = await db.user_preferences.find_one({
        "user_id": current_user.id,
        "type": "integrations"
    })

    if prefs and "settings" in prefs:
        return IntegrationSettings(**prefs["settings"])

    # Return defaults with user's actual connection status
    return IntegrationSettings(
        google_calendar_enabled=current_user.google_connected,
        gmail_sync_enabled=current_user.google_connected
    )


@router.put("/integrations", response_model=IntegrationSettings)
async def update_integration_settings(
    settings: IntegrationSettings,
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Update integration settings"""

    await db.user_preferences.update_one(
        {"user_id": current_user.id, "type": "integrations"},
        {
            "$set": {
                "settings": settings.model_dump(),
                "updated_at": datetime.utcnow()
            },
            "$setOnInsert": {
                "user_id": current_user.id,
                "type": "integrations",
                "created_at": datetime.utcnow()
            }
        },
        upsert=True
    )

    return settings


@router.post("/api-keys", status_code=status.HTTP_201_CREATED)
async def create_api_key(
    name: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Create API key for user"""

    import secrets

    api_key = f"sk_live_{secrets.token_urlsafe(32)}"

    key_doc = {
        "user_id": current_user.id,
        "name": name,
        "key_hash": api_key[:16] + "...",  # Store only partial for display
        "key_full": api_key,  # In production, hash this
        "created_at": datetime.utcnow(),
        "last_used": None,
        "active": True
    }

    result = await db.api_keys.insert_one(key_doc)

    return {
        "id": str(result.inserted_id),
        "name": name,
        "key": api_key,
        "message": "Save this key - it won't be shown again"
    }


@router.get("/api-keys")
async def list_api_keys(
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """List user API keys"""

    cursor = db.api_keys.find({"user_id": current_user.id, "active": True})
    keys = []

    async for key in cursor:
        keys.append({
            "id": str(key["_id"]),
            "name": key["name"],
            "key_partial": key["key_hash"],
            "created_at": key["created_at"],
            "last_used": key.get("last_used")
        })

    return {"keys": keys}
