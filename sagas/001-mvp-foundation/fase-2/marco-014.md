# Marco 014: Lead Qualification UI
> Frontend - Interface de visualização de qualificação | 3 dias

**Responsável**: Frontend Dev
**Revisor**: Designer
**Status**: 🔵 Planejado

---

## 🎯 Objetivo

Implementar componentes visuais que exibem a qualificação de leads (score, classificação, reasoning) de forma clara e acionável, tornando os insights da IA compreensíveis para o usuário.

---

## 📋 Contexto

A UI de qualificação deve:
- Mostrar score de forma visual (0-100)
- Classificação com cores distintivas (Hot/Warm/Cold)
- Explicar o "porquê" da qualificação
- Sugerir próximas ações
- Permitir override manual
- Ser reutilizável (card component)

**Integração**: Angular Material + NgRx

---

## 🎨 Componentes

### 1. Lead Qualification Card Component

```typescript
// src/app/features/leads/components/lead-qualification-card/lead-qualification-card.component.ts

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Lead } from '@app/models/lead.model';

@Component({
  selector: 'app-lead-qualification-card',
  templateUrl: './lead-qualification-card.component.html',
  styleUrls: ['./lead-qualification-card.component.scss']
})
export class LeadQualificationCardComponent {
  @Input() lead!: Lead;
  @Input() compact: boolean = false;  // Versão compacta para list
  @Output() requalify = new EventEmitter<string>();
  @Output() override = new EventEmitter<{ leadId: string, newClassification: string }>();

  showReasons = false;
  showActions = false;

  get qualificationColor(): string {
    switch (this.lead.classification) {
      case 'hot': return 'warn';      // Red (urgent)
      case 'warm': return 'accent';   // Yellow/Orange
      case 'cold': return 'primary';  // Blue
      default: return 'primary';
    }
  }

  get classificationLabel(): string {
    switch (this.lead.classification) {
      case 'hot': return 'Hot Lead 🔥';
      case 'warm': return 'Warm Lead ☀️';
      case 'cold': return 'Cold Lead ❄️';
      default: return 'Not Qualified';
    }
  }

  get scorePercentage(): number {
    return this.lead.qualification_score || 0;
  }

  get confidenceIcon(): string {
    const confidence = this.lead.qualification_metadata?.confidence_level || 0;
    if (confidence > 0.8) return 'verified';
    if (confidence > 0.5) return 'check_circle';
    return 'help_outline';
  }

  toggleReasons(): void {
    this.showReasons = !this.showReasons;
  }

  toggleActions(): void {
    this.showActions = !this.showActions;
  }

  onRequalify(): void {
    this.requalify.emit(this.lead.id);
  }

  onOverride(classification: string): void {
    this.override.emit({ leadId: this.lead.id, newClassification: classification });
  }

  executeAction(action: any): void {
    // Implementar ações (navegar, criar task, etc)
    console.log('Execute action:', action);
  }
}
```

---

### 2. Template

