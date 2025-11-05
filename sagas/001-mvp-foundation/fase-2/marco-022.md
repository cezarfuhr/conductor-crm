# Marco 022: Activity Logging System
> Backend + Frontend - Sistema de log de atividades e timeline | 3 dias

**Responsável**: Backend Dev + Frontend Dev
**Revisor**: Tech Lead
**Status**: 🔵 Planejado

---

## 🎯 Objetivo

Implementar sistema completo de logging de atividades (calls, emails, meetings, notes, stage changes) com timeline component reusável para exibição em Leads, Deals, Contacts e Companies.

---

## 📋 Contexto

Atividades são o histórico de todas as interações e eventos relacionados a uma entidade (Lead, Deal, Contact, Company). Essencial para:
- Histórico completo de interações
- Visibilidade para todo o time
- AI context (futuro)

---

## 🗄️ MongoDB Schema

### Collection: activities

```javascript
{
  _id: ObjectId,

  // Type of Activity
  type: String,  // 'note', 'call', 'email', 'meeting', 'stage_change', 'status_change', 'field_update'

  // Related Entity (polymorphic)
  entity_type: String,  // 'lead', 'deal', 'contact', 'company'
  entity_id: ObjectId,

  // Activity Content
  title: String,  // Short description
  description: String,  // Full content/notes
  content: Map,  // Type-specific data (JSON)

  // Metadata
  created_at: Date,
  created_by: ObjectId,  // User who created
  created_by_name: String,  // Denormalized

  // Type-specific fields

  // For calls
  call_duration: Number,  // In seconds
  call_direction: String,  // 'inbound', 'outbound'
  call_outcome: String,  // 'answered', 'no_answer', 'voicemail'

  // For emails
  email_subject: String,
  email_direction: String,  // 'sent', 'received'
  email_thread_id: String,

  // For meetings
  meeting_start_time: Date,
  meeting_end_time: Date,
  meeting_attendees: [String],  // List of attendee names

  // For field updates
  field_name: String,
  old_value: String,
  new_value: String,

  // Attachments
  attachments: [{
    filename: String,
    url: String,
    size: Number
  }],

  // Soft Delete
  deleted_at: Date
}

// Indexes
db.activities.createIndex({ entity_type: 1, entity_id: 1, created_at: -1 })
db.activities.createIndex({ type: 1, created_at: -1 })
db.activities.createIndex({ created_by: 1, created_at: -1 })
```

---

## 📝 Pydantic Models

```python
# src/models/activity.py

from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime
from enum import Enum

class ActivityType(str, Enum):
    NOTE = "note"
    CALL = "call"
    EMAIL = "email"
    MEETING = "meeting"
    STAGE_CHANGE = "stage_change"
    STATUS_CHANGE = "status_change"
    FIELD_UPDATE = "field_update"

class EntityType(str, Enum):
    LEAD = "lead"
    DEAL = "deal"
    CONTACT = "contact"
    COMPANY = "company"

class Attachment(BaseModel):
    filename: str
    url: str
    size: int

class ActivityBase(BaseModel):
    type: ActivityType
    entity_type: EntityType
    entity_id: str
    title: str
    description: Optional[str] = None
    content: Dict = {}

class ActivityCreate(ActivityBase):
    # Type-specific optional fields
    call_duration: Optional[int] = None
    call_direction: Optional[str] = None
    call_outcome: Optional[str] = None

    email_subject: Optional[str] = None
    email_direction: Optional[str] = None

    meeting_start_time: Optional[datetime] = None
    meeting_end_time: Optional[datetime] = None

    field_name: Optional[str] = None
    old_value: Optional[str] = None
    new_value: Optional[str] = None

    attachments: List[Attachment] = []

class ActivityInDB(ActivityCreate):
    id: str
    created_at: datetime
    created_by: str
    created_by_name: str
```

---

## 🔌 API Endpoints

