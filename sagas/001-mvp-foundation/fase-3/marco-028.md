# Marco 028: Deal Intelligence UI
> Frontend - Visualização de insights de IA sobre deals | 3 dias

**Responsável**: Frontend Dev
**Revisor**: Designer
**Status**: 🔵 Planejado

---

## 🎯 Objetivo

Implementar componente visual que exibe insights de IA sobre deals: health score, win probability, risk alerts, e recommended actions de forma clara e acionável.

---

## 📋 Key Features

- **Health Score Gauge**: Indicador visual 0-100
- **Win Probability**: Percentual com confiança
- **Risk Alerts**: Cards com severity colors
- **Recommended Actions**: Checklist prioritizada
- **Trend Analysis**: Comparação com período anterior

---

## 💻 Component Implementation

```typescript
// src/app/features/deals/components/deal-intelligence-card/deal-intelligence-card.component.ts

import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { Deal } from '@app/models/deal.model';
import { AIService } from '@app/services/ai.service';

@Component({
  selector: 'app-deal-intelligence-card',
  templateUrl: './deal-intelligence-card.component.html',
  styleUrls: ['./deal-intelligence-card.component.scss']
})
export class DealIntelligenceCardComponent implements OnInit {
  @Input() deal!: Deal;
  @Output() refreshPrediction = new EventEmitter<void>();
  @Output() actionExecuted = new EventEmitter<any>();

  loading: boolean = false;
  showDetails: boolean = false;

  constructor(private aiService: AIService) {}

  ngOnInit(): void {
    // Load prediction if not present
    if (!this.deal.ai_health_score) {
      this.runPrediction();
    }
  }

  async runPrediction(): Promise<void> {
    this.loading = true;
    try {
      const result = await this.aiService.predictDeal(this.deal.id).toPromise();
      Object.assign(this.deal, result);  // Update deal with predictions
    } catch (error) {
      console.error('Prediction failed:', error);
    } finally {
      this.loading = false;
    }
  }

  getHealthColor(score: number): string {
    if (score >= 80) return 'primary';
    if (score >= 60) return 'accent';
    if (score >= 40) return 'warn';
    return 'warn';
  }

  getHealthLabel(score: number): string {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'At Risk';
  }

  getProbabilityColor(prob: number): string {
    if (prob >= 70) return '#4CAF50';
    if (prob >= 40) return '#FF9800';
    return '#f44336';
  }

  getRiskSeverityColor(severity: string): string {
    const colors = {
      'high': '#f44336',
      'medium': '#FF9800',
      'low': '#FFC107'
    };
    return colors[severity] || '#9E9E9E';
  }

  getPriorityColor(priority: string): string {
    const colors = {
      'high': '#f44336',
      'medium': '#FF9800',
      'low': '#2196F3'
    };
    return colors[priority] || '#9E9E9E';
  }

  executeAction(action: any): void {
    this.actionExecuted.emit(action);
    // TODO: Implement action execution
  }

  refreshInsights(): void {
    this.runPrediction();
    this.refreshPrediction.emit();
  }
}
```

---

## 📄 Template

