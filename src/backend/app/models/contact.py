"""
Contact model - People associated with companies/deals
"""

from typing import Optional
from pydantic import EmailStr, Field
from .base import BaseDBModel, PyObjectId


class Contact(BaseDBModel):
    """Contact model"""

    first_name: str = Field(..., description="Contact first name")
    last_name: str = Field(..., description="Contact last name")
    email: EmailStr = Field(..., description="Contact email")
    phone: Optional[str] = None
    mobile: Optional[str] = None
    job_title: Optional[str] = None

    # Relationships
    company_id: Optional[PyObjectId] = Field(None, description="Associated company")
    owner_id: PyObjectId = Field(..., description="User who owns this contact")

    # Social
    linkedin_url: Optional[str] = None
    twitter_handle: Optional[str] = None

    # Metadata
    tags: list[str] = Field(default_factory=list)
    notes: Optional[str] = None

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"

    class Config:
        json_schema_extra = {
            "example": {
                "first_name": "John",
                "last_name": "Doe",
                "email": "john.doe@acme.com",
                "job_title": "VP of Sales"
            }
        }
