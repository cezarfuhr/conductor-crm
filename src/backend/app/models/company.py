"""
Company model - Organizations/Accounts
"""

from typing import Optional, Dict, Any
from pydantic import Field, HttpUrl
from .base import BaseDBModel, PyObjectId


class Company(BaseDBModel):
    """Company/Account model"""

    name: str = Field(..., description="Company name")
    domain: Optional[str] = Field(None, description="Company domain")
    website: Optional[HttpUrl] = None
    industry: Optional[str] = None
    size: Optional[str] = Field(None, description="Company size: small, medium, large, enterprise")

    # Contact info
    phone: Optional[str] = None
    email: Optional[str] = None

    # Address
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None

    # Enrichment
    enrichment_data: Optional[Dict[str, Any]] = None
    enriched_at: Optional[str] = None

    # Ownership
    owner_id: PyObjectId = Field(..., description="User who owns this company")

    # Metadata
    tags: list[str] = Field(default_factory=list)
    custom_fields: Dict[str, Any] = Field(default_factory=dict)

    class Config:
        json_schema_extra = {
            "example": {
                "name": "Acme Corporation",
                "domain": "acme.com",
                "industry": "Technology",
                "size": "enterprise"
            }
        }
