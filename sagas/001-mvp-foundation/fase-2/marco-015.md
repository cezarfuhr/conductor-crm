# Marco 015: Lead Detail Page
> Frontend - Página completa de detalhes do lead | 4 dias

**Responsável**: Frontend Dev
**Revisor**: Designer
**Status**: 🔵 Planejado

---

## 🎯 Objetivo

Implementar página completa de detalhes do lead com timeline de atividades, informações enriquecidas, edição inline, e todas as ações disponíveis em um único lugar.

---

## 📋 Contexto

A página de detalhes é o **hub central** para trabalhar com um lead. Deve incluir:
- Informações básicas (editáveis inline)
- Qualificação AI (card reutilizável)
- Dados enriquecidos (Clearbit)
- Timeline de atividades
- Ações rápidas (call, email, convert)
- Notas e anexos

---

## 🏗️ Estrutura da Página

```
┌─────────────────────────────────────────────────┐
│  Header: Name, Company, Status                  │
│  [Call] [Email] [Convert to Deal] [Delete]      │
├─────────────────────────────────────────────────┤
│  Qualification Card (Marco 014)                  │
├────────────────┬────────────────────────────────┤
│                │                                 │
│   Left Panel   │     Right Panel (Timeline)     │
│                │                                 │
│  - Basic Info  │  - Activities                  │
│  - Enriched    │  - Notes                       │
│  - Contact     │  - Emails                      │
│                │  - Calls                        │
│                │                                 │
└────────────────┴────────────────────────────────┘
```

---

## 💻 Component

```typescript
// src/app/features/leads/pages/lead-detail/lead-detail.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';

import { Lead } from '@app/models/lead.model';
import { Activity } from '@app/models/activity.model';
import * as LeadsActions from '@app/store/leads/leads.actions';
import * as LeadsSelectors from '@app/store/leads/leads.selectors';

@Component({
  selector: 'app-lead-detail',
  templateUrl: './lead-detail.component.html',
  styleUrls: ['./lead-detail.component.scss']
})
export class LeadDetailComponent implements OnInit, OnDestroy {
  lead$!: Observable<Lead | null>;
  activities$!: Observable<Activity[]>;
  loading$!: Observable<boolean>;

  private destroy$ = new Subject<void>();

  // Edit mode
  editMode: { [key: string]: boolean } = {};
  editValues: { [key: string]: any } = {};

  // Tabs
  selectedTab = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private store: Store
  ) {}

  ngOnInit(): void {
    // Get lead ID from route
    const leadId = this.route.snapshot.paramMap.get('id');
    if (!leadId) {
      this.router.navigate(['/leads']);
      return;
    }

    // Load lead
    this.store.dispatch(LeadsActions.loadLead({ id: leadId }));

    // Select lead from store
    this.lead$ = this.store.select(LeadsSelectors.selectCurrentLead).pipe(
      filter(lead => lead !== null),
      takeUntil(this.destroy$)
    );

    // Select activities
    this.activities$ = this.store.select(LeadsSelectors.selectCurrentLeadActivities);

    this.loading$ = this.store.select(LeadsSelectors.selectLoading);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Quick Actions
  onCall(lead: Lead): void {
    // Open call dialog or navigate to call page
    console.log('Call:', lead.phone);
  }

  onEmail(lead: Lead): void {
    // Open email composer
    this.router.navigate(['/email/compose'], {
      queryParams: { to: lead.email, leadId: lead.id }
    });
  }

  onConvertToDeal(lead: Lead): void {
    // Convert lead to deal
    this.store.dispatch(LeadsActions.convertToDeal({ leadId: lead.id }));
  }

  onDelete(lead: Lead): void {
    if (confirm(`Delete lead ${lead.name}?`)) {
      this.store.dispatch(LeadsActions.deleteLead({ id: lead.id }));
      this.router.navigate(['/leads']);
    }
  }

  // Inline Edit
  enableEdit(field: string, currentValue: any): void {
    this.editMode[field] = true;
    this.editValues[field] = currentValue;
  }

  saveEdit(lead: Lead, field: string): void {
    const newValue = this.editValues[field];

    this.store.dispatch(LeadsActions.updateLead({
      id: lead.id,
      changes: { [field]: newValue }
    }));

    this.editMode[field] = false;
  }

  cancelEdit(field: string): void {
    this.editMode[field] = false;
    delete this.editValues[field];
  }

  // Qualification
  onRequalify(leadId: string): void {
    this.store.dispatch(LeadsActions.requalifyLead({ leadId }));
  }

  onOverride(event: { leadId: string; newClassification: string }): void {
    this.store.dispatch(LeadsActions.overrideQualification({
      leadId: event.leadId,
      classification: event.newClassification
    }));
  }

  // Enrichment
  onEnrich(leadId: string): void {
    this.store.dispatch(LeadsActions.enrichLead({ leadId }));
  }

  // Activities
  onAddNote(lead: Lead, note: string): void {
    // Dispatch add note action
    this.store.dispatch(LeadsActions.addNote({
      leadId: lead.id,
      note
    }));
  }

  onAddActivity(lead: Lead, activity: Partial<Activity>): void {
    // Dispatch add activity action
    this.store.dispatch(LeadsActions.addActivity({
      leadId: lead.id,
      activity
    }));
  }
}
```