```html
<!-- deal-intelligence-card.component.html -->

<mat-card class="deal-intelligence-card">

  <!-- Header -->
  <mat-card-header>
    <div class="header-content">
      <mat-card-title>
        <mat-icon>psychology</mat-icon>
        AI Insights
      </mat-card-title>
      <button
        mat-icon-button
        (click)="refreshInsights()"
        [disabled]="loading"
        matTooltip="Refresh predictions">
        <mat-icon>refresh</mat-icon>
      </button>
    </div>
  </mat-card-header>

  <!-- Loading State -->
  <div class="loading-state" *ngIf="loading">
    <mat-spinner diameter="40"></mat-spinner>
    <p>Analyzing deal...</p>
  </div>

  <!-- Content -->
  <mat-card-content *ngIf="!loading">

    <!-- Health Score & Win Probability -->
    <div class="metrics-row">

      <!-- Health Score Gauge -->
      <div class="metric health-score">
        <h4>Health Score</h4>
        <div class="gauge-container">
          <svg viewBox="0 0 100 50" class="gauge">
            <!-- Background arc -->
            <path
              d="M 10 50 A 40 40 0 0 1 90 50"
              fill="none"
              stroke="#e0e0e0"
              stroke-width="8"/>
            <!-- Colored arc -->
            <path
              d="M 10 50 A 40 40 0 0 1 90 50"
              fill="none"
              [attr.stroke]="getHealthColor(deal.ai_health_score)"
              stroke-width="8"
              [style.stroke-dasharray]="(deal.ai_health_score / 100) * 125 + ' 125'"
              stroke-linecap="round"/>
          </svg>
          <div class="gauge-value">
            <span class="value">{{ deal.ai_health_score }}</span>
            <span class="label">{{ getHealthLabel(deal.ai_health_score) }}</span>
          </div>
        </div>
      </div>

      <!-- Win Probability -->
      <div class="metric win-probability">
        <h4>Win Probability</h4>
        <div class="probability-display">
          <div class="prob-circle" [style.background-color]="getProbabilityColor(deal.ai_probability)">
            <span class="prob-value">{{ deal.ai_probability }}%</span>
          </div>
          <div class="prob-details">
            <mat-chip-list>
              <mat-chip>
                Confidence: {{ (deal.prediction_metadata?.confidence_level * 100).toFixed(0) }}%
              </mat-chip>
            </mat-chip-list>
            <div class="predicted-date" *ngIf="deal.ai_predicted_close_date">
              <mat-icon>event</mat-icon>
              <span>Predicted: {{ deal.ai_predicted_close_date | date:'mediumDate' }}</span>
            </div>
          </div>
        </div>
      </div>

    </div>

    <mat-divider></mat-divider>

    <!-- Risk Factors -->
    <div class="risk-factors" *ngIf="deal.risk_factors?.length > 0">
      <h4>
        <mat-icon>warning</mat-icon>
        Risk Factors
      </h4>
      <div class="risk-list">
        <mat-card
          *ngFor="let risk of deal.risk_factors"
          class="risk-card"
          [style.border-left-color]="getRiskSeverityColor(risk.severity)">
          <div class="risk-header">
            <mat-chip
              [style.background-color]="getRiskSeverityColor(risk.severity)"
              class="severity-chip">
              {{ risk.severity | uppercase }}
            </mat-chip>
            <strong>{{ risk.factor }}</strong>
          </div>
          <p class="risk-impact">{{ risk.impact }}</p>
        </mat-card>
      </div>
    </div>

    <!-- No Risks -->
    <div class="no-risks" *ngIf="!deal.risk_factors || deal.risk_factors.length === 0">
      <mat-icon>check_circle</mat-icon>
      <p>No significant risk factors identified</p>
    </div>

    <mat-divider></mat-divider>

    <!-- Recommended Actions -->
    <div class="recommended-actions">
      <h4>
        <mat-icon>bolt</mat-icon>
        Recommended Actions
      </h4>
      <div class="actions-list">
        <div
          *ngFor="let action of deal.recommended_actions; let i = index"
          class="action-item"
          [class.high-priority]="action.priority === 'high'">

          <div class="action-header">
            <mat-checkbox (change)="executeAction(action)">
              <span class="action-text">{{ action.action }}</span>
            </mat-checkbox>
            <mat-chip
              [style.background-color]="getPriorityColor(action.priority)"
              class="priority-chip">
              {{ action.priority | uppercase }}
            </mat-chip>
          </div>

          <!-- Reasoning (expandable) -->
          <p class="action-reasoning" *ngIf="showDetails">
            <mat-icon>info</mat-icon>
            {{ action.reasoning }}
          </p>
        </div>
      </div>
    </div>

    <!-- Toggle Details -->
    <button
      mat-button
      class="toggle-details"
      (click)="showDetails = !showDetails">
      <mat-icon>{{ showDetails ? 'expand_less' : 'expand_more' }}</mat-icon>
      {{ showDetails ? 'Hide' : 'Show' }} Details
    </button>

    <!-- AI Hint -->
    <div class="ai-hint">
      <mat-icon>auto_awesome</mat-icon>
      <span>
        Last updated: {{ deal.prediction_metadata?.predicted_at | date:'short' }}
        ({{ deal.prediction_metadata?.model_used }})
      </span>
    </div>

  </mat-card-content>

</mat-card>
```

