"""
User model for authentication and authorization
"""

from datetime import datetime
from typing import Optional, List
from pydantic import EmailStr, Field
from .base import BaseDBModel


class User(BaseDBModel):
    """User model"""

    email: EmailStr = Field(..., description="User email (unique)")
    hashed_password: str = Field(..., description="Hashed password")
    full_name: str = Field(..., description="Full name")
    is_active: bool = Field(default=True, description="Is user active")
    is_superuser: bool = Field(default=False, description="Is superuser")
    role: str = Field(default="user", description="User role: user, admin, owner")

    # Profile
    avatar_url: Optional[str] = Field(None, description="Avatar URL")
    phone: Optional[str] = Field(None, description="Phone number")
    timezone: str = Field(default="UTC", description="User timezone")
    language: str = Field(default="en", description="Preferred language")

    # Integrations
    google_connected: bool = Field(default=False)
    google_refresh_token: Optional[str] = None
    google_access_token: Optional[str] = None
    google_token_expiry: Optional[datetime] = None

    # Activity tracking
    last_login: Optional[datetime] = None
    login_count: int = Field(default=0)

    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "full_name": "John Doe",
                "role": "user",
                "is_active": True,
                "timezone": "America/Sao_Paulo",
                "language": "pt-BR",
            }
        }


class UserCreate(BaseDBModel):
    """Schema for creating a user"""

    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=2)
    phone: Optional[str] = None


class UserUpdate(BaseDBModel):
    """Schema for updating a user"""

    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    timezone: Optional[str] = None
    language: Optional[str] = None
    avatar_url: Optional[str] = None


class UserInDB(User):
    """User model as stored in database"""
    hashed_password: str


class UserResponse(BaseDBModel):
    """User response schema (without sensitive data)"""

    email: EmailStr
    full_name: str
    is_active: bool
    role: str
    avatar_url: Optional[str] = None
    phone: Optional[str] = None
    timezone: str
    language: str
    google_connected: bool
    last_login: Optional[datetime] = None
    created_at: datetime