---

## 📄 Template

```html
<!-- lead-detail.component.html -->

<div class="lead-detail-page" *ngIf="lead$ | async as lead; else loading">

  <!-- Header -->
  <div class="page-header">
    <div class="header-left">
      <button mat-icon-button [routerLink]="['/leads']">
        <mat-icon>arrow_back</mat-icon>
      </button>

      <div class="lead-title">
        <h1>{{ lead.name }}</h1>
        <p class="company-name" *ngIf="lead.company">
          <mat-icon>business</mat-icon>
          {{ lead.company }}
        </p>
      </div>

      <!-- Status Chip -->
      <mat-chip-list>
        <mat-chip [color]="getStatusColor(lead.status)" selected>
          {{ lead.status | titlecase }}
        </mat-chip>
      </mat-chip-list>
    </div>

    <!-- Quick Actions -->
    <div class="header-actions">
      <button
        mat-raised-button
        color="primary"
        (click)="onCall(lead)"
        [disabled]="!lead.phone">
        <mat-icon>call</mat-icon>
        Call
      </button>

      <button
        mat-raised-button
        color="primary"
        (click)="onEmail(lead)">
        <mat-icon>email</mat-icon>
        Email
      </button>

      <button
        mat-raised-button
        color="accent"
        (click)="onConvertToDeal(lead)"
        *ngIf="lead.classification === 'hot'">
        <mat-icon>trending_up</mat-icon>
        Convert to Deal
      </button>

      <button
        mat-icon-button
        [matMenuTriggerFor]="moreMenu">
        <mat-icon>more_vert</mat-icon>
      </button>

      <mat-menu #moreMenu="matMenu">
        <button mat-menu-item (click)="onEnrich(lead.id)">
          <mat-icon>refresh</mat-icon>
          Re-enrich Data
        </button>
        <button mat-menu-item (click)="onDelete(lead)">
          <mat-icon color="warn">delete</mat-icon>
          Delete Lead
        </button>
      </mat-menu>
    </div>
  </div>

  <!-- Qualification Card -->
  <app-lead-qualification-card
    [lead]="lead"
    (requalify)="onRequalify($event)"
    (override)="onOverride($event)">
  </app-lead-qualification-card>

  <!-- Main Content: 2-Column Layout -->
  <div class="main-content">

    <!-- Left Panel: Information -->
    <div class="left-panel">

      <!-- Basic Information -->
      <mat-card>
        <mat-card-header>
          <mat-card-title>
            <mat-icon>person</mat-icon>
            Basic Information
          </mat-card-title>
        </mat-card-header>

        <mat-card-content>
          <div class="info-grid">

            <!-- Email -->
            <div class="info-item">
              <label>Email</label>
              <div class="info-value">
                <a [href]="'mailto:' + lead.email">{{ lead.email }}</a>
                <mat-icon
                  class="verified-icon"
                  *ngIf="lead.enriched_data?.email_verification?.status === 'valid'"
                  matTooltip="Email verified">
                  verified
                </mat-icon>
              </div>
            </div>

            <!-- Phone -->
            <div class="info-item">
              <label>Phone</label>
              <div class="info-value editable">
                <span *ngIf="!editMode['phone']">
                  {{ lead.phone || 'Not provided' }}
                  <mat-icon (click)="enableEdit('phone', lead.phone)">edit</mat-icon>
                </span>
                <div *ngIf="editMode['phone']" class="edit-inline">
                  <mat-form-field appearance="outline">
                    <input matInput [(ngModel)]="editValues['phone']" placeholder="+55 11 99999-9999">
                  </mat-form-field>
                  <button mat-icon-button (click)="saveEdit(lead, 'phone')">
                    <mat-icon>check</mat-icon>
                  </button>
                  <button mat-icon-button (click)="cancelEdit('phone')">
                    <mat-icon>close</mat-icon>
                  </button>
                </div>
              </div>
            </div>

            <!-- Job Title -->
            <div class="info-item">
              <label>Job Title</label>
              <div class="info-value editable">
                <span *ngIf="!editMode['job_title']">
                  {{ lead.job_title || 'Not provided' }}
                  <mat-icon (click)="enableEdit('job_title', lead.job_title)">edit</mat-icon>
                </span>
                <div *ngIf="editMode['job_title']" class="edit-inline">
                  <mat-form-field appearance="outline">
                    <input matInput [(ngModel)]="editValues['job_title']" placeholder="CTO">
                  </mat-form-field>
                  <button mat-icon-button (click)="saveEdit(lead, 'job_title')">
                    <mat-icon>check</mat-icon>
                  </button>
                  <button mat-icon-button (click)="cancelEdit('job_title')">
                    <mat-icon>close</mat-icon>
                  </button>
                </div>
              </div>
            </div>

            <!-- Source -->
            <div class="info-item">
              <label>Source</label>
              <div class="info-value">
                <mat-chip-list>
                  <mat-chip>{{ lead.source | titlecase }}</mat-chip>
                </mat-chip-list>
              </div>
            </div>

            <!-- Created At -->
            <div class="info-item">
              <label>Created</label>
              <div class="info-value">
                {{ lead.created_at | date:'medium' }}
              </div>
            </div>

          </div>
        </mat-card-content>
      </mat-card>

      <!-- Enriched Data -->
      <mat-card *ngIf="lead.enriched_data?.company_data">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>business</mat-icon>
            Company Information
          </mat-card-title>
          <div class="enrichment-badge">
            <mat-icon matTooltip="Data from Clearbit">auto_awesome</mat-icon>
          </div>
        </mat-card-header>

        <mat-card-content>
          <div class="company-header" *ngIf="lead.enriched_data.company_data.logo_url">
            <img [src]="lead.enriched_data.company_data.logo_url" [alt]="lead.company">
          </div>

          <div class="info-grid">
            <div class="info-item" *ngIf="lead.enriched_data.company_data.description">
              <label>Description</label>
              <div class="info-value">
                {{ lead.enriched_data.company_data.description }}
              </div>
            </div>

            <div class="info-item" *ngIf="lead.enriched_data.company_data.employee_count">
              <label>Employees</label>
              <div class="info-value">
                {{ lead.enriched_data.company_data.employee_range || lead.enriched_data.company_data.employee_count }}
              </div>
            </div>

            <div class="info-item" *ngIf="lead.enriched_data.company_data.industry">
              <label>Industry</label>
              <div class="info-value">
                {{ lead.enriched_data.company_data.industry }}
              </div>
            </div>

            <div class="info-item" *ngIf="lead.enriched_data.company_data.location">
              <label>Location</label>
              <div class="info-value">
                <mat-icon>location_on</mat-icon>
                {{ lead.enriched_data.company_data.location }}
              </div>
            </div>

            <div class="info-item" *ngIf="lead.enriched_data.company_data.linkedin_handle">
              <label>LinkedIn</label>
              <div class="info-value">
                <a [href]="'https://linkedin.com/' + lead.enriched_data.company_data.linkedin_handle" target="_blank">
                  View Profile
                  <mat-icon>open_in_new</mat-icon>
                </a>
              </div>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

    </div>

    <!-- Right Panel: Timeline & Activities -->
    <div class="right-panel">
      <mat-card>
        <mat-card-header>
          <mat-card-title>
            <mat-icon>timeline</mat-icon>
            Activity Timeline
          </mat-card-title>
        </mat-card-header>

        <mat-card-content>
          <!-- Add Note/Activity -->
          <div class="add-activity">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Add a note...</mat-label>
              <textarea
                matInput
                #noteInput
                rows="2"
                placeholder="What happened with this lead?">
              </textarea>
            </mat-form-field>
            <button
              mat-raised-button
              color="primary"
              (click)="onAddNote(lead, noteInput.value); noteInput.value = ''">
              <mat-icon>add</mat-icon>
              Add Note
            </button>
          </div>

          <mat-divider></mat-divider>

          <!-- Timeline Component (reusable) -->
          <app-activity-timeline
            [activities]="activities$ | async"
            [entityId]="lead.id"
            [entityType]="'lead'">
          </app-activity-timeline>

          <!-- Empty State -->
          <div class="empty-state" *ngIf="(activities$ | async)?.length === 0">
            <mat-icon>event_note</mat-icon>
            <p>No activities yet. Start by adding a note!</p>
          </div>
        </mat-card-content>
      </mat-card>
    </div>

  </div>

</div>

<!-- Loading State -->
<ng-template #loading>
  <div class="loading-container">
    <mat-spinner></mat-spinner>
    <p>Loading lead...</p>
  </div>
</ng-template>
```

