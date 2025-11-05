# Marco 026: Email Tracking
> Backend + Frontend - Sistema de tracking de opens e clicks | 3 dias

**Responsável**: Backend Dev + Frontend Dev
**Revisor**: Tech Lead
**Status**: 🔵 Planejado

---

## 🎯 Objetivo

Implementar sistema completo de email tracking com pixel tracking (opens), link tracking (clicks), webhooks para eventos, e engagement score por contato.

---

## 📋 Key Features

- **Open Tracking**: Pixel 1x1 transparente
- **Click Tracking**: Redirecionamento via proxy
- **Webhooks**: Receber eventos de provedores (SendGrid, etc)
- **Engagement Score**: Score 0-100 baseado em opens/clicks
- **Metrics UI**: Visualizar opens/clicks na atividade

---

## 🏗️ Arquitetura

```
Email Sent (with tracking pixel + tracked links)
        ↓
Recipient Opens Email → GET /tracking/pixel/{id}.png
        ↓
[Log Event: opened]
        ↓
Recipient Clicks Link → GET /tracking/click/{id}
        ↓
[Log Event: clicked] → [Redirect to actual URL]
```

---

## 💻 Backend Implementation

### 1. Tracking Service

```python
# src/services/email_tracking_service.py

from fastapi import Request
import hashlib
import base64
from datetime import datetime
from typing import Dict, List, Optional

class EmailTrackingService:
    """
    Serviço de tracking de emails
    """

    def generate_tracking_pixel_url(self, activity_id: str) -> str:
        """
        Gera URL do tracking pixel
        """
        # Encode activity_id
        tracking_id = base64.urlsafe_b64encode(activity_id.encode()).decode()

        return f"{os.getenv('APP_URL')}/api/v1/tracking/pixel/{tracking_id}.png"

    def wrap_links_with_tracking(self, html_body: str, activity_id: str) -> str:
        """
        Substitui todos os links por links tracked
        """
        from bs4 import BeautifulSoup
        import re

        soup = BeautifulSoup(html_body, 'html.parser')

        # Find all <a> tags
        for link in soup.find_all('a', href=True):
            original_url = link['href']

            # Don't track mailto: or tel: links
            if original_url.startswith(('mailto:', 'tel:')):
                continue

            # Generate tracking URL
            tracking_url = self._generate_tracking_link(activity_id, original_url)
            link['href'] = tracking_url

        return str(soup)

    def _generate_tracking_link(self, activity_id: str, original_url: str) -> str:
        """
        Gera link de tracking
        """
        # Create tracking ID
        link_data = {
            'activity_id': activity_id,
            'url': original_url,
            'created_at': datetime.utcnow().isoformat()
        }

        # Hash to create short ID
        link_hash = hashlib.md5(
            f"{activity_id}:{original_url}".encode()
        ).hexdigest()[:12]

        # Store in database
        db.tracking_links.insert_one({
            '_id': link_hash,
            **link_data
        })

        return f"{os.getenv('APP_URL')}/api/v1/tracking/click/{link_hash}"

    async def log_open_event(
        self,
        activity_id: str,
        request: Request
    ):
        """
        Loga evento de abertura de email
        """
        # Extract metadata
        metadata = {
            'ip_address': request.client.host,
            'user_agent': request.headers.get('user-agent'),
            'timestamp': datetime.utcnow()
        }

        # Check if already opened
        event = await db.email_tracking_events.find_one({
            'activity_id': ObjectId(activity_id)
        })

        if event:
            # Increment open count
            await db.email_tracking_events.update_one(
                {'_id': event['_id']},
                {
                    '$inc': {'open_count': 1},
                    '$set': {'last_opened_at': datetime.utcnow()},
                    '$push': {'open_metadata': metadata}
                }
            )
        else:
            # First open
            await db.email_tracking_events.insert_one({
                'activity_id': ObjectId(activity_id),
                'event_type': 'opened',
                'open_count': 1,
                'first_opened_at': datetime.utcnow(),
                'last_opened_at': datetime.utcnow(),
                'open_metadata': [metadata],
                'clicks': [],
                'created_at': datetime.utcnow()
            })

        # Update activity
        await db.activities.update_one(
            {'_id': ObjectId(activity_id)},
            {'$set': {'email_opened': True, 'email_opened_at': datetime.utcnow()}}
        )

    async def log_click_event(
        self,
        activity_id: str,
        url: str,
        request: Request
    ):
        """
        Loga evento de click em link
        """
        click_data = {
            'url': url,
            'clicked_at': datetime.utcnow(),
            'ip_address': request.client.host,
            'user_agent': request.headers.get('user-agent')
        }

        # Add click event
        await db.email_tracking_events.update_one(
            {'activity_id': ObjectId(activity_id)},
            {
                '$push': {'clicks': click_data},
                '$set': {'last_clicked_at': datetime.utcnow()}
            },
            upsert=True
        )

        # Update activity
        await db.activities.update_one(
            {'_id': ObjectId(activity_id)},
            {'$set': {'email_clicked': True, 'email_clicked_at': datetime.utcnow()}}
        )

    async def calculate_engagement_score(self, contact_id: str) -> int:
        """
        Calcula engagement score (0-100) baseado em interações
        """
        # Get all email activities for contact
        activities = await db.activities.find({
            'entity_type': 'contact',
            'entity_id': ObjectId(contact_id),
            'type': 'email'
        }).to_list(length=None)

        if not activities:
            return 0

        total_emails = len(activities)
        opened = sum(1 for a in activities if a.get('email_opened'))
        clicked = sum(1 for a in activities if a.get('email_clicked'))

        # Calculate score
        # 50% weight on opens, 50% on clicks
        open_rate = (opened / total_emails) * 50 if total_emails > 0 else 0
        click_rate = (clicked / total_emails) * 50 if total_emails > 0 else 0

        score = int(open_rate + click_rate)

        return min(100, score)
```

