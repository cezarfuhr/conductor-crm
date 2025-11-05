"""
Notification model - System notifications
"""

from typing import Optional
from pydantic import Field
from .base import BaseDBModel, PyObjectId


class Notification(BaseDBModel):
    """Notification model"""

    user_id: PyObjectId = Field(..., description="Target user")
    type: str = Field(..., description="Type: lead_qualified, deal_won, activity_created, etc")
    title: str = Field(..., description="Notification title")
    message: str = Field(..., description="Notification message")
    priority: str = Field(default="medium", description="Priority: low, medium, high, urgent")

    # Related entity
    entity_type: Optional[str] = Field(None, description="lead, deal, contact, etc")
    entity_id: Optional[PyObjectId] = None

    # Status
    read: bool = Field(default=False)
    read_at: Optional[str] = None

    # Delivery
    delivered_email: bool = Field(default=False)
    delivered_push: bool = Field(default=False)

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "507f1f77bcf86cd799439011",
                "type": "lead_qualified",
                "title": "New Hot Lead",
                "message": "Lead John Doe has been qualified as Hot",
                "priority": "high"
            }
        }
