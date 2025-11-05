# Marco 019: Deal Detail Page
> Frontend - Página completa de detalhes do deal | 4 dias

**Responsável**: Frontend Dev
**Revisor**: Designer
**Status**: 🔵 Planejado

---

## 🎯 Objetivo

Implementar página completa de detalhes do deal com timeline, relacionamentos (contacts/company), edição inline, ações (win/lose), e integração com AI predictions.

---

## 📋 Estrutura da Página

Similar à Lead Detail Page (Marco 015), mas focada em Deal:

```
┌─────────────────────────────────────────────────┐
│  Header: Title, Value, Stage                    │
│  [Move Stage] [Mark Won] [Mark Lost] [Delete]   │
├─────────────────────────────────────────────────┤
│  AI Prediction Card (DealPredictor insights)     │
├────────────────┬────────────────────────────────┤
│                │                                 │
│   Left Panel   │     Right Panel (Timeline)     │
│                │                                 │
│  - Deal Info   │  - Activities                  │
│  - Probability │  - Notes                       │
│  - Company     │  - Emails                      │
│  - Contacts    │  - Calls                        │
│  - Custom Flds │  - Stage Changes               │
│                │                                 │
└────────────────┴────────────────────────────────┘
```

---

## 💻 Key Sections

### 1. Deal Information Panel

- **Editable Fields**: title, value, expected_close_date, probability
- **Read-only**: created_at, updated_at, stage_history
- **Tags**: editable tag list
- **Custom Fields**: dynamic key-value pairs

### 2. AI Prediction Card

Show DealPredictor_Agent insights:
- Win probability (AI-calculated)
- Predicted close date
- Health score (0-100)
- Risk factors (list)
- Recommended actions (prioritized)

Component reusable from Phase 3 when agent is built, but placeholder in Phase 2.

### 3. Related Contacts & Company

- Company card with logo and details
- List of related contacts with roles
- Add/remove contacts
- Click to navigate to contact/company detail

### 4. Stage Progression

Visual timeline of stage progression:
```
Qualification → Proposal → Negotiation → Closed
    (2d)         (5d)         (...)
```

Show:
- Days in each stage
- Stage entry/exit dates
- Bottleneck identification

### 5. Actions

- **Move Stage**: Dropdown or buttons
- **Mark as Won**: Confirm dialog, celebrate 🎉
- **Mark as Lost**: Required lost_reason field
- **Delete**: Soft delete with confirmation

---

## 🎨 Template Structure (Simplified)