---

### 2. API Endpoints

```python
# src/api/routes/tracking.py

from fastapi import APIRouter, Request, Response
from fastapi.responses import RedirectResponse, StreamingResponse
from src.services.email_tracking_service import EmailTrackingService
import io

router = APIRouter()

# 1x1 transparent pixel
TRACKING_PIXEL = base64.b64decode(
    b'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFhAJ/wlseKgAAAABJRU5ErkJggg=='
)

@router.get("/tracking/pixel/{tracking_id}.png")
async def tracking_pixel(tracking_id: str, request: Request):
    """
    Tracking pixel endpoint (1x1 transparent PNG)
    """
    try:
        # Decode activity_id
        activity_id = base64.urlsafe_b64decode(tracking_id.encode()).decode()

        # Log open event (async, don't wait)
        tracking_service = EmailTrackingService()
        await tracking_service.log_open_event(activity_id, request)

    except Exception as e:
        # Silently fail (don't break email rendering)
        print(f"Tracking pixel error: {e}")

    # Return 1x1 transparent PNG
    return StreamingResponse(
        io.BytesIO(TRACKING_PIXEL),
        media_type="image/png",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )

@router.get("/tracking/click/{link_id}")
async def tracking_click(link_id: str, request: Request):
    """
    Link tracking endpoint (redirect to actual URL)
    """
    # Get original URL
    link_data = await db.tracking_links.find_one({'_id': link_id})

    if not link_data:
        return {"error": "Link not found"}

    # Log click event
    tracking_service = EmailTrackingService()
    await tracking_service.log_click_event(
        link_data['activity_id'],
        link_data['url'],
        request
    )

    # Redirect to original URL
    return RedirectResponse(url=link_data['url'], status_code=302)

@router.get("/tracking/events/{activity_id}")
async def get_tracking_events(activity_id: str):
    """
    Retorna eventos de tracking para um email
    """
    events = await db.email_tracking_events.find_one({
        'activity_id': ObjectId(activity_id)
    })

    if not events:
        return {
            'opened': False,
            'open_count': 0,
            'clicks': []
        }

    return {
        'opened': True,
        'open_count': events.get('open_count', 0),
        'first_opened_at': events.get('first_opened_at'),
        'last_opened_at': events.get('last_opened_at'),
        'clicks': events.get('clicks', []),
        'click_count': len(events.get('clicks', []))
    }

@router.get("/tracking/engagement/{contact_id}")
async def get_engagement_score(contact_id: str):
    """
    Retorna engagement score de um contato
    """
    tracking_service = EmailTrackingService()
    score = await tracking_service.calculate_engagement_score(contact_id)

    return {
        'contact_id': contact_id,
        'engagement_score': score
    }
```

---

## 🎨 Frontend - Tracking Indicators

