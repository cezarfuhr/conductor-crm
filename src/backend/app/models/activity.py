"""
Activity model - Timeline/history of interactions
"""

from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import Field
from .base import BaseDBModel, PyObjectId


class Activity(BaseDBModel):
    """Activity/Event model for timeline"""

    type: str = Field(
        ...,
        description="Activity type: call, email, meeting, note, task, ai_email_generated, etc"
    )
    description: str = Field(..., description="Activity description")

    # Related entities
    entity_type: str = Field(..., description="Entity type: lead, deal, contact, company")
    entity_id: PyObjectId = Field(..., description="Related entity ID")

    # User who created/performed
    user_id: PyObjectId = Field(..., description="User who created this activity")

    # Email-specific
    email_subject: Optional[str] = None
    email_body: Optional[str] = None
    email_sent_to: Optional[str] = None

    # Call-specific
    call_duration: Optional[int] = Field(None, description="Call duration in seconds")
    call_outcome: Optional[str] = None

    # Meeting-specific
    meeting_date: Optional[datetime] = None
    meeting_attendees: list[str] = Field(default_factory=list)

    # Metadata
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)

    class Config:
        json_schema_extra = {
            "example": {
                "type": "call",
                "description": "Follow-up call to discuss proposal",
                "entity_type": "lead",
                "entity_id": "507f1f77bcf86cd799439011",
                "call_duration": 900,
                "call_outcome": "positive"
            }
        }
