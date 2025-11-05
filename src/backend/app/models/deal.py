"""
Deal model - Sales opportunities
"""

from datetime import datetime, date
from typing import Optional, Dict, Any, List
from pydantic import Field
from .base import BaseDBModel, PyObjectId


class Deal(BaseDBModel):
    """Deal/Opportunity model"""

    # Basic Information
    title: str = Field(..., description="Deal title")
    value: float = Field(..., ge=0, description="Deal value")
    currency: str = Field(default="BRL")

    # Pipeline
    stage: str = Field(
        ...,
        description="Stage: prospecting, qualification, proposal, negotiation, won, lost"
    )
    probability: int = Field(default=50, ge=0, le=100, description="Win probability %")
    expected_close_date: Optional[date] = None
    actual_close_date: Optional[datetime] = None

    # Relationships
    lead_id: Optional[PyObjectId] = Field(None, description="Original lead ID")
    company_id: Optional[PyObjectId] = Field(None)
    contact_ids: List[PyObjectId] = Field(default_factory=list)
    owner_id: PyObjectId = Field(..., description="Deal owner")

    # AI Insights
    ai_score: Optional[int] = Field(None, ge=0, le=100, description="AI health score")
    ai_insights: Optional[Dict[str, Any]] = Field(None, description="AI predictions")
    risk_factors: Optional[List[str]] = Field(default_factory=list)

    # Metadata
    tags: List[str] = Field(default_factory=list)
    custom_fields: Dict[str, Any] = Field(default_factory=dict)
    lost_reason: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "title": "Enterprise Deal - Acme Corp",
                "value": 50000.00,
                "stage": "negotiation",
                "probability": 75,
                "expected_close_date": "2025-12-31",
                "owner_id": "507f1f77bcf86cd799439011",
            }
        }


class DealCreate(BaseDBModel):
    title: str
    value: float = Field(..., ge=0)
    currency: str = "BRL"
    stage: str = "prospecting"
    probability: int = Field(default=50, ge=0, le=100)
    expected_close_date: Optional[date] = None
    lead_id: Optional[PyObjectId] = None
    company_id: Optional[PyObjectId] = None
    tags: List[str] = Field(default_factory=list)


class DealUpdate(BaseDBModel):
    title: Optional[str] = None
    value: Optional[float] = Field(None, ge=0)
    stage: Optional[str] = None
    probability: Optional[int] = Field(None, ge=0, le=100)
    expected_close_date: Optional[date] = None
    tags: Optional[List[str]] = None
    lost_reason: Optional[str] = None


class DealResponse(Deal):
    """Deal response"""
    pass