```html
<div class="deal-detail-page" *ngIf="deal$ | async as deal">

  <!-- Header -->
  <div class="page-header">
    <div class="deal-title">
      <h1 [contentEditable]="editMode.title" (blur)="saveField('title', $event)">
        {{ deal.title }}
      </h1>
      <mat-chip-list>
        <mat-chip [color]="getStageColor(deal.stage)" selected>
          {{ deal.stage | titlecase }}
        </mat-chip>
      </mat-chip-list>
    </div>

    <div class="deal-value">
      <span class="label">Deal Value</span>
      <h2>{{ formatValue(deal.value) }}</h2>
    </div>

    <!-- Actions -->
    <div class="actions">
      <button mat-raised-button [matMenuTriggerFor]="stageMenu">
        Move Stage
      </button>
      <mat-menu #stageMenu="matMenu">
        <button mat-menu-item *ngFor="let stage of availableStages"
                (click)="moveToStage(deal.id, stage)">
          {{ stage | titlecase }}
        </button>
      </mat-menu>

      <button mat-raised-button color="accent" (click)="markAsWon(deal.id)">
        <mat-icon>emoji_events</mat-icon>
        Mark as Won
      </button>

      <button mat-stroked-button (click)="markAsLost(deal.id)">
        Mark as Lost
      </button>
    </div>
  </div>

  <!-- AI Prediction Card (Placeholder for Phase 3) -->
  <mat-card class="ai-prediction-card" *ngIf="deal.ai_health_score">
    <mat-card-header>
      <mat-card-title>
        <mat-icon>psychology</mat-icon>
        AI Insights
      </mat-card-title>
    </mat-card-header>
    <mat-card-content>
      <div class="prediction-metrics">
        <div class="metric">
          <span class="label">Win Probability</span>
          <span class="value">{{ deal.ai_probability }}%</span>
        </div>
        <div class="metric">
          <span class="label">Health Score</span>
          <span class="value">{{ deal.ai_health_score }}/100</span>
        </div>
      </div>
      <div class="risk-factors" *ngIf="deal.risk_factors?.length">
        <h4>Risk Factors</h4>
        <ul>
          <li *ngFor="let risk of deal.risk_factors">{{ risk }}</li>
        </ul>
      </div>
    </mat-card-content>
  </mat-card>

  <!-- Main Content: 2-Column Layout -->
  <div class="main-content">

    <!-- Left Panel -->
    <div class="left-panel">

      <!-- Deal Info -->
      <mat-card>
        <mat-card-header>
          <mat-card-title>Deal Information</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="info-grid">
            <!-- Probability -->
            <div class="info-item">
              <label>Probability</label>
              <mat-slider
                min="0"
                max="100"
                step="5"
                [value]="deal.probability"
                (change)="updateProbability(deal.id, $event.value)">
              </mat-slider>
              <span>{{ deal.probability }}%</span>
            </div>

            <!-- Expected Close Date -->
            <div class="info-item">
              <label>Expected Close Date</label>
              <mat-form-field *ngIf="editMode.close_date; else showDate">
                <input matInput
                       [matDatepicker]="picker"
                       [(ngModel)]="editValues.close_date"
                       (dateChange)="saveField('expected_close_date', $event.value)">
                <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
                <mat-datepicker #picker></mat-datepicker>
              </mat-form-field>
              <ng-template #showDate>
                <span (click)="enableEdit('close_date')">
                  {{ deal.expected_close_date | date:'mediumDate' }}
                  <mat-icon>edit</mat-icon>
                </span>
              </ng-template>
            </div>

            <!-- Source -->
            <div class="info-item">
              <label>Source</label>
              <span>{{ deal.source | titlecase }}</span>
            </div>

            <!-- Owner -->
            <div class="info-item">
              <label>Owner</label>
              <span>{{ deal.owner_name }}</span>
            </div>

            <!-- Created -->
            <div class="info-item">
              <label>Created</label>
              <span>{{ deal.created_at | date:'medium' }}</span>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Company & Contacts -->
      <mat-card *ngIf="deal.company_id">
        <mat-card-header>
          <mat-card-title>Company & Contacts</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <!-- Company (future) -->
          <div class="company-info">
            <h4>{{ deal.company_name }}</h4>
            <button mat-button [routerLink]="['/companies', deal.company_id]">
              View Details
            </button>
          </div>

          <!-- Contacts List (future) -->
          <div class="contacts-list">
            <h4>Contacts ({{ deal.contact_ids?.length || 0 }})</h4>
            <!-- Will be implemented in Marco 021 -->
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Stage History -->
      <mat-card>
        <mat-card-header>
          <mat-card-title>Stage Progression</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="stage-timeline">
            <div class="stage-entry" *ngFor="let entry of deal.stage_history">
              <div class="stage-name">{{ entry.stage | titlecase }}</div>
              <div class="stage-duration" *ngIf="entry.duration_days">
                {{ entry.duration_days }} days
              </div>
              <div class="stage-dates">
                {{ entry.entered_at | date:'short' }}
                <span *ngIf="entry.exited_at"> → {{ entry.exited_at | date:'short' }}</span>
              </div>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

    </div>

    <!-- Right Panel: Timeline -->
    <div class="right-panel">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Activity Timeline</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <!-- Reuse Activity Timeline Component from Marco 022 -->
          <app-activity-timeline
            [activities]="activities$ | async"
            [entityId]="deal.id"
            [entityType]="'deal'">
          </app-activity-timeline>
        </mat-card-content>
      </mat-card>
    </div>

  </div>

</div>
```

---

## 🎨 Key Features

### Inline Editing
- Click-to-edit for title, value, dates
- Auto-save on blur
- Optimistic UI updates

### Stage Movement
- Dropdown menu with available stages
- Visual feedback
- Update stage_history automatically

### Win/Lose Actions
- **Win**: Show celebration modal, mark as closed_won, update actual_close_date
- **Lose**: Show dialog for lost_reason (required), mark as closed_lost

### Stage Timeline Visualization
- Visual progress bar
- Days spent in each stage
- Identify bottlenecks (>7 days in same stage)

---

## ✅ Critérios de Aceitação

- [ ] Página carrega deal corretamente
- [ ] Header com title, value, stage
- [ ] Edição inline funciona (title, value, dates)
- [ ] Probability slider funciona
- [ ] Move stage funciona (dropdown)
- [ ] Mark as Won/Lost funciona
- [ ] AI insights são exibidos (se disponíveis)
- [ ] Stage history é exibido
- [ ] Company/contacts são exibidos
- [ ] Timeline de atividades funciona
- [ ] Layout responsivo (2col → 1col mobile)
- [ ] Loading e error states

---

## 🔗 Dependências

- ✅ Marco 017: Deal Model & API
- ⬜ Marco 022: Activity Timeline Component

---

**Status**: 🔵 Pronto para Implementação
**Estimativa**: 4 dias
