"""
Notification service - Create and manage notifications
"""

from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.notification import Notification


class NotificationService:
    """Service for notification operations"""

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.notifications

    async def create_notification(
        self,
        user_id: str,
        type: str,
        title: str,
        message: str,
        priority: str = "medium",
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None
    ) -> Notification:
        """Create a new notification"""

        notif_dict = {
            "user_id": ObjectId(user_id),
            "type": type,
            "title": title,
            "message": message,
            "priority": priority,
            "read": False,
            "delivered_email": False,
            "delivered_push": False,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }

        if entity_type:
            notif_dict["entity_type"] = entity_type
        if entity_id:
            notif_dict["entity_id"] = ObjectId(entity_id)

        result = await self.collection.insert_one(notif_dict)
        notif_dict["_id"] = result.inserted_id

        return Notification(**notif_dict)

    async def list_notifications(
        self,
        user_id: str,
        unread_only: bool = False,
        skip: int = 0,
        limit: int = 20
    ) -> tuple[List[Notification], int]:
        """List user notifications"""

        query = {"user_id": ObjectId(user_id)}
        if unread_only:
            query["read"] = False

        total = await self.collection.count_documents(query)
        cursor = self.collection.find(query).sort("created_at", -1).skip(skip).limit(limit)
        notifications = [Notification(**doc) async for doc in cursor]

        return notifications, total

    async def mark_as_read(self, notification_id: str) -> Optional[Notification]:
        """Mark notification as read"""

        result = await self.collection.find_one_and_update(
            {"_id": ObjectId(notification_id)},
            {
                "$set": {
                    "read": True,
                    "read_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
            },
            return_document=True
        )

        return Notification(**result) if result else None

    async def mark_all_as_read(self, user_id: str) -> int:
        """Mark all user notifications as read"""

        result = await self.collection.update_many(
            {"user_id": ObjectId(user_id), "read": False},
            {
                "$set": {
                    "read": True,
                    "read_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
            }
        )

        return result.modified_count

    async def delete_notification(self, notification_id: str) -> bool:
        """Delete notification"""
        result = await self.collection.delete_one({"_id": ObjectId(notification_id)})
        return result.deleted_count > 0