---

## 🎨 Styles

```scss
// deal-intelligence-card.component.scss

.deal-intelligence-card {
  margin: 16px 0;
  border-left: 4px solid #2196F3;

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;

    mat-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  }

  .loading-state {
    text-align: center;
    padding: 40px;

    p {
      margin-top: 16px;
      color: rgba(0, 0, 0, 0.6);
    }
  }

  .metrics-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    margin-bottom: 24px;

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }

    .metric {
      text-align: center;

      h4 {
        margin: 0 0 16px 0;
        font-size: 14px;
        color: rgba(0, 0, 0, 0.6);
        text-transform: uppercase;
      }
    }

    .gauge-container {
      position: relative;

      .gauge {
        width: 120px;
        height: 60px;
      }

      .gauge-value {
        position: absolute;
        top: 40px;
        left: 50%;
        transform: translateX(-50%);
        text-align: center;

        .value {
          display: block;
          font-size: 24px;
          font-weight: bold;
        }

        .label {
          font-size: 12px;
          color: rgba(0, 0, 0, 0.6);
        }
      }
    }

    .probability-display {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;

      .prob-circle {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;

        .prob-value {
          color: white;
          font-size: 20px;
          font-weight: bold;
        }
      }

      .prob-details {
        display: flex;
        flex-direction: column;
        gap: 8px;

        .predicted-date {
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
    }
  }

  .risk-factors {
    margin: 24px 0;

    h4 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
    }

    .risk-list {
      display: flex;
      flex-direction: column;
      gap: 12px;

      .risk-card {
        padding: 12px;
        border-left: 4px solid;

        .risk-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;

          .severity-chip {
            color: white;
            font-size: 10px;
            font-weight: 500;
            padding: 4px 8px;
            min-height: 24px;
          }

          strong {
            font-size: 14px;
          }
        }

        .risk-impact {
          margin: 0;
          font-size: 13px;
          color: rgba(0, 0, 0, 0.7);
          padding-left: 8px;
        }
      }
    }
  }

  .no-risks {
    text-align: center;
    padding: 24px;
    color: #4CAF50;

    mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
    }
  }

  .recommended-actions {
    margin: 24px 0;

    h4 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
    }

    .actions-list {
      display: flex;
      flex-direction: column;
      gap: 12px;

      .action-item {
        padding: 12px;
        background: rgba(0, 0, 0, 0.02);
        border-radius: 8px;
        border-left: 3px solid #e0e0e0;

        &.high-priority {
          border-left-color: #f44336;
          background: rgba(244, 67, 54, 0.05);
        }

        .action-header {
          display: flex;
          justify-content: space-between;
          align-items: center;

          .action-text {
            font-size: 14px;
          }

          .priority-chip {
            color: white;
            font-size: 10px;
            min-height: 24px;
          }
        }

        .action-reasoning {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          margin: 8px 0 0 32px;
          font-size: 12px;
          color: rgba(0, 0, 0, 0.6);

          mat-icon {
            font-size: 14px;
            width: 14px;
            height: 14px;
          }
        }
      }
    }
  }

  .toggle-details {
    width: 100%;
    margin-top: 16px;
  }

  .ai-hint {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    margin-top: 16px;
    background: rgba(33, 150, 243, 0.1);
    border-radius: 4px;
    font-size: 11px;
    color: rgba(0, 0, 0, 0.7);

    mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: #2196F3;
    }
  }
}
```

---

## ✅ Critérios de Aceitação

- [ ] Health score gauge exibido corretamente
- [ ] Win probability com cor dinâmica
- [ ] Risk factors listados com severity
- [ ] Recommended actions priorizadas
- [ ] Refresh button funciona
- [ ] Loading state durante predição
- [ ] Responsive em mobile
- [ ] Toggle details funciona
- [ ] Checkpoint para marcar ações como concluídas
- [ ] Integrated em Deal Detail Page (Marco 019)

---

## 🔗 Dependências

- ✅ Marco 027: DealPredictor_Agent
- ✅ Marco 019: Deal Detail Page

---

**Status**: 🔵 Pronto para Implementação
**Estimativa**: 3 dias
