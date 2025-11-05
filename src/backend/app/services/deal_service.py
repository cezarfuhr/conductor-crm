"""
Deal service - Business logic for deals
"""

from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.deal import Deal, DealCreate, DealUpdate


class DealService:
    """Service for deal operations"""

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.deals

    async def create_deal(self, deal_data: DealCreate, owner_id: str) -> Deal:
        """Create a new deal"""
        deal_dict = deal_data.model_dump(exclude_unset=True)
        deal_dict["owner_id"] = ObjectId(owner_id)
        deal_dict["created_at"] = datetime.utcnow()
        deal_dict["updated_at"] = datetime.utcnow()

        result = await self.collection.insert_one(deal_dict)
        deal_dict["_id"] = result.inserted_id

        return Deal(**deal_dict)

    async def get_deal(self, deal_id: str) -> Optional[Deal]:
        """Get deal by ID"""
        deal = await self.collection.find_one({"_id": ObjectId(deal_id)})
        return Deal(**deal) if deal else None

    async def list_deals(
        self,
        owner_id: str,
        skip: int = 0,
        limit: int = 20,
        stage: Optional[str] = None
    ) -> tuple[List[Deal], int]:
        """List deals with filters"""
        query = {"owner_id": ObjectId(owner_id)}

        if stage:
            query["stage"] = stage

        total = await self.collection.count_documents(query)
        cursor = self.collection.find(query).sort("created_at", -1).skip(skip).limit(limit)
        deals = [Deal(**doc) async for doc in cursor]

        return deals, total

    async def update_deal(self, deal_id: str, deal_update: DealUpdate) -> Optional[Deal]:
        """Update deal"""
        update_data = deal_update.model_dump(exclude_unset=True)

        if not update_data:
            return await self.get_deal(deal_id)

        update_data["updated_at"] = datetime.utcnow()

        result = await self.collection.find_one_and_update(
            {"_id": ObjectId(deal_id)},
            {"$set": update_data},
            return_document=True
        )

        return Deal(**result) if result else None

    async def delete_deal(self, deal_id: str) -> bool:
        """Delete deal"""
        result = await self.collection.delete_one({"_id": ObjectId(deal_id)})
        return result.deleted_count > 0

    async def move_deal_stage(self, deal_id: str, new_stage: str) -> Optional[Deal]:
        """Move deal to new stage"""
        update_data = {
            "stage": new_stage,
            "updated_at": datetime.utcnow()
        }

        if new_stage in ["won", "lost"]:
            update_data["actual_close_date"] = datetime.utcnow()

        result = await self.collection.find_one_and_update(
            {"_id": ObjectId(deal_id)},
            {"$set": update_data},
            return_document=True
        )

        return Deal(**result) if result else None
