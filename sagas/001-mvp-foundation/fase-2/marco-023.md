# Marco 023: Gmail Integration
> Backend - Integração bidirecional com Gmail | 5 dias

**Responsável**: Backend Dev
**Revisor**: Tech Lead
**Status**: 🔵 Planejado

---

## 🎯 Objetivo

Implementar integração completa com Gmail usando OAuth 2.0, permitindo sincronização bidirecional de emails, envio através do CRM, e logging automático de atividades.

---

## 📋 Contexto

Integração com Gmail é **essencial** para:
- Centralizar comunicação no CRM
- Auto-log de emails como atividades
- Contexto completo de conversas
- Enviar emails através do CRM

---

## 🏗️ Arquitetura

```
User → OAuth Flow → Gmail API
                        ↓
              [Sync Emails (Pull)]
                        ↓
              [Store in Activities]
                        ↓
              [Parse & Link to Leads/Deals]

User sends email in CRM → [Gmail API Send] → Recipient
                              ↓
                        [Log as Activity]
```

---

## 🔐 OAuth 2.0 Flow

### 1. OAuth Configuration

```python
# src/services/gmail_oauth_service.py

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
import os

class GmailOAuthService:
    """
    Gerencia autenticação OAuth com Gmail
    """

    SCOPES = [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.modify'
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
        """
        Retorna URL para iniciar OAuth flow
        """
        flow = Flow.from_client_config(
            self.client_config,
            scopes=self.SCOPES,
            redirect_uri=self.client_config['web']['redirect_uris'][0]
        )

        authorization_url, state = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            state=user_id  # Pass user_id in state
        )

        return authorization_url

    async def handle_oauth_callback(self, code: str, user_id: str):
        """
        Processa callback do OAuth e salva tokens
        """
        flow = Flow.from_client_config(
            self.client_config,
            scopes=self.SCOPES,
            redirect_uri=self.client_config['web']['redirect_uris'][0]
        )

        flow.fetch_token(code=code)
        credentials = flow.credentials

        # Salvar tokens no banco
        await db.user_integrations.update_one(
            {"user_id": user_id, "integration": "gmail"},
            {
                "$set": {
                    "user_id": user_id,
                    "integration": "gmail",
                    "access_token": credentials.token,
                    "refresh_token": credentials.refresh_token,
                    "token_expiry": credentials.expiry,
                    "connected_at": datetime.utcnow(),
                    "status": "active"
                }
            },
            upsert=True
        )

        return {"message": "Gmail connected successfully"}

    def get_credentials(self, user_id: str) -> Credentials:
        """
        Retorna credentials do usuário (refresh se expirado)
        """
        integration = db.user_integrations.find_one({
            "user_id": user_id,
            "integration": "gmail"
        })

        if not integration:
            raise ValueError("Gmail not connected")

        credentials = Credentials(
            token=integration['access_token'],
            refresh_token=integration['refresh_token'],
            token_uri=self.client_config['web']['token_uri'],
            client_id=self.client_config['web']['client_id'],
            client_secret=self.client_config['web']['client_secret']
        )

        # Refresh if expired
        if credentials.expired:
            credentials.refresh(Request())

            # Update tokens in DB
            db.user_integrations.update_one(
                {"user_id": user_id, "integration": "gmail"},
                {
                    "$set": {
                        "access_token": credentials.token,
                        "token_expiry": credentials.expiry
                    }
                }
            )

        return credentials
```

---

## 📧 Email Sync Service