```python
# src/api/routes/activities.py

from fastapi import APIRouter, Depends, Query
from typing import List, Optional
from src.models.activity import ActivityCreate, ActivityInDB

router = APIRouter()

@router.post("/activities", response_model=ActivityInDB, status_code=201)
async def create_activity(
    activity: ActivityCreate,
    current_user: str = Depends(get_current_user)
):
    """
    Cria uma nova atividade
    """
    activity_dict = activity.dict()
    activity_dict.update({
        "created_at": datetime.utcnow(),
        "created_by": current_user,
        "created_by_name": get_user_name(current_user)  # Helper function
    })

    result = await db.activities.insert_one(activity_dict)

    created_activity = await db.activities.find_one({"_id": result.inserted_id})
    created_activity['id'] = str(created_activity.pop('_id'))

    return ActivityInDB(**created_activity)

@router.get("/activities", response_model=List[ActivityInDB])
async def list_activities(
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    type: Optional[str] = None,
    created_by: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: str = Depends(get_current_user)
):
    """
    Lista atividades com filtros
    """
    filter_query = {}

    if entity_type and entity_id:
        filter_query['entity_type'] = entity_type
        filter_query['entity_id'] = entity_id

    if type:
        filter_query['type'] = type

    if created_by:
        filter_query['created_by'] = created_by

    if start_date or end_date:
        filter_query['created_at'] = {}
        if start_date:
            filter_query['created_at']['$gte'] = start_date
        if end_date:
            filter_query['created_at']['$lte'] = end_date

    cursor = db.activities.find(filter_query).sort('created_at', -1).skip(skip).limit(limit)

    activities = []
    async for activity in cursor:
        activity['id'] = str(activity.pop('_id'))
        activities.append(ActivityInDB(**activity))

    return activities

@router.get("/activities/{activity_id}", response_model=ActivityInDB)
async def get_activity(
    activity_id: str,
    current_user: str = Depends(get_current_user)
):
    """
    Retorna uma atividade específica
    """
    activity = await db.activities.find_one({"_id": ObjectId(activity_id)})

    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")

    activity['id'] = str(activity.pop('_id'))
    return ActivityInDB(**activity)

@router.delete("/activities/{activity_id}")
async def delete_activity(
    activity_id: str,
    current_user: str = Depends(get_current_user)
):
    """
    Deleta uma atividade (soft delete)
    """
    result = await db.activities.update_one(
        {"_id": ObjectId(activity_id)},
        {"$set": {"deleted_at": datetime.utcnow()}}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Activity not found")

    return {"message": "Activity deleted successfully"}
```

---

## 🎨 Timeline Component (Frontend)

```typescript
// src/app/shared/components/activity-timeline/activity-timeline.component.ts

import { Component, Input, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { Activity } from '@app/models/activity.model';
import { ActivitiesService } from '@app/services/activities.service';

@Component({
  selector: 'app-activity-timeline',
  templateUrl: './activity-timeline.component.html',
  styleUrls: ['./activity-timeline.component.scss']
})
export class ActivityTimelineComponent implements OnInit {
  @Input() entityType!: string;  // 'lead', 'deal', 'contact', 'company'
  @Input() entityId!: string;
  @Input() activities?: Activity[];  // Optional: pass activities directly

  activities$!: Observable<Activity[]>;
  loading = false;

  // Filters
  filterType: string = 'all';

  constructor(private activitiesService: ActivitiesService) {}

  ngOnInit(): void {
    if (!this.activities) {
      this.loadActivities();
    }
  }

  loadActivities(): void {
    this.loading = true;
    this.activities$ = this.activitiesService.getActivities({
      entity_type: this.entityType,
      entity_id: this.entityId,
      type: this.filterType !== 'all' ? this.filterType : undefined
    });
    this.loading = false;
  }

  getActivityIcon(type: string): string {
    const icons = {
      'note': 'note',
      'call': 'phone',
      'email': 'email',
      'meeting': 'event',
      'stage_change': 'trending_up',
      'status_change': 'track_changes',
      'field_update': 'edit'
    };
    return icons[type] || 'info';
  }

  getActivityColor(type: string): string {
    const colors = {
      'note': '#2196F3',
      'call': '#4CAF50',
      'email': '#FF9800',
      'meeting': '#9C27B0',
      'stage_change': '#00BCD4',
      'status_change': '#FFC107',
      'field_update': '#607D8B'
    };
    return colors[type] || '#9E9E9E';
  }

  formatDate(date: string): string {
    const activityDate = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - activityDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins} minutes ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hours ago`;
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return activityDate.toLocaleDateString();
    }
  }
}
```

### Template

```html
<!-- activity-timeline.component.html -->

