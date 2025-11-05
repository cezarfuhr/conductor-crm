"""
Lead service - Business logic for leads
"""

from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.lead import Lead, LeadCreate, LeadUpdate


class LeadService:
    """Service for lead operations"""

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.leads

    async def create_lead(self, lead_data: LeadCreate, owner_id: str) -> Lead:
        """Create a new lead"""
        lead_dict = lead_data.model_dump(exclude_unset=True)
        lead_dict["owner_id"] = ObjectId(owner_id)
        lead_dict["created_at"] = datetime.utcnow()
        lead_dict["updated_at"] = datetime.utcnow()
        lead_dict["status"] = "new"
        lead_dict["score"] = 0

        result = await self.collection.insert_one(lead_dict)
        lead_dict["_id"] = result.inserted_id

        return Lead(**lead_dict)

    async def get_lead(self, lead_id: str) -> Optional[Lead]:
        """Get lead by ID"""
        lead = await self.collection.find_one({"_id": ObjectId(lead_id)})
        return Lead(**lead) if lead else None

    async def list_leads(
        self,
        owner_id: str,
        skip: int = 0,
        limit: int = 20,
        status: Optional[str] = None,
        search: Optional[str] = None
    ) -> tuple[List[Lead], int]:
        """List leads with filters and pagination"""

        query = {"owner_id": ObjectId(owner_id)}

        if status:
            query["status"] = status

        if search:
            query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"email": {"$regex": search, "$options": "i"}},
                {"company": {"$regex": search, "$options": "i"}}
            ]

        total = await self.collection.count_documents(query)

        cursor = self.collection.find(query).sort("created_at", -1).skip(skip).limit(limit)
        leads = [Lead(**doc) async for doc in cursor]

        return leads, total

    async def update_lead(self, lead_id: str, lead_update: LeadUpdate) -> Optional[Lead]:
        """Update lead"""
        update_data = lead_update.model_dump(exclude_unset=True)

        if not update_data:
            return await self.get_lead(lead_id)

        update_data["updated_at"] = datetime.utcnow()

        result = await self.collection.find_one_and_update(
            {"_id": ObjectId(lead_id)},
            {"$set": update_data},
            return_document=True
        )

        return Lead(**result) if result else None

    async def delete_lead(self, lead_id: str) -> bool:
        """Delete lead"""
        result = await self.collection.delete_one({"_id": ObjectId(lead_id)})
        return result.deleted_count > 0

    async def qualify_lead(
        self,
        lead_id: str,
        score: int,
        classification: str,
        reasoning: str,
        next_actions: List[str]
    ) -> Optional[Lead]:
        """Update lead with qualification data"""
        update_data = {
            "score": score,
            "classification": classification,
            "qualification_reasoning": reasoning,
            "next_actions": next_actions,
            "qualified_at": datetime.utcnow(),
            "status": "qualified",
            "updated_at": datetime.utcnow()
        }

        result = await self.collection.find_one_and_update(
            {"_id": ObjectId(lead_id)},
            {"$set": update_data},
            return_document=True
        )

        return Lead(**result) if result else None