```html
<!-- lead-qualification-card.component.html -->

<mat-card class="qualification-card" [class.compact]="compact">

  <!-- Header: Score + Classification -->
  <mat-card-header>
    <div class="header-content">
      <!-- Score Circular Progress -->
      <div class="score-circle">
        <mat-progress-spinner
          [mode]="'determinate'"
          [value]="scorePercentage"
          [diameter]="compact ? 60 : 80"
          [color]="qualificationColor">
        </mat-progress-spinner>
        <div class="score-value">
          <span class="score-number">{{ lead.qualification_score }}</span>
          <span class="score-total">/100</span>
        </div>
      </div>

      <!-- Classification Badge -->
      <div class="classification-info">
        <mat-chip-list>
          <mat-chip [color]="qualificationColor" selected>
            {{ classificationLabel }}
          </mat-chip>
        </mat-chip-list>

        <div class="confidence-indicator" *ngIf="!compact">
          <mat-icon [matTooltip]="'Confidence: ' + (lead.qualification_metadata?.confidence_level * 100).toFixed(0) + '%'">
            {{ confidenceIcon }}
          </mat-icon>
          <span class="confidence-text">
            {{ (lead.qualification_metadata?.confidence_level * 100).toFixed(0) }}% confidence
          </span>
        </div>

        <div class="qualification-date" *ngIf="!compact">
          <mat-icon>schedule</mat-icon>
          <span>Qualified {{ lead.qualification_metadata?.qualified_at | date:'short' }}</span>
        </div>
      </div>
    </div>
  </mat-card-header>

  <!-- Content: Reasons & Actions -->
  <mat-card-content *ngIf="!compact">

    <!-- Qualification Reasons -->
    <div class="reasons-section">
      <div class="section-header" (click)="toggleReasons()">
        <h4>
          <mat-icon>psychology</mat-icon>
          Why this qualification?
        </h4>
        <mat-icon>{{ showReasons ? 'expand_less' : 'expand_more' }}</mat-icon>
      </div>

      <div class="section-content" *ngIf="showReasons">
        <!-- Positive Signals -->
        <div class="signals positive" *ngIf="lead.positive_signals?.length">
          <h5>
            <mat-icon>check_circle</mat-icon>
            Positive Signals
          </h5>
          <ul>
            <li *ngFor="let signal of lead.positive_signals">
              <mat-icon>arrow_right</mat-icon>
              {{ signal }}
            </li>
          </ul>
        </div>

        <!-- Negative Signals -->
        <div class="signals negative" *ngIf="lead.negative_signals?.length">
          <h5>
            <mat-icon>warning</mat-icon>
            Concerns
          </h5>
          <ul>
            <li *ngFor="let signal of lead.negative_signals">
              <mat-icon>arrow_right</mat-icon>
              {{ signal }}
            </li>
          </ul>
        </div>

        <!-- Missing Data -->
        <div class="signals missing" *ngIf="lead.missing_data?.length">
          <h5>
            <mat-icon>info</mat-icon>
            Missing Information
          </h5>
          <ul>
            <li *ngFor="let data of lead.missing_data">
              <mat-icon>arrow_right</mat-icon>
              {{ data }}
            </li>
          </ul>
        </div>
      </div>
    </div>

    <mat-divider></mat-divider>

    <!-- Next Actions -->
    <div class="actions-section">
      <div class="section-header" (click)="toggleActions()">
        <h4>
          <mat-icon>bolt</mat-icon>
          Suggested Next Actions
        </h4>
        <mat-icon>{{ showActions ? 'expand_less' : 'expand_more' }}</mat-icon>
      </div>

      <div class="section-content" *ngIf="showActions">
        <div class="action-list">
          <div
            class="action-item"
            *ngFor="let action of lead.next_actions"
            [class.high-priority]="action.priority === 'high'"
            [class.medium-priority]="action.priority === 'medium'">

            <!-- Priority Badge -->
            <mat-chip-list>
              <mat-chip
                [color]="action.priority === 'high' ? 'warn' : action.priority === 'medium' ? 'accent' : 'primary'"
                selected>
                {{ action.priority | uppercase }}
              </mat-chip>
            </mat-chip-list>

            <!-- Action Description -->
            <div class="action-description">
              <mat-icon>task_alt</mat-icon>
              <span>{{ action.action }}</span>
            </div>

            <!-- Execute Button -->
            <button
              mat-icon-button
              color="primary"
              (click)="executeAction(action)"
              matTooltip="Execute action">
              <mat-icon>play_arrow</mat-icon>
            </button>
          </div>
        </div>
      </div>
    </div>

  </mat-card-content>

  <!-- Actions: Requalify, Override -->
  <mat-card-actions *ngIf="!compact">
    <button
      mat-button
      color="primary"
      (click)="onRequalify()"
      matTooltip="Re-run AI qualification">
      <mat-icon>refresh</mat-icon>
      Requalify
    </button>

    <button
      mat-button
      [matMenuTriggerFor]="overrideMenu"
      matTooltip="Override AI classification">
      <mat-icon>edit</mat-icon>
      Override
    </button>

    <mat-menu #overrideMenu="matMenu">
      <button mat-menu-item (click)="onOverride('hot')">
        <mat-icon>whatshot</mat-icon>
        Mark as Hot
      </button>
      <button mat-menu-item (click)="onOverride('warm')">
        <mat-icon>wb_sunny</mat-icon>
        Mark as Warm
      </button>
      <button mat-menu-item (click)="onOverride('cold')">
        <mat-icon>ac_unit</mat-icon>
        Mark as Cold
      </button>
    </mat-menu>
  </mat-card-actions>

  <!-- AI Hint -->
  <div class="ai-hint" *ngIf="!compact">
    <mat-icon>tips_and_updates</mat-icon>
    <span>This qualification was generated by AI in {{ lead.qualification_metadata?.processing_time_ms }}ms</span>
  </div>

</mat-card>
```

