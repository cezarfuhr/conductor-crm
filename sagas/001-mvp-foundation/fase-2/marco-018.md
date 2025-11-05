# Marco 018: Pipeline Kanban View
> Frontend - Visualização Kanban do pipeline de vendas | 5 dias

**Responsável**: Frontend Dev
**Revisor**: Designer
**Status**: 🔵 Planejado

---

## 🎯 Objetivo

Implementar visualização Kanban interativa do pipeline de vendas com drag & drop entre stages, cards com informações essenciais, filtros e métricas em tempo real.

---

## 📋 Contexto

O Kanban é a **view principal** para gerenciar deals. Deve ser:
- Visual e intuitivo
- Drag & drop fluido
- Atualização em tempo real (optimistic UI)
- Mostrar métricas por stage
- Filtros rápidos
- Performance (lazy loading para muitos deals)

**Inspiração**: Pipedrive, HubSpot Deals, Trello

---

## 🎨 Component Structure

```typescript
// src/app/features/deals/pages/pipeline-kanban/pipeline-kanban.component.ts

import { Component, OnInit } from '@angular/core';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';

import { Deal, DealStage } from '@app/models/deal.model';
import * as DealsActions from '@app/store/deals/deals.actions';
import * as DealsSelectors from '@app/store/deals/deals.selectors';

interface PipelineColumn {
  stage: DealStage;
  label: string;
  color: string;
  deals: Deal[];
  totalValue: number;
  count: number;
}

@Component({
  selector: 'app-pipeline-kanban',
  templateUrl: './pipeline-kanban.component.html',
  styleUrls: ['./pipeline-kanban.component.scss']
})
export class PipelineKanbanComponent implements OnInit {
  columns: PipelineColumn[] = [
    {
      stage: 'qualification',
      label: 'Qualification',
      color: '#2196F3',
      deals: [],
      totalValue: 0,
      count: 0
    },
    {
      stage: 'proposal',
      label: 'Proposal',
      color: '#FF9800',
      deals: [],
      totalValue: 0,
      count: 0
    },
    {
      stage: 'negotiation',
      label: 'Negotiation',
      color: '#9C27B0',
      deals: [],
      totalValue: 0,
      count: 0
    },
    {
      stage: 'closed_won',
      label: 'Closed Won',
      color: '#4CAF50',
      deals: [],
      totalValue: 0,
      count: 0
    }
  ];

  deals$!: Observable<Deal[]>;
  loading$!: Observable<boolean>;

  // Filters
  filterOwner: string = 'all';
  filterSearch: string = '';
  filterMinValue: number = 0;

  // Summary
  totalPipelineValue: number = 0;
  totalOpenDeals: number = 0;
  weightedValue: number = 0;

  constructor(private store: Store) {}

  ngOnInit(): void {
    // Load deals
    this.store.dispatch(DealsActions.loadDeals({ filters: { status: 'open' } }));

    // Subscribe to deals
    this.deals$ = this.store.select(DealsSelectors.selectAllDeals);
    this.loading$ = this.store.select(DealsSelectors.selectLoading);

    // Organize deals into columns
    this.deals$.subscribe(deals => {
      this.organizeDealsIntoColumns(deals);
      this.calculateSummary();
    });
  }

  organizeDealsIntoColumns(deals: Deal[]): void {
    // Reset columns
    this.columns.forEach(col => {
      col.deals = [];
      col.totalValue = 0;
      col.count = 0;
    });

    // Apply filters
    const filteredDeals = deals.filter(deal => {
      let pass = true;

      if (this.filterOwner !== 'all' && deal.owner_id !== this.filterOwner) {
        pass = false;
      }

      if (this.filterSearch) {
        const searchLower = this.filterSearch.toLowerCase();
        pass = pass && (
          deal.title.toLowerCase().includes(searchLower) ||
          (deal.company_name || '').toLowerCase().includes(searchLower)
        );
      }

      if (this.filterMinValue > 0 && deal.value < this.filterMinValue * 100) {
        pass = false;
      }

      return pass;
    });

    // Distribute deals into columns
    filteredDeals.forEach(deal => {
      const column = this.columns.find(col => col.stage === deal.stage);
      if (column) {
        column.deals.push(deal);
        column.totalValue += deal.value;
        column.count++;
      }
    });

    // Sort deals by expected_close_date (soonest first)
    this.columns.forEach(col => {
      col.deals.sort((a, b) => {
        if (!a.expected_close_date) return 1;
        if (!b.expected_close_date) return -1;
        return new Date(a.expected_close_date).getTime() - new Date(b.expected_close_date).getTime();
      });
    });
  }

  calculateSummary(): void {
    this.totalPipelineValue = this.columns.reduce((sum, col) => sum + col.totalValue, 0);
    this.totalOpenDeals = this.columns.reduce((sum, col) => sum + col.count, 0);

    // Weighted value = value * probability
    this.weightedValue = this.columns.reduce((sum, col) => {
      const colWeighted = col.deals.reduce((s, deal) => s + (deal.value * deal.probability / 100), 0);
      return sum + colWeighted;
    }, 0);
  }

  // Drag & Drop
  onDrop(event: CdkDragDrop<Deal[]>, targetStage: DealStage): void {
    const deal = event.item.data as Deal;

    if (event.previousContainer === event.container) {
      // Reorder within same column
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      // Move to different column
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );

      // Update deal stage (optimistic UI)
      const previousStage = deal.stage;
      deal.stage = targetStage;

      // Dispatch action to update backend
      this.store.dispatch(DealsActions.updateDealStage({
        dealId: deal.id,
        stage: targetStage,
        previousStage
      }));

      // Recalculate summary
      this.calculateSummary();
    }
  }

  // Actions
  onDealClick(deal: Deal): void {
    // Navigate to deal detail
    this.router.navigate(['/deals', deal.id]);
  }

  onCreateDeal(stage?: DealStage): void {
    // Open create deal dialog/form with pre-selected stage
    // For MVP: navigate to create page
    this.router.navigate(['/deals/new'], {
      queryParams: stage ? { stage } : {}
    });
  }

  formatValue(valueCents: number): string {
    const value = valueCents / 100;
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  // Filters
  applyFilters(): void {
    this.deals$.subscribe(deals => {
      this.organizeDealsIntoColumns(deals);
    });
  }

  clearFilters(): void {
    this.filterOwner = 'all';
    this.filterSearch = '';
    this.filterMinValue = 0;
    this.applyFilters();
  }
}
```

