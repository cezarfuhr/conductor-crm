"""
Notifications API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database import get_database
from app.dependencies import get_current_active_user
from app.models.user import User
from app.models.notification import Notification
from app.services.notification_service import NotificationService

router = APIRouter()


@router.get("/", response_model=dict)
async def list_notifications(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    unread_only: bool = False,
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """List user notifications"""

    service = NotificationService(db)
    notifications, total = await service.list_notifications(
        user_id=str(current_user.id),
        unread_only=unread_only,
        skip=skip,
        limit=limit
    )

    return {
        "items": notifications,
        "total": total,
        "unread_count": await db.notifications.count_documents({
            "user_id": current_user.id,
            "read": False
        }),
        "skip": skip,
        "limit": limit
    }


@router.patch("/{notification_id}/read", response_model=Notification)
async def mark_notification_as_read(
    notification_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Mark notification as read"""

    service = NotificationService(db)
    notification = await service.mark_as_read(notification_id)

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    # Verify ownership
    if str(notification.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    return notification


@router.post("/mark-all-read")
async def mark_all_notifications_as_read(
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Mark all notifications as read"""

    service = NotificationService(db)
    count = await service.mark_all_as_read(str(current_user.id))

    return {"message": f"Marked {count} notifications as read"}


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification(
    notification_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Delete notification"""

    service = NotificationService(db)

    # Verify ownership first
    from bson import ObjectId
    notif = await db.notifications.find_one({"_id": ObjectId(notification_id)})
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")

    if str(notif["user_id"]) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    await service.delete_notification(notification_id)