---

### 3. Styles

```scss
// lead-qualification-card.component.scss

.qualification-card {
  margin: 16px 0;
  border-left: 4px solid transparent;

  &.compact {
    padding: 8px;
  }

  // Border colors by classification
  &:has(.mat-chip.mat-warn) {
    border-left-color: #f44336; // Hot - Red
  }
  &:has(.mat-chip.mat-accent) {
    border-left-color: #ff9800; // Warm - Orange
  }
  &:has(.mat-chip.mat-primary) {
    border-left-color: #2196f3; // Cold - Blue
  }

  .header-content {
    display: flex;
    align-items: center;
    gap: 24px;
    width: 100%;
  }

  // Score Circle
  .score-circle {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;

    .score-value {
      position: absolute;
      display: flex;
      flex-direction: column;
      align-items: center;
      font-weight: bold;

      .score-number {
        font-size: 24px;
        line-height: 1;
      }

      .score-total {
        font-size: 12px;
        color: rgba(0, 0, 0, 0.54);
      }
    }
  }

  // Classification Info
  .classification-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;

    .confidence-indicator,
    .qualification-date {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: rgba(0, 0, 0, 0.6);

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }
    }
  }

  // Sections
  .reasons-section,
  .actions-section {
    margin: 16px 0;

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px;
      cursor: pointer;
      border-radius: 4px;
      transition: background-color 0.2s;

      &:hover {
        background-color: rgba(0, 0, 0, 0.04);
      }

      h4 {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0;
        font-size: 14px;
        font-weight: 500;
      }
    }

    .section-content {
      padding: 16px 8px;
    }
  }

  // Signals
  .signals {
    margin-bottom: 16px;

    h5 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 8px 0;
      font-size: 13px;
      font-weight: 500;
    }

    ul {
      list-style: none;
      padding: 0;
      margin: 0;

      li {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        padding: 4px 0;
        font-size: 13px;

        mat-icon {
          font-size: 16px;
          width: 16px;
          height: 16px;
          margin-top: 2px;
        }
      }
    }

    &.positive {
      h5 mat-icon { color: #4caf50; }
      ul li mat-icon { color: #4caf50; }
    }

    &.negative {
      h5 mat-icon { color: #ff9800; }
      ul li mat-icon { color: #ff9800; }
    }

    &.missing {
      h5 mat-icon { color: #2196f3; }
      ul li mat-icon { color: #2196f3; }
    }
  }

  // Action List
  .action-list {
    display: flex;
    flex-direction: column;
    gap: 12px;

    .action-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background-color: rgba(0, 0, 0, 0.02);
      border-radius: 8px;
      border-left: 3px solid #e0e0e0;
      transition: all 0.2s;

      &:hover {
        background-color: rgba(0, 0, 0, 0.04);
        transform: translateX(4px);
      }

      &.high-priority {
        border-left-color: #f44336;
        background-color: rgba(244, 67, 54, 0.05);
      }

      &.medium-priority {
        border-left-color: #ff9800;
      }

      .action-description {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
      }
    }
  }

  // AI Hint
  .ai-hint {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    margin-top: 8px;
    background-color: rgba(33, 150, 243, 0.1);
    border-radius: 4px;
    font-size: 12px;
    color: rgba(0, 0, 0, 0.7);

    mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #2196f3;
    }
  }
}

// Responsive
@media (max-width: 768px) {
  .qualification-card {
    .header-content {
      flex-direction: column;
      align-items: flex-start;
    }

    .score-circle {
      align-self: center;
    }
  }
}
```

---

## 🔄 NgRx Integration

### Actions