```python
# src/services/gmail_sync_service.py

from googleapiclient.discovery import build
import base64
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

class GmailSyncService:
    """
    Sincroniza emails do Gmail
    """

    def __init__(self, credentials):
        self.service = build('gmail', 'v1', credentials=credentials)

    async def sync_recent_emails(self, user_id: str, days: int = 7):
        """
        Sincroniza emails recentes (últimos N dias)
        """
        # Calculate date
        date_filter = (datetime.utcnow() - timedelta(days=days)).strftime('%Y/%m/%d')

        # Query: emails from/to known contacts
        query = f'after:{date_filter}'

        results = self.service.users().messages().list(
            userId='me',
            q=query,
            maxResults=100
        ).execute()

        messages = results.get('messages', [])

        for msg in messages:
            await self._process_message(user_id, msg['id'])

    async def _process_message(self, user_id: str, message_id: str):
        """
        Processa uma mensagem individual
        """
        # Get full message
        message = self.service.users().messages().get(
            userId='me',
            id=message_id,
            format='full'
        ).execute()

        # Extract headers
        headers = {h['name']: h['value'] for h in message['payload']['headers']}

        from_email = self._parse_email(headers.get('From', ''))
        to_emails = self._parse_email(headers.get('To', ''))
        subject = headers.get('Subject', '(No Subject)')
        date_str = headers.get('Date', '')

        # Parse body
        body = self._get_message_body(message)

        # Check if email already synced
        existing = await db.activities.find_one({
            'type': 'email',
            'content.gmail_message_id': message_id
        })

        if existing:
            return  # Already synced

        # Find related entity (Lead, Deal, Contact)
        entity = await self._find_related_entity(from_email, to_emails)

        if not entity:
            return  # No related entity, skip

        # Create activity
        activity = {
            'type': 'email',
            'entity_type': entity['type'],
            'entity_id': entity['id'],
            'title': f"Email: {subject}",
            'description': body[:500],  # First 500 chars
            'email_subject': subject,
            'email_direction': 'received' if from_email != user_id else 'sent',
            'content': {
                'gmail_message_id': message_id,
                'from': from_email,
                'to': to_emails,
                'body': body,
                'thread_id': message.get('threadId')
            },
            'created_at': self._parse_date(date_str),
            'created_by': user_id,
            'created_by_name': 'Gmail Sync'
        }

        await db.activities.insert_one(activity)

    def _get_message_body(self, message):
        """
        Extrai corpo do email (text/plain ou text/html)
        """
        parts = message['payload'].get('parts', [])

        if not parts:
            # Simple message
            body_data = message['payload'].get('body', {}).get('data', '')
            return base64.urlsafe_b64decode(body_data).decode('utf-8')

        # Multipart message
        for part in parts:
            if part['mimeType'] == 'text/plain':
                body_data = part['body'].get('data', '')
                return base64.urlsafe_b64decode(body_data).decode('utf-8')

        return ''

    async def _find_related_entity(self, from_email: str, to_emails: str):
        """
        Encontra Lead/Deal/Contact relacionado ao email
        """
        # Search in contacts
        contact = await db.contacts.find_one({'email': from_email})
        if contact:
            return {'type': 'contact', 'id': str(contact['_id'])}

        # Search in leads
        lead = await db.leads.find_one({'email': from_email})
        if lead:
            return {'type': 'lead', 'id': str(lead['_id'])}

        return None

    def _parse_email(self, email_str: str) -> str:
        """
        Extrai email de string "Name <email@domain.com>"
        """
        import re
        match = re.search(r'<(.+?)>', email_str)
        return match.group(1) if match else email_str

    def _parse_date(self, date_str: str) -> datetime:
        """
        Parse email date string
        """
        from email.utils import parsedate_to_datetime
        try:
            return parsedate_to_datetime(date_str)
        except:
            return datetime.utcnow()
```

---

## 📤 Email Send Service

```python
# src/services/gmail_send_service.py

class GmailSendService:
    """
    Envia emails através do Gmail
    """

    def __init__(self, credentials):
        self.service = build('gmail', 'v1', credentials=credentials)

    async def send_email(
        self,
        to: str,
        subject: str,
        body: str,
        user_id: str,
        entity_type: str = None,
        entity_id: str = None
    ):
        """
        Envia email e loga como atividade
        """
        # Create message
        message = MIMEText(body, 'html')
        message['to'] = to
        message['subject'] = subject

        raw = base64.urlsafe_b64encode(message.as_bytes()).decode()

        # Send via Gmail API
        sent_message = self.service.users().messages().send(
            userId='me',
            body={'raw': raw}
        ).execute()

        # Log as activity
        if entity_type and entity_id:
            activity = {
                'type': 'email',
                'entity_type': entity_type,
                'entity_id': entity_id,
                'title': f"Email sent: {subject}",
                'description': body[:500],
                'email_subject': subject,
                'email_direction': 'sent',
                'content': {
                    'gmail_message_id': sent_message['id'],
                    'to': to,
                    'body': body
                },
                'created_at': datetime.utcnow(),
                'created_by': user_id,
                'created_by_name': 'You'
            }

            await db.activities.insert_one(activity)

        return {
            'message_id': sent_message['id'],
            'status': 'sent'
        }
```

---

## 🔌 API Endpoints