```typescript
// src/app/features/email/components/email-tracking-indicator/email-tracking-indicator.component.ts

import { Component, Input, OnInit } from '@angular/core';
import { interval } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-email-tracking-indicator',
  template: `
    <div class="tracking-indicator" *ngIf="tracking">
      <!-- Opened Status -->
      <div class="status-badge" [class.opened]="tracking.opened">
        <mat-icon>{{ tracking.opened ? 'mark_email_read' : 'mark_email_unread' }}</mat-icon>
        <span *ngIf="tracking.opened">
          Opened {{ tracking.open_count }}x
        </span>
        <span *ngIf="!tracking.opened">
          Not opened yet
        </span>
      </div>

      <!-- First/Last Opened -->
      <div class="timestamps" *ngIf="tracking.opened">
        <small>
          First: {{ tracking.first_opened_at | date:'short' }}
        </small>
        <small *ngIf="tracking.open_count > 1">
          Last: {{ tracking.last_opened_at | date:'short' }}
        </small>
      </div>

      <!-- Clicks -->
      <div class="clicks" *ngIf="tracking.clicks?.length > 0">
        <mat-icon>link</mat-icon>
        <span>{{ tracking.clicks.length }} click(s)</span>

        <!-- Click Details (expandable) -->
        <div class="click-list" *ngIf="showClickDetails">
          <div *ngFor="let click of tracking.clicks" class="click-item">
            <a [href]="click.url" target="_blank">{{ click.url }}</a>
            <small>{{ click.clicked_at | date:'short' }}</small>
          </div>
        </div>

        <button
          mat-icon-button
          (click)="showClickDetails = !showClickDetails">
          <mat-icon>{{ showClickDetails ? 'expand_less' : 'expand_more' }}</mat-icon>
        </button>
      </div>

      <!-- Engagement Score -->
      <div class="engagement-score">
        <mat-progress-bar
          mode="determinate"
          [value]="engagementScore"
          [color]="getScoreColor(engagementScore)">
        </mat-progress-bar>
        <span>Engagement: {{ engagementScore }}%</span>
      </div>
    </div>
  `,
  styles: [`
    .tracking-indicator {
      padding: 12px;
      background: #f5f5f5;
      border-radius: 4px;

      .status-badge {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px;
        border-radius: 4px;

        &.opened {
          background: rgba(76, 175, 80, 0.1);
          color: #4CAF50;
        }
      }

      .engagement-score {
        margin-top: 12px;

        mat-progress-bar {
          margin-bottom: 4px;
        }

        span {
          font-size: 12px;
          color: rgba(0, 0, 0, 0.6);
        }
      }
    }
  `]
})
export class EmailTrackingIndicatorComponent implements OnInit {
  @Input() activityId!: string;
  @Input() contactId!: string;

  tracking: any = null;
  engagementScore: number = 0;
  showClickDetails: boolean = false;

  constructor(private trackingService: TrackingService) {}

  ngOnInit(): void {
    this.loadTracking();
    this.loadEngagementScore();

    // Poll for updates every 30 seconds (if not opened yet)
    interval(30000).pipe(
      switchMap(() => this.trackingService.getTrackingEvents(this.activityId))
    ).subscribe(data => {
      this.tracking = data;
    });
  }

  loadTracking(): void {
    this.trackingService.getTrackingEvents(this.activityId).subscribe(
      data => {
        this.tracking = data;
      }
    );
  }

  loadEngagementScore(): void {
    if (!this.contactId) return;

    this.trackingService.getEngagementScore(this.contactId).subscribe(
      data => {
        this.engagementScore = data.engagement_score;
      }
    );
  }

  getScoreColor(score: number): string {
    if (score >= 70) return 'primary';
    if (score >= 40) return 'accent';
    return 'warn';
  }
}
```

---

## ✅ Critérios de Aceitação

- [ ] Tracking pixel funciona (log de opens)
- [ ] Link tracking funciona (log de clicks + redirect)
- [ ] Opens são contabilizados corretamente
- [ ] Clicks são contabilizados corretamente
- [ ] Engagement score é calculado (0-100)
- [ ] UI exibe status de opened/not opened
- [ ] UI exibe número de opens e clicks
- [ ] Polling automático (30s) para updates
- [ ] Metadata capturada (IP, user-agent, timestamp)
- [ ] Performance: tracking não atrasa envio de emails
- [ ] Privacy: dados anonimizados

---

## 🔗 Dependências

- ✅ Marco 023: Gmail Integration
- ✅ Marco 022: Activity Logging System
- ✅ Marco 025: Email Composer UI

---

**Status**: 🔵 Pronto para Implementação
**Estimativa**: 3 dias
