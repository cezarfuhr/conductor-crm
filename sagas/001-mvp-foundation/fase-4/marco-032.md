# Marco 032: Google Calendar Integration
> Backend - Integração bidirecional com Google Calendar | 3 dias

**Responsável**: Backend Dev
**Revisor**: Tech Lead
**Status**: 🔵 Planejado

---

## 🎯 Objetivo

Implementar integração completa com Google Calendar permitindo sincronização bidirecional de eventos, criação de meetings via CRM, e reminders automáticos.

---

## 📋 Key Features

- **OAuth 2.0 Flow**: Conectar Google Calendar
- **Sync Bidirecional**: CRM ↔ Google Calendar
- **Create Events**: Agendar reuniões via CRM
- **Update/Delete**: Modificar eventos sincronizados
- **Reminders**: Notificações antes de eventos
- **Attendees Management**: Convidar participantes

---

## 🔐 OAuth Implementation

```python
# src/services/google_calendar_service.py

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
import os

class GoogleCalendarService:
    """
    Serviço de integração com Google Calendar
    """

    SCOPES = [
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/calendar.readonly'
    ]

    def __init__(self):
        self.client_config = {
            "web": {
                "client_id": os.getenv('GOOGLE_CLIENT_ID'),
                "client_secret": os.getenv('GOOGLE_CLIENT_SECRET'),
                "redirect_uris": [os.getenv('GOOGLE_REDIRECT_URI')],
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token"
            }
        }

    def get_authorization_url(self, user_id: str) -> str:
        """Retorna URL para iniciar OAuth"""
        flow = Flow.from_client_config(
            self.client_config,
            scopes=self.SCOPES,
            redirect_uri=self.client_config['web']['redirect_uris'][0]
        )

        authorization_url, state = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            state=user_id,
            prompt='consent'  # Force to get refresh_token
        )

        return authorization_url

    async def handle_oauth_callback(self, code: str, user_id: str):
        """Processa callback e salva tokens"""
        flow = Flow.from_client_config(
            self.client_config,
            scopes=self.SCOPES,
            redirect_uri=self.client_config['web']['redirect_uris'][0]
        )

        flow.fetch_token(code=code)
        credentials = flow.credentials

        # Salvar tokens
        await db.user_integrations.update_one(
            {"user_id": user_id, "integration": "calendar"},
            {
                "$set": {
                    "user_id": user_id,
                    "integration": "calendar",
                    "access_token": credentials.token,
                    "refresh_token": credentials.refresh_token,
                    "token_expiry": credentials.expiry,
                    "connected_at": datetime.utcnow(),
                    "status": "active"
                }
            },
            upsert=True
        )

        # Trigger initial sync
        from src.tasks.calendar_tasks import SyncCalendarTask
        SyncCalendarTask().delay(user_id)

        return {"message": "Calendar connected successfully"}

    def get_credentials(self, user_id: str) -> Credentials:
        """Retorna credentials (refresh se necessário)"""
        integration = db.user_integrations.find_one({
            "user_id": user_id,
            "integration": "calendar"
        })

        if not integration:
            raise ValueError("Calendar not connected")

        credentials = Credentials(
            token=integration['access_token'],
            refresh_token=integration['refresh_token'],
            token_uri=self.client_config['web']['token_uri'],
            client_id=self.client_config['web']['client_id'],
            client_secret=self.client_config['web']['client_secret']
        )

        # Auto-refresh if expired
        if credentials.expired:
            credentials.refresh(Request())

            # Update tokens
            db.user_integrations.update_one(
                {"user_id": user_id, "integration": "calendar"},
                {
                    "$set": {
                        "access_token": credentials.token,
                        "token_expiry": credentials.expiry
                    }
                }
            )

        return credentials

    async def sync_events(self, user_id: str):
        """Sincroniza eventos do Google Calendar"""
        credentials = self.get_credentials(user_id)
        service = build('calendar', 'v3', credentials=credentials)

        # Get events from last 30 days
        now = datetime.utcnow()
        time_min = (now - timedelta(days=30)).isoformat() + 'Z'

        events_result = service.events().list(
            calendarId='primary',
            timeMin=time_min,
            maxResults=100,
            singleEvents=True,
            orderBy='startTime'
        ).execute()

        events = events_result.get('items', [])

        for event in events:
            await self._process_event(event, user_id)

    async def _process_event(self, google_event: Dict, user_id: str):
        """Processa e salva evento"""
        event_id = google_event['id']

        # Check if exists
        existing = await db.calendar_events.find_one({
            'google_event_id': event_id
        })

        event_data = {
            'google_event_id': event_id,
            'calendar_id': 'primary',
            'title': google_event.get('summary', '(No title)'),
            'description': google_event.get('description', ''),
            'start_time': self._parse_datetime(google_event['start']),
            'end_time': self._parse_datetime(google_event['end']),
            'location': google_event.get('location', ''),
            'attendees': [
                {
                    'email': a.get('email'),
                    'name': a.get('displayName'),
                    'status': a.get('responseStatus')
                }
                for a in google_event.get('attendees', [])
            ],
            'synced_at': datetime.utcnow(),
            'created_by': user_id
        }

        if existing:
            await db.calendar_events.update_one(
                {'_id': existing['_id']},
                {'$set': event_data}
            )
        else:
            await db.calendar_events.insert_one(event_data)

    async def create_event(
        self,
        user_id: str,
        title: str,
        start_time: datetime,
        end_time: datetime,
        description: str = '',
        location: str = '',
        attendees: List[str] = [],
        entity_type: str = None,
        entity_id: str = None
    ) -> Dict:
        """Cria evento no Google Calendar"""
        credentials = self.get_credentials(user_id)
        service = build('calendar', 'v3', credentials=credentials)

        event = {
            'summary': title,
            'description': description,
            'location': location,
            'start': {
                'dateTime': start_time.isoformat(),
                'timeZone': 'America/Sao_Paulo',
            },
            'end': {
                'dateTime': end_time.isoformat(),
                'timeZone': 'America/Sao_Paulo',
            },
            'attendees': [{'email': email} for email in attendees],
            'reminders': {
                'useDefault': False,
                'overrides': [
                    {'method': 'email', 'minutes': 24 * 60},  # 1 day before
                    {'method': 'popup', 'minutes': 10},       # 10 minutes before
                ],
            },
        }

        # Create in Google Calendar
        created_event = service.events().insert(
            calendarId='primary',
            body=event,
            sendUpdates='all'  # Send email invites
        ).execute()

        # Save to database
        await db.calendar_events.insert_one({
            'google_event_id': created_event['id'],
            'calendar_id': 'primary',
            'title': title,
            'description': description,
            'start_time': start_time,
            'end_time': end_time,
            'location': location,
            'attendees': [{'email': e} for e in attendees],
            'entity_type': entity_type,
            'entity_id': ObjectId(entity_id) if entity_id else None,
            'synced_at': datetime.utcnow(),
            'created_by': user_id
        })

        # Log as activity
        if entity_type and entity_id:
            await db.activities.insert_one({
                'type': 'meeting',
                'entity_type': entity_type,
                'entity_id': ObjectId(entity_id),
                'title': f"Meeting scheduled: {title}",
                'description': description,
                'meeting_start_time': start_time,
                'meeting_end_time': end_time,
                'meeting_attendees': attendees,
                'created_at': datetime.utcnow(),
                'created_by': user_id
            })

        return {
            'event_id': created_event['id'],
            'html_link': created_event.get('htmlLink')
        }

    def _parse_datetime(self, time_obj: Dict) -> datetime:
        """Parse Google Calendar datetime"""
        if 'dateTime' in time_obj:
            return datetime.fromisoformat(time_obj['dateTime'].replace('Z', '+00:00'))
        else:
            # All-day event
            return datetime.fromisoformat(time_obj['date'])
```

