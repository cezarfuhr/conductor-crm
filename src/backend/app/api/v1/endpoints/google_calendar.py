"""
Google Calendar Integration endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.database import get_database
from app.dependencies import get_current_active_user
from app.models.user import User
from app.services.google_calendar_service import GoogleCalendarService

router = APIRouter()


class OAuthCallbackRequest(BaseModel):
    code: str
    state: str


class CreateEventRequest(BaseModel):
    summary: str
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    calendar_id: str = "primary"
    attendees: Optional[List[str]] = None
    location: Optional[str] = None


class CalendarResponse(BaseModel):
    id: str
    summary: str
    description: Optional[str] = None
    primary: bool = False
    access_role: str


class EventResponse(BaseModel):
    id: str
    summary: str
    description: Optional[str] = None
    start: dict
    end: dict
    htmlLink: str
    attendees: Optional[List[dict]] = None
    location: Optional[str] = None


@router.get("/auth/url")
async def get_google_auth_url(
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Get Google OAuth authorization URL

    Returns URL to redirect user to for Google authentication
    """
    service = GoogleCalendarService(db)

    # Construct redirect URI based on request
    redirect_uri = f"{request.base_url}api/v1/google-calendar/auth/callback"

    auth_url = service.get_authorization_url(
        user_id=str(current_user.id),
        redirect_uri=str(redirect_uri)
    )

    return {
        "authorization_url": auth_url,
        "redirect_uri": str(redirect_uri)
    }


@router.get("/auth/callback")
async def google_auth_callback(
    code: str = Query(...),
    state: str = Query(...),  # This is the user_id
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Google OAuth callback endpoint

    Handles the OAuth callback from Google and exchanges code for tokens
    """
    service = GoogleCalendarService(db)

    try:
        # Exchange code for tokens
        tokens = await service.exchange_code_for_tokens(
            code=code,
            redirect_uri=f"{settings.FRONTEND_URL}/google-calendar/callback"
        )

        # Save tokens
        await service.save_tokens(user_id=state, tokens=tokens)

        return {
            "status": "success",
            "message": "Google Calendar connected successfully",
            "redirect": f"{settings.FRONTEND_URL}/settings?google_calendar=connected"
        }

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to connect Google Calendar: {str(e)}"
        )


@router.post("/disconnect")
async def disconnect_google_calendar(
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Disconnect Google Calendar integration
    """
    service = GoogleCalendarService(db)
    await service.disconnect(str(current_user.id))

    return {
        "status": "success",
        "message": "Google Calendar disconnected"
    }


@router.get("/calendars", response_model=List[CalendarResponse])
async def list_calendars(
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    List user's Google Calendars
    """
    service = GoogleCalendarService(db)

    try:
        calendars = await service.list_calendars(str(current_user.id))

        return [
            CalendarResponse(
                id=cal["id"],
                summary=cal["summary"],
                description=cal.get("description"),
                primary=cal.get("primary", False),
                access_role=cal.get("accessRole", "reader")
            )
            for cal in calendars
        ]

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to list calendars: {str(e)}"
        )


@router.post("/events", response_model=EventResponse)
async def create_calendar_event(
    event: CreateEventRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Create a Google Calendar event
    """
    service = GoogleCalendarService(db)

    # Prepare event data for Google Calendar API
    event_data = {
        "summary": event.summary,
        "start": {
            "dateTime": event.start_time.isoformat(),
            "timeZone": "UTC"
        },
        "end": {
            "dateTime": event.end_time.isoformat(),
            "timeZone": "UTC"
        }
    }

    if event.description:
        event_data["description"] = event.description

    if event.location:
        event_data["location"] = event.location

    if event.attendees:
        event_data["attendees"] = [{"email": email} for email in event.attendees]

    try:
        created_event = await service.create_event(
            user_id=str(current_user.id),
            calendar_id=event.calendar_id,
            event_data=event_data
        )

        return EventResponse(**created_event)

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to create event: {str(e)}"
        )


@router.get("/events", response_model=List[EventResponse])
async def list_calendar_events(
    calendar_id: str = Query(default="primary"),
    time_min: Optional[datetime] = Query(default=None),
    time_max: Optional[datetime] = Query(default=None),
    max_results: int = Query(default=100, le=250),
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    List Google Calendar events
    """
    service = GoogleCalendarService(db)

    try:
        events = await service.list_events(
            user_id=str(current_user.id),
            calendar_id=calendar_id,
            time_min=time_min,
            time_max=time_max,
            max_results=max_results
        )

        return [EventResponse(**event) for event in events]

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to list events: {str(e)}"
        )


@router.delete("/events/{event_id}")
async def delete_calendar_event(
    event_id: str,
    calendar_id: str = Query(default="primary"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Delete a Google Calendar event
    """
    service = GoogleCalendarService(db)

    try:
        await service.delete_event(
            user_id=str(current_user.id),
            calendar_id=calendar_id,
            event_id=event_id
        )

        return {
            "status": "success",
            "message": "Event deleted successfully"
        }

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to delete event: {str(e)}"
        )


@router.get("/status")
async def get_connection_status(
    current_user: User = Depends(get_current_active_user)
):
    """
    Get Google Calendar connection status
    """
    return {
        "connected": current_user.google_connected,
        "user_id": str(current_user.id)
    }


from app.core.config import settings