---

## 📄 Template

```html
<!-- pipeline-kanban.component.html -->

<div class="pipeline-kanban">

  <!-- Header: Summary & Filters -->
  <div class="pipeline-header">
    <div class="summary">
      <div class="summary-card">
        <span class="label">Pipeline Value</span>
        <span class="value">{{ formatValue(totalPipelineValue) }}</span>
      </div>
      <div class="summary-card">
        <span class="label">Open Deals</span>
        <span class="value">{{ totalOpenDeals }}</span>
      </div>
      <div class="summary-card">
        <span class="label">Weighted Value</span>
        <span class="value">{{ formatValue(weightedValue) }}</span>
        <mat-icon matTooltip="Sum of (Deal Value × Probability)">info</mat-icon>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters">
      <mat-form-field appearance="outline" class="filter-search">
        <mat-label>Search deals...</mat-label>
        <input
          matInput
          [(ngModel)]="filterSearch"
          (ngModelChange)="applyFilters()"
          placeholder="Company or deal title">
        <mat-icon matPrefix>search</mat-icon>
      </mat-form-field>

      <mat-form-field appearance="outline" class="filter-owner">
        <mat-label>Owner</mat-label>
        <mat-select [(ngModel)]="filterOwner" (selectionChange)="applyFilters()">
          <mat-option value="all">All Owners</mat-option>
          <mat-option *ngFor="let owner of owners" [value]="owner.id">
            {{ owner.name }}
          </mat-option>
        </mat-select>
      </mat-form-field>

      <button
        mat-icon-button
        matTooltip="Clear filters"
        *ngIf="filterOwner !== 'all' || filterSearch || filterMinValue > 0"
        (click)="clearFilters()">
        <mat-icon>clear</mat-icon>
      </button>
    </div>
  </div>

  <!-- Kanban Board -->
  <div class="kanban-board" cdkDropListGroup>

    <!-- Column per Stage -->
    <div
      class="kanban-column"
      *ngFor="let column of columns"
      [style.border-top-color]="column.color">

      <!-- Column Header -->
      <div class="column-header" [style.background-color]="column.color">
        <div class="column-title">
          <h3>{{ column.label }}</h3>
          <span class="deal-count">{{ column.count }}</span>
        </div>
        <div class="column-value">
          {{ formatValue(column.totalValue) }}
        </div>
        <button
          mat-icon-button
          class="add-deal-btn"
          (click)="onCreateDeal(column.stage)"
          matTooltip="Add deal to {{ column.label }}">
          <mat-icon>add</mat-icon>
        </button>
      </div>

      <!-- Droppable Area -->
      <div
        class="column-content"
        cdkDropList
        [cdkDropListData]="column.deals"
        (cdkDropListDropped)="onDrop($event, column.stage)">

        <!-- Deal Cards -->
        <div
          class="deal-card"
          *ngFor="let deal of column.deals"
          cdkDrag
          [cdkDragData]="deal"
          (click)="onDealClick(deal)">

          <!-- Drag Handle -->
          <div class="drag-handle" cdkDragHandle>
            <mat-icon>drag_indicator</mat-icon>
          </div>

          <!-- Card Content -->
          <div class="card-content">
            <!-- Title -->
            <h4 class="deal-title">{{ deal.title }}</h4>

            <!-- Company -->
            <p class="deal-company" *ngIf="deal.company_name">
              <mat-icon>business</mat-icon>
              {{ deal.company_name }}
            </p>

            <!-- Value & Probability -->
            <div class="deal-metrics">
              <span class="deal-value">
                {{ formatValue(deal.value) }}
              </span>
              <mat-chip-list>
                <mat-chip [color]="getProbabilityColor(deal.probability)" selected>
                  {{ deal.probability }}%
                </mat-chip>
              </mat-chip-list>
            </div>

            <!-- Close Date -->
            <div class="deal-footer">
              <span class="close-date" *ngIf="deal.expected_close_date">
                <mat-icon>event</mat-icon>
                {{ deal.expected_close_date | date:'MMM dd' }}
              </span>

              <!-- Owner Avatar -->
              <div class="owner-avatar" [matTooltip]="deal.owner_name">
                {{ getInitials(deal.owner_name) }}
              </div>
            </div>

            <!-- AI Health Indicator -->
            <div
              class="health-indicator"
              *ngIf="deal.ai_health_score"
              [matTooltip]="'Health Score: ' + deal.ai_health_score"
              [class.healthy]="deal.ai_health_score >= 70"
              [class.warning]="deal.ai_health_score >= 40 && deal.ai_health_score < 70"
              [class.danger]="deal.ai_health_score < 40">
              <mat-icon>favorite</mat-icon>
            </div>
          </div>

          <!-- Drag Preview -->
          <div class="deal-card-preview" *cdkDragPreview>
            <h4>{{ deal.title }}</h4>
            <p>{{ formatValue(deal.value) }}</p>
          </div>
        </div>

        <!-- Empty State -->
        <div class="empty-column" *ngIf="column.deals.length === 0">
          <mat-icon>inbox</mat-icon>
          <p>No deals in {{ column.label }}</p>
          <button
            mat-stroked-button
            color="primary"
            (click)="onCreateDeal(column.stage)">
            Add Deal
          </button>
        </div>

      </div>
    </div>

  </div>

  <!-- Loading Overlay -->
  <div class="loading-overlay" *ngIf="loading$ | async">
    <mat-spinner></mat-spinner>
  </div>

</div>
```