```python
# src/api/routes/integrations/gmail.py

from fastapi import APIRouter, HTTPException

router = APIRouter()

@router.get("/integrations/gmail/connect")
async def connect_gmail(current_user: str = Depends(get_current_user)):
    """
    Retorna URL para conectar Gmail
    """
    oauth_service = GmailOAuthService()
    auth_url = oauth_service.get_authorization_url(current_user)

    return {"auth_url": auth_url}

@router.get("/integrations/gmail/callback")
async def gmail_callback(code: str, state: str):
    """
    Callback do OAuth (redirect from Google)
    """
    oauth_service = GmailOAuthService()
    result = await oauth_service.handle_oauth_callback(code, state)

    return result

@router.get("/integrations/gmail/status")
async def gmail_status(current_user: str = Depends(get_current_user)):
    """
    Verifica status da integração
    """
    integration = await db.user_integrations.find_one({
        "user_id": current_user,
        "integration": "gmail"
    })

    if not integration:
        return {"connected": False}

    return {
        "connected": True,
        "connected_at": integration['connected_at'],
        "status": integration['status']
    }

@router.post("/integrations/gmail/sync")
async def trigger_sync(current_user: str = Depends(get_current_user)):
    """
    Trigger manual de sincronização
    """
    oauth_service = GmailOAuthService()
    credentials = oauth_service.get_credentials(current_user)

    sync_service = GmailSyncService(credentials)
    await sync_service.sync_recent_emails(current_user, days=7)

    return {"message": "Sync started"}

@router.post("/integrations/gmail/send")
async def send_email(
    to: str,
    subject: str,
    body: str,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    current_user: str = Depends(get_current_user)
):
    """
    Envia email através do Gmail
    """
    oauth_service = GmailOAuthService()
    credentials = oauth_service.get_credentials(current_user)

    send_service = GmailSendService(credentials)
    result = await send_service.send_email(
        to, subject, body, current_user, entity_type, entity_id
    )

    return result

@router.delete("/integrations/gmail/disconnect")
async def disconnect_gmail(current_user: str = Depends(get_current_user)):
    """
    Desconecta Gmail
    """
    await db.user_integrations.delete_one({
        "user_id": current_user,
        "integration": "gmail"
    })

    return {"message": "Gmail disconnected"}
```

---

## ⚙️ Background Sync (Celery)

```python
# src/tasks/gmail_sync_tasks.py

from celery import Task

class GmailSyncTask(Task):
    """
    Task periódica para sincronizar emails
    """
    name = 'tasks.gmail_sync'

    def run(self):
        """
        Sincroniza emails de todos os usuários conectados
        """
        users = db.user_integrations.find({"integration": "gmail", "status": "active"})

        for user in users:
            try:
                oauth_service = GmailOAuthService()
                credentials = oauth_service.get_credentials(user['user_id'])

                sync_service = GmailSyncService(credentials)
                asyncio.run(sync_service.sync_recent_emails(user['user_id'], days=1))

            except Exception as e:
                logger.error(f"Gmail sync failed for user {user['user_id']}: {str(e)}")
```

**Cron**: Run every 15 minutes

---

## 🗄️ Database Schema

### Collection: user_integrations

```javascript
{
  _id: ObjectId,
  user_id: ObjectId,
  integration: String,  // 'gmail', 'calendar', etc
  access_token: String,  // Encrypted
  refresh_token: String,  // Encrypted
  token_expiry: Date,
  connected_at: Date,
  status: String,  // 'active', 'expired', 'revoked'
  last_sync_at: Date
}
```

---

## ✅ Critérios de Aceitação

- [ ] OAuth flow funciona (connect → callback → tokens saved)
- [ ] Email sync funciona (pull últimos 7 dias)
- [ ] Emails são salvos como atividades
- [ ] Emails são linkados a Leads/Contacts/Deals
- [ ] Send email funciona
- [ ] Emails enviados são logados como atividades
- [ ] Token refresh funciona automaticamente
- [ ] Background sync (Celery) funciona
- [ ] Status endpoint mostra conexão
- [ ] Disconnect funciona
- [ ] Erros são tratados gracefully
- [ ] Tokens são encrypted no banco

---

## 🔗 Dependências

- ✅ Marco 022: Activity Logging System
- ✅ Marco 009, 020: Lead, Contact models
- `google-auth`, `google-auth-oauthlib`, `google-api-python-client`

---

## 🚨 Riscos e Mitigações

### Risco 1: Rate limits do Gmail API
**Mitigação**:
- Sync incremental (apenas novos emails)
- Respeitar quotas (10k requests/dia)
- Exponential backoff em erros

### Risco 2: Token expirado/revogado
**Mitigação**:
- Auto-refresh tokens
- Notificar usuário se refresh falhar
- Status "revoked" na integração

### Risco 3: Sincronizar emails irrelevantes
**Mitigação**:
- Apenas sincronizar emails de/para contatos conhecidos
- Permitir configuração de filtros

---

**Status**: 🔵 Pronto para Implementação
**Estimativa**: 5 dias
**Prioridade**: 🔥 Alta (Core integration)
