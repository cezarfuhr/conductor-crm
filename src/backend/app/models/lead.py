"""
Lead model - Potential customers in the pipeline
"""

from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import EmailStr, Field
from .base import BaseDBModel, PyObjectId


class Lead(BaseDBModel):
    """Lead model - potential customer"""

    # Basic Information
    name: str = Field(..., description="Lead full name")
    email: EmailStr = Field(..., description="Lead email")
    phone: Optional[str] = Field(None, description="Phone number")
    company: Optional[str] = Field(None, description="Company name")
    job_title: Optional[str] = Field(None, description="Job title")

    # Lead Classification
    status: str = Field(
        default="new",
        description="Status: new, contacted, qualified, unqualified, converted"
    )
    source: str = Field(..., description="Lead source: website, referral, cold_call, etc")
    score: int = Field(default=0, ge=0, le=100, description="Lead score 0-100")
    classification: Optional[str] = Field(
        None,
        description="Classification: Hot, Warm, Cold"
    )

    # Enrichment Data (from Clearbit, etc)
    enrichment_data: Optional[Dict[str, Any]] = Field(
        None,
        description="Enriched company/person data"
    )
    enriched_at: Optional[datetime] = None

    # Qualification (AI)
    qualification_reasoning: Optional[str] = Field(
        None,
        description="AI reasoning for qualification"
    )
    next_actions: Optional[list[str]] = Field(
        None,
        description="Suggested next actions"
    )
    qualified_at: Optional[datetime] = None

    # Ownership
    owner_id: PyObjectId = Field(..., description="User who owns this lead")

    # Relationships
    company_id: Optional[PyObjectId] = Field(None, description="Related company ID")
    deal_id: Optional[PyObjectId] = Field(None, description="Deal ID if converted")

    # Metadata
    tags: list[str] = Field(default_factory=list)
    custom_fields: Optional[Dict[str, Any]] = Field(default_factory=dict)

    class Config:
        json_schema_extra = {
            "example": {
                "name": "John Doe",
                "email": "john@example.com",
                "phone": "+5511999999999",
                "company": "Acme Corp",
                "job_title": "CTO",
                "status": "new",
                "source": "website",
                "score": 85,
                "classification": "Hot",
                "owner_id": "507f1f77bcf86cd799439011",
            }
        }


class LeadCreate(BaseDBModel):
    """Schema for creating a lead"""

    name: str = Field(..., min_length=2)
    email: EmailStr
    phone: Optional[str] = None
    company: Optional[str] = None
    job_title: Optional[str] = None
    source: str
    tags: list[str] = Field(default_factory=list)
    custom_fields: Optional[Dict[str, Any]] = Field(default_factory=dict)


class LeadUpdate(BaseDBModel):
    """Schema for updating a lead"""

    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    job_title: Optional[str] = None
    status: Optional[str] = None
    source: Optional[str] = None
    score: Optional[int] = Field(None, ge=0, le=100)
    classification: Optional[str] = None
    tags: Optional[list[str]] = None
    custom_fields: Optional[Dict[str, Any]] = None


class LeadResponse(Lead):
    """Lead response with all fields"""
    pass