---

## 🎨 Styles

```scss
// pipeline-kanban.component.scss

.pipeline-kanban {
  height: calc(100vh - 64px);  // Full viewport minus header
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;

  // Header
  .pipeline-header {
    background: white;
    padding: 16px 24px;
    border-bottom: 1px solid #e0e0e0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 24px;

    .summary {
      display: flex;
      gap: 24px;

      .summary-card {
        display: flex;
        flex-direction: column;
        gap: 4px;

        .label {
          font-size: 12px;
          color: rgba(0, 0, 0, 0.6);
          text-transform: uppercase;
        }

        .value {
          font-size: 24px;
          font-weight: 500;
        }

        mat-icon {
          font-size: 16px;
          width: 16px;
          height: 16px;
          vertical-align: middle;
          cursor: help;
        }
      }
    }

    .filters {
      display: flex;
      gap: 16px;
      align-items: center;

      mat-form-field {
        width: 200px;
      }
    }
  }

  // Kanban Board
  .kanban-board {
    flex: 1;
    display: flex;
    gap: 16px;
    padding: 24px;
    overflow-x: auto;
    overflow-y: hidden;
  }

  // Column
  .kanban-column {
    min-width: 300px;
    max-width: 350px;
    flex: 1;
    display: flex;
    flex-direction: column;
    background: white;
    border-radius: 8px;
    border-top: 4px solid;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

    .column-header {
      padding: 16px;
      color: white;
      border-radius: 8px 8px 0 0;
      display: flex;
      flex-direction: column;
      gap: 8px;

      .column-title {
        display: flex;
        justify-content: space-between;
        align-items: center;

        h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 500;
        }

        .deal-count {
          background: rgba(255, 255, 255, 0.3);
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }
      }

      .column-value {
        font-size: 18px;
        font-weight: 500;
      }

      .add-deal-btn {
        color: white;
        align-self: flex-end;
      }
    }

    .column-content {
      flex: 1;
      padding: 12px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-height: 200px;
    }
  }

  // Deal Card
  .deal-card {
    background: white;
    border-radius: 8px;
    border: 1px solid #e0e0e0;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
    overflow: hidden;

    &:hover {
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
      transform: translateY(-2px);
    }

    &.cdk-drag-animating {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }

    .drag-handle {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 24px;
      background: rgba(0, 0, 0, 0.05);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.2s;
      cursor: grab;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: rgba(0, 0, 0, 0.38);
      }

      &:active {
        cursor: grabbing;
      }
    }

    &:hover .drag-handle {
      opacity: 1;
    }

    .card-content {
      padding: 12px 12px 12px 36px;

      .deal-title {
        margin: 0 0 8px 0;
        font-size: 14px;
        font-weight: 500;
        line-height: 1.4;
      }

      .deal-company {
        display: flex;
        align-items: center;
        gap: 4px;
        margin: 0 0 12px 0;
        font-size: 12px;
        color: rgba(0, 0, 0, 0.6);

        mat-icon {
          font-size: 14px;
          width: 14px;
          height: 14px;
        }
      }

      .deal-metrics {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;

        .deal-value {
          font-size: 16px;
          font-weight: 500;
          color: #4CAF50;
        }
      }

      .deal-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;

        .close-date {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: rgba(0, 0, 0, 0.6);

          mat-icon {
            font-size: 14px;
            width: 14px;
            height: 14px;
          }
        }

        .owner-avatar {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #2196F3;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 500;
        }
      }

      .health-indicator {
        position: absolute;
        top: 8px;
        right: 8px;

        mat-icon {
          font-size: 16px;
          width: 16px;
          height: 16px;
        }

        &.healthy mat-icon { color: #4CAF50; }
        &.warning mat-icon { color: #FF9800; }
        &.danger mat-icon { color: #f44336; }
      }
    }
  }

  // Drag Preview
  .deal-card-preview {
    background: white;
    padding: 12px;
    border-radius: 8px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    opacity: 0.9;
  }

  // Empty State
  .empty-column {
    text-align: center;
    padding: 40px 20px;
    color: rgba(0, 0, 0, 0.38);

    mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
    }

    p {
      margin-bottom: 16px;
    }
  }

  // Loading
  .loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
  }
}

// CDK Drag & Drop
.cdk-drop-list-dragging .deal-card:not(.cdk-drag-placeholder) {
  transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
}

.cdk-drag-placeholder {
  opacity: 0.5;
  background: #f5f5f5;
  border: 2px dashed #bdbdbd;
}
```

---

## ✅ Critérios de Aceitação

- [ ] Kanban board com 4 colunas (stages)
- [ ] Drag & drop funciona entre colunas
- [ ] Deal cards mostram informações essenciais
- [ ] Métricas por coluna (count, value)
- [ ] Summary no header (pipeline value, weighted value)
- [ ] Filtros funcionam (search, owner, value)
- [ ] Click em card navega para detail
- [ ] Botão para adicionar deal por stage
- [ ] Animações suaves
- [ ] Responsive (horizontal scroll em mobile)
- [ ] Loading state
- [ ] Empty state por coluna
- [ ] AI health indicator visível

---

## 🔗 Dependências

- ✅ Marco 017: Deal Model & API
- `@angular/cdk/drag-drop`

---

**Status**: 🔵 Pronto para Implementação
**Estimativa**: 5 dias