<div class="activity-timeline">

  <!-- Filters -->
  <div class="timeline-filters">
    <mat-chip-list>
      <mat-chip
        [selected]="filterType === 'all'"
        (click)="filterType = 'all'; loadActivities()">
        All
      </mat-chip>
      <mat-chip
        [selected]="filterType === 'note'"
        (click)="filterType = 'note'; loadActivities()">
        <mat-icon>note</mat-icon>
        Notes
      </mat-chip>
      <mat-chip
        [selected]="filterType === 'call'"
        (click)="filterType = 'call'; loadActivities()">
        <mat-icon>phone</mat-icon>
        Calls
      </mat-chip>
      <mat-chip
        [selected]="filterType === 'email'"
        (click)="filterType = 'email'; loadActivities()">
        <mat-icon>email</mat-icon>
        Emails
      </mat-chip>
    </mat-chip-list>
  </div>

  <!-- Timeline -->
  <div class="timeline-entries">
    <div
      class="timeline-entry"
      *ngFor="let activity of (activities$ | async)"
      [class]="'type-' + activity.type">

      <!-- Icon -->
      <div class="entry-icon" [style.background-color]="getActivityColor(activity.type)">
        <mat-icon>{{ getActivityIcon(activity.type) }}</mat-icon>
      </div>

      <!-- Content -->
      <div class="entry-content">
        <div class="entry-header">
          <h4>{{ activity.title }}</h4>
          <span class="entry-date">{{ formatDate(activity.created_at) }}</span>
        </div>

        <div class="entry-body">
          <p *ngIf="activity.description">{{ activity.description }}</p>

          <!-- Type-specific content -->

          <!-- Call -->
          <div class="call-details" *ngIf="activity.type === 'call'">
            <mat-chip-list>
              <mat-chip>{{ activity.call_direction }}</mat-chip>
              <mat-chip>{{ activity.call_outcome }}</mat-chip>
            </mat-chip-list>
            <span class="duration">Duration: {{ activity.call_duration }}s</span>
          </div>

          <!-- Email -->
          <div class="email-details" *ngIf="activity.type === 'email'">
            <p class="subject"><strong>Subject:</strong> {{ activity.email_subject }}</p>
            <mat-chip>{{ activity.email_direction }}</mat-chip>
          </div>

          <!-- Field Update -->
          <div class="field-update" *ngIf="activity.type === 'field_update'">
            <span class="field-name">{{ activity.field_name }}:</span>
            <span class="old-value">{{ activity.old_value }}</span>
            <mat-icon>arrow_forward</mat-icon>
            <span class="new-value">{{ activity.new_value }}</span>
          </div>

          <!-- Attachments -->
          <div class="attachments" *ngIf="activity.attachments?.length">
            <mat-chip-list>
              <mat-chip *ngFor="let file of activity.attachments">
                <mat-icon>attach_file</mat-icon>
                {{ file.filename }}
              </mat-chip>
            </mat-chip-list>
          </div>
        </div>

        <div class="entry-footer">
          <span class="author">by {{ activity.created_by_name }}</span>
        </div>
      </div>

    </div>
  </div>

  <!-- Loading -->
  <div class="loading" *ngIf="loading">
    <mat-spinner diameter="30"></mat-spinner>
  </div>

</div>
```

---

## ✅ Critérios de Aceitação

- [ ] Activity model implementado
- [ ] CRUD completo funciona
- [ ] Activities podem ser filtradas por entity
- [ ] Timeline component é reusável
- [ ] Suporta 7 tipos de atividades
- [ ] Ícones e cores por tipo
- [ ] Formatação de datas relativas ("2 hours ago")
- [ ] Filtros por tipo funcionam
- [ ] Loading state
- [ ] Empty state (sem atividades)
- [ ] Component usado em Lead/Deal/Contact/Company detail pages
- [ ] Attachments funcionam (futuro: upload)
- [ ] Soft delete funciona

---

## 🔗 Dependências

- ✅ Marco 005: Database & Backend Setup
- ✅ Marco 009, 017, 020: Lead, Deal, Contact, Company models

---

**Status**: 🔵 Pronto para Implementação
**Estimativa**: 3 dias