```typescript
// src/app/store/leads/leads.actions.ts

export const requalifyLead = createAction(
  '[Leads] Requalify Lead',
  props<{ leadId: string }>()
);

export const requalifyLeadSuccess = createAction(
  '[Leads] Requalify Lead Success',
  props<{ lead: Lead }>()
);

export const requalifyLeadFailure = createAction(
  '[Leads] Requalify Lead Failure',
  props<{ error: string }>()
);

export const overrideQualification = createAction(
  '[Leads] Override Qualification',
  props<{ leadId: string; classification: string }>()
);

export const overrideQualificationSuccess = createAction(
  '[Leads] Override Qualification Success',
  props<{ lead: Lead }>()
);
```

### Effects

```typescript
// src/app/store/leads/leads.effects.ts

@Injectable()
export class LeadsEffects {

  requalifyLead$ = createEffect(() =>
    this.actions$.pipe(
      ofType(LeadsActions.requalifyLead),
      switchMap(({ leadId }) =>
        this.leadsService.requalifyLead(leadId).pipe(
          map(lead => LeadsActions.requalifyLeadSuccess({ lead })),
          catchError(error => of(LeadsActions.requalifyLeadFailure({ error: error.message })))
        )
      )
    )
  );

  overrideQualification$ = createEffect(() =>
    this.actions$.pipe(
      ofType(LeadsActions.overrideQualification),
      switchMap(({ leadId, classification }) =>
        this.leadsService.updateLead(leadId, { classification }).pipe(
          map(lead => LeadsActions.overrideQualificationSuccess({ lead })),
          catchError(error => of(LeadsActions.requalifyLeadFailure({ error: error.message })))
        )
      )
    )
  );

  requalifySuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(LeadsActions.requalifyLeadSuccess),
      tap(() => {
        this.snackBar.open('Lead requalified successfully! ✨', 'Close', {
          duration: 3000
        });
      })
    ),
    { dispatch: false }
  );

  constructor(
    private actions$: Actions,
    private leadsService: LeadsService,
    private snackBar: MatSnackBar
  ) {}
}
```

---

## 📱 Usage Examples

### In Lead Detail Page

```html
<!-- lead-detail.component.html -->

<div class="lead-detail">
  <h2>{{ lead.name }}</h2>

  <!-- Qualification Card -->
  <app-lead-qualification-card
    [lead]="lead"
    (requalify)="onRequalify($event)"
    (override)="onOverride($event)">
  </app-lead-qualification-card>

  <!-- Other lead details... -->
</div>
```

### In Lead List (Compact)

```html
<!-- lead-list.component.html -->

<mat-list>
  <mat-list-item *ngFor="let lead of leads">
    <div class="lead-info">
      <h3>{{ lead.name }}</h3>
      <p>{{ lead.company }}</p>
    </div>

    <!-- Compact Qualification Badge -->
    <app-lead-qualification-card
      [lead]="lead"
      [compact]="true">
    </app-lead-qualification-card>
  </mat-list-item>
</mat-list>
```

---

## ✅ Critérios de Aceitação

- [ ] Score é exibido visualmente (circular progress)
- [ ] Classificação com cores distintas (Red/Orange/Blue)
- [ ] Reasons são explicados (positive/negative/missing)
- [ ] Next actions são exibidas com prioridade
- [ ] Botão "Requalify" funciona
- [ ] Override manual funciona
- [ ] Versão compacta funciona na list
- [ ] Confidence level é exibido
- [ ] Timestamp da qualificação é exibido
- [ ] Animações suaves
- [ ] Responsive em mobile
- [ ] Acessibilidade (ARIA labels)

---

## 🔗 Dependências

### Dependências Técnicas
- ✅ Marco 009: Lead Model & API
- ✅ Marco 010: Lead List UI
- ✅ Marco 012: LeadQualifier_Agent v1

### Bibliotecas Angular
```
@angular/material
@ngrx/store
@ngrx/effects
```

---

## 🚨 Riscos e Mitigações

### Risco 1: UI muito complexa (usuário confuso)
**Mitigação**:
- Usar collapsible sections (show/hide)
- Versão compacta para list view
- Tooltips explicativos
- User testing

### Risco 2: Muitos dados (performance)
**Mitigação**:
- Virtual scrolling na lista
- Lazy loading dos reasons/actions
- Debounce em requalify

---

**Status**: 🔵 Pronto para Implementação
**Estimativa**: 3 dias
**Prioridade**: 🔥 Alta (Torna IA compreensível)