---

## 🔌 API Endpoints

```python
# src/api/routes/integrations/calendar.py

@router.get("/integrations/calendar/connect")
async def connect_calendar(current_user: str = Depends(get_current_user)):
    """OAuth URL para conectar Calendar"""
    service = GoogleCalendarService()
    auth_url = service.get_authorization_url(current_user)
    return {"auth_url": auth_url}

@router.get("/integrations/calendar/callback")
async def calendar_callback(code: str, state: str):
    """OAuth callback"""
    service = GoogleCalendarService()
    result = await service.handle_oauth_callback(code, state)
    return result

@router.get("/integrations/calendar/status")
async def calendar_status(current_user: str = Depends(get_current_user)):
    """Status da integração"""
    integration = await db.user_integrations.find_one({
        "user_id": current_user,
        "integration": "calendar"
    })

    if not integration:
        return {"connected": False}

    return {
        "connected": True,
        "connected_at": integration['connected_at'],
        "status": integration['status']
    }

@router.get("/calendar/events")
async def list_events(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    current_user: str = Depends(get_current_user)
):
    """Lista eventos"""
    filter_query = {"created_by": current_user}

    if start_date:
        filter_query['start_time'] = {'$gte': start_date}
    if end_date:
        filter_query.setdefault('start_time', {})['$lte'] = end_date
    if entity_type:
        filter_query['entity_type'] = entity_type
    if entity_id:
        filter_query['entity_id'] = ObjectId(entity_id)

    events = await db.calendar_events.find(filter_query).sort('start_time', 1).to_list(length=100)

    return [
        {
            'id': str(e['_id']),
            'title': e['title'],
            'start_time': e['start_time'],
            'end_time': e['end_time'],
            'location': e.get('location'),
            'attendees': e.get('attendees', [])
        }
        for e in events
    ]

@router.post("/calendar/events")
async def create_event(
    title: str,
    start_time: datetime,
    end_time: datetime,
    description: str = '',
    location: str = '',
    attendees: List[str] = [],
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    current_user: str = Depends(get_current_user)
):
    """Cria evento"""
    service = GoogleCalendarService()
    result = await service.create_event(
        user_id=current_user,
        title=title,
        start_time=start_time,
        end_time=end_time,
        description=description,
        location=location,
        attendees=attendees,
        entity_type=entity_type,
        entity_id=entity_id
    )
    return result

@router.post("/calendar/sync")
async def sync_calendar(current_user: str = Depends(get_current_user)):
    """Trigger manual sync"""
    service = GoogleCalendarService()
    await service.sync_events(current_user)
    return {"message": "Sync completed"}
```

---

## 🔄 Background Sync (Celery)

```python
# src/tasks/calendar_tasks.py

from celery import Task

class SyncCalendarTask(Task):
    """Sync calendário automático"""
    name = 'tasks.sync_calendar'

    def run(self, user_id: str):
        """Sincroniza calendário do usuário"""
        import asyncio
        from src.services.google_calendar_service import GoogleCalendarService

        service = GoogleCalendarService()
        asyncio.run(service.sync_events(user_id))

# Celery Beat Schedule (cron)
# Every 15 minutes
```

---

## ✅ Critérios de Aceitação

- [ ] OAuth flow funciona
- [ ] Sync bidirecional funciona
- [ ] Criar evento via CRM aparece no Google
- [ ] Eventos do Google aparecem no CRM
- [ ] Attendees recebem convite
- [ ] Reminders funcionam
- [ ] Update/Delete sincroniza
- [ ] Background sync (15 min)
- [ ] Token refresh automático
- [ ] Error handling robusto

---

## 🔗 Dependências

- ✅ Marco 022: Activity Logging (meeting type)
- `google-auth`, `google-auth-oauthlib`, `google-api-python-client`

---

**Status**: 🔵 Pronto para Implementação
**Estimativa**: 3 dias