---

## 🎨 Styles

```scss
// lead-detail.component.scss

.lead-detail-page {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;

  // Header
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;

    .header-left {
      display: flex;
      align-items: center;
      gap: 16px;

      .lead-title {
        h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 500;
        }

        .company-name {
          display: flex;
          align-items: center;
          gap: 4px;
          margin: 4px 0 0 0;
          color: rgba(0, 0, 0, 0.6);
          font-size: 14px;

          mat-icon {
            font-size: 16px;
            width: 16px;
            height: 16px;
          }
        }
      }
    }

    .header-actions {
      display: flex;
      gap: 8px;
    }
  }

  // Main Content: 2-Column Layout
  .main-content {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;

    @media (max-width: 1024px) {
      grid-template-columns: 1fr;
    }

    .left-panel,
    .right-panel {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
  }

  // Info Grid
  .info-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 4px;

      label {
        font-size: 12px;
        font-weight: 500;
        color: rgba(0, 0, 0, 0.6);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .info-value {
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 8px;

        &.editable {
          mat-icon {
            font-size: 18px;
            width: 18px;
            height: 18px;
            cursor: pointer;
            opacity: 0.5;
            transition: opacity 0.2s;

            &:hover {
              opacity: 1;
            }
          }
        }

        .edit-inline {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;

          mat-form-field {
            flex: 1;
          }
        }

        .verified-icon {
          color: #4caf50;
          font-size: 16px;
          width: 16px;
          height: 16px;
        }

        a {
          color: #2196f3;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 4px;

          &:hover {
            text-decoration: underline;
          }
        }
      }
    }
  }

  // Company Header
  .company-header {
    text-align: center;
    margin-bottom: 16px;

    img {
      max-width: 120px;
      max-height: 60px;
    }
  }

  .enrichment-badge {
    mat-icon {
      color: #2196f3;
      animation: pulse 2s infinite;
    }
  }

  // Activity Timeline
  .add-activity {
    margin-bottom: 16px;

    .full-width {
      width: 100%;
    }

    button {
      margin-top: 8px;
    }
  }

  .empty-state {
    text-align: center;
    padding: 40px 20px;
    color: rgba(0, 0, 0, 0.38);

    mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
    }
  }
}

// Loading
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 16px;
}

// Animations
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
```

---

## ✅ Critérios de Aceitação

- [ ] Página carrega lead corretamente
- [ ] Header com nome, empresa e status
- [ ] Quick actions funcionam (Call, Email, Convert)
- [ ] Qualification card é exibido
- [ ] Informações básicas são editáveis inline
- [ ] Dados enriquecidos são exibidos (se disponíveis)
- [ ] Timeline de atividades funciona
- [ ] Adicionar nota funciona
- [ ] Layout responsivo (2 colunas → 1 coluna em mobile)
- [ ] Loading state enquanto carrega
- [ ] Error handling (lead não encontrado)
- [ ] Navegação funciona (voltar para lista)

---

## 🔗 Dependências

- ✅ Marco 009: Lead Model & API
- ✅ Marco 012: LeadQualifier_Agent
- ✅ Marco 013: Auto-Enrichment
- ✅ Marco 014: Qualification UI
- ⬜ Marco 022: Activity Logging System (timeline component)

---

**Status**: 🔵 Pronto para Implementação
**Estimativa**: 4 dias
