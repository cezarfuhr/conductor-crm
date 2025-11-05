"""
Google Calendar Integration Service

Handles OAuth authentication and calendar operations for Google Calendar.
"""

from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import aiohttp
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


class GoogleCalendarService:
    """Service for Google Calendar integration"""

    GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
    GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
    GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3"

    SCOPES = [
        "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/calendar.events"
    ]

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db

    def get_authorization_url(self, user_id: str, redirect_uri: str) -> str:
        """
        Generate Google OAuth authorization URL

        Args:
            user_id: User ID to associate with the token
            redirect_uri: Callback URL after authorization

        Returns:
            Authorization URL to redirect user to
        """
        params = {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": " ".join(self.SCOPES),
            "access_type": "offline",
            "prompt": "consent",
            "state": user_id  # Pass user_id as state
        }

        query_string = "&".join(f"{k}={v}" for k, v in params.items())
        return f"{self.GOOGLE_AUTH_URL}?{query_string}"

    async def exchange_code_for_tokens(
        self,
        code: str,
        redirect_uri: str
    ) -> Dict[str, Any]:
        """
        Exchange authorization code for access and refresh tokens

        Args:
            code: Authorization code from Google
            redirect_uri: Same redirect URI used in authorization

        Returns:
            Token data including access_token, refresh_token, expires_in
        """
        async with aiohttp.ClientSession() as session:
            data = {
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code"
            }

            async with session.post(self.GOOGLE_TOKEN_URL, data=data) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"Token exchange failed: {error_text}")
                    raise Exception("Failed to exchange code for tokens")

                return await response.json()

    async def save_tokens(
        self,
        user_id: str,
        tokens: Dict[str, Any]
    ) -> None:
        """
        Save Google tokens for a user

        Args:
            user_id: User ID
            tokens: Token data from Google
        """
        token_doc = {
            "user_id": user_id,
            "access_token": tokens["access_token"],
            "refresh_token": tokens.get("refresh_token"),
            "expires_at": datetime.utcnow() + timedelta(seconds=tokens["expires_in"]),
            "scope": tokens.get("scope", " ".join(self.SCOPES)),
            "token_type": tokens.get("token_type", "Bearer"),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }

        await self.db.google_tokens.update_one(
            {"user_id": user_id},
            {"$set": token_doc},
            upsert=True
        )

        # Update user's google_connected status
        await self.db.users.update_one(
            {"_id": user_id},
            {"$set": {"google_connected": True, "updated_at": datetime.utcnow()}}
        )

    async def get_valid_token(self, user_id: str) -> Optional[str]:
        """
        Get a valid access token, refreshing if necessary

        Args:
            user_id: User ID

        Returns:
            Valid access token or None if not connected
        """
        token_doc = await self.db.google_tokens.find_one({"user_id": user_id})

        if not token_doc:
            return None

        # Check if token is expired (with 5 minute buffer)
        if token_doc["expires_at"] < datetime.utcnow() + timedelta(minutes=5):
            # Refresh token
            if not token_doc.get("refresh_token"):
                logger.error(f"No refresh token for user {user_id}")
                return None

            try:
                new_tokens = await self._refresh_access_token(
                    token_doc["refresh_token"]
                )
                await self.save_tokens(user_id, new_tokens)
                return new_tokens["access_token"]
            except Exception as e:
                logger.error(f"Token refresh failed: {e}")
                return None

        return token_doc["access_token"]

    async def _refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        """
        Refresh access token using refresh token

        Args:
            refresh_token: Refresh token from Google

        Returns:
            New token data
        """
        async with aiohttp.ClientSession() as session:
            data = {
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token"
            }

            async with session.post(self.GOOGLE_TOKEN_URL, data=data) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"Token refresh failed: {error_text}")
                    raise Exception("Failed to refresh access token")

                tokens = await response.json()
                # Refresh response doesn't include refresh_token, preserve it
                tokens["refresh_token"] = refresh_token
                return tokens

    async def disconnect(self, user_id: str) -> None:
        """
        Disconnect Google Calendar for a user

        Args:
            user_id: User ID
        """
        await self.db.google_tokens.delete_one({"user_id": user_id})
        await self.db.users.update_one(
            {"_id": user_id},
            {"$set": {"google_connected": False, "updated_at": datetime.utcnow()}}
        )

    async def list_calendars(self, user_id: str) -> List[Dict[str, Any]]:
        """
        List user's Google Calendars

        Args:
            user_id: User ID

        Returns:
            List of calendar objects
        """
        access_token = await self.get_valid_token(user_id)
        if not access_token:
            raise Exception("Not connected to Google Calendar")

        async with aiohttp.ClientSession() as session:
            headers = {"Authorization": f"Bearer {access_token}"}
            url = f"{self.GOOGLE_CALENDAR_API}/users/me/calendarList"

            async with session.get(url, headers=headers) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"Failed to list calendars: {error_text}")
                    raise Exception("Failed to list calendars")

                data = await response.json()
                return data.get("items", [])

    async def create_event(
        self,
        user_id: str,
        calendar_id: str,
        event_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Create a calendar event

        Args:
            user_id: User ID
            calendar_id: Google Calendar ID (usually 'primary')
            event_data: Event data (summary, description, start, end)

        Returns:
            Created event object
        """
        access_token = await self.get_valid_token(user_id)
        if not access_token:
            raise Exception("Not connected to Google Calendar")

        async with aiohttp.ClientSession() as session:
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }
            url = f"{self.GOOGLE_CALENDAR_API}/calendars/{calendar_id}/events"

            async with session.post(url, headers=headers, json=event_data) as response:
                if response.status not in (200, 201):
                    error_text = await response.text()
                    logger.error(f"Failed to create event: {error_text}")
                    raise Exception("Failed to create event")

                return await response.json()

    async def list_events(
        self,
        user_id: str,
        calendar_id: str = "primary",
        time_min: Optional[datetime] = None,
        time_max: Optional[datetime] = None,
        max_results: int = 100
    ) -> List[Dict[str, Any]]:
        """
        List calendar events

        Args:
            user_id: User ID
            calendar_id: Google Calendar ID
            time_min: Minimum start time
            time_max: Maximum start time
            max_results: Maximum number of events

        Returns:
            List of event objects
        """
        access_token = await self.get_valid_token(user_id)
        if not access_token:
            raise Exception("Not connected to Google Calendar")

        params = {
            "maxResults": max_results,
            "orderBy": "startTime",
            "singleEvents": True
        }

        if time_min:
            params["timeMin"] = time_min.isoformat() + "Z"
        if time_max:
            params["timeMax"] = time_max.isoformat() + "Z"

        async with aiohttp.ClientSession() as session:
            headers = {"Authorization": f"Bearer {access_token}"}
            url = f"{self.GOOGLE_CALENDAR_API}/calendars/{calendar_id}/events"

            async with session.get(url, headers=headers, params=params) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"Failed to list events: {error_text}")
                    raise Exception("Failed to list events")

                data = await response.json()
                return data.get("items", [])

    async def delete_event(
        self,
        user_id: str,
        calendar_id: str,
        event_id: str
    ) -> None:
        """
        Delete a calendar event

        Args:
            user_id: User ID
            calendar_id: Google Calendar ID
            event_id: Google Calendar event ID
        """
        access_token = await self.get_valid_token(user_id)
        if not access_token:
            raise Exception("Not connected to Google Calendar")

        async with aiohttp.ClientSession() as session:
            headers = {"Authorization": f"Bearer {access_token}"}
            url = f"{self.GOOGLE_CALENDAR_API}/calendars/{calendar_id}/events/{event_id}"

            async with session.delete(url, headers=headers) as response:
                if response.status not in (200, 204):
                    error_text = await response.text()
                    logger.error(f"Failed to delete event: {error_text}")
                    raise Exception("Failed to delete event")
