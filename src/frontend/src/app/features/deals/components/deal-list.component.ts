import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { DealService } from '../../../core/services/deal.service';
import { Deal, DealStage } from '../../../shared/models/deal.model';

interface DealColumn {
  stage: DealStage;
  title: string;
  deals: Deal[];
  color: string;
}

@Component({
  selector: 'app-deal-list',
  template: `
    <div class="deal-list-container">
      <div class="header">
        <h1>Deals Pipeline</h1>
        <div class="header-actions">
          <mat-form-field appearance="outline" class="search-field">
            <mat-label>Search</mat-label>
            <input matInput [(ngModel)]="searchTerm" (keyup)="applyFilter()" placeholder="Search deals...">
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>
          <button mat-raised-button color="primary" (click)="openCreateDialog()">
            <mat-icon>add</mat-icon>
            New Deal
          </button>
        </div>
      </div>

      <!-- Pipeline Statistics -->
      <div class="pipeline-stats">
        <mat-card>
          <mat-card-content>
            <div class="stat">
              <span class="stat-label">Total Value</span>
              <span class="stat-value">{{ totalPipelineValue | currency:defaultCurrency }}</span>
            </div>
          </mat-card-content>
        </mat-card>
        <mat-card>
          <mat-card-content>
            <div class="stat">
              <span class="stat-label">Weighted Value</span>
              <span class="stat-value">{{ weightedPipelineValue | currency:defaultCurrency }}</span>
            </div>
          </mat-card-content>
        </mat-card>
        <mat-card>
          <mat-card-content>
            <div class="stat">
              <span class="stat-label">Total Deals</span>
              <span class="stat-value">{{ totalDeals }}</span>
            </div>
          </mat-card-content>
        </mat-card>
        <mat-card>
          <mat-card-content>
            <div class="stat">
              <span class="stat-label">Avg. Deal Size</span>
              <span class="stat-value">{{ avgDealSize | currency:defaultCurrency }}</span>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Kanban Board -->
      <div class="kanban-board">
        <div
          *ngFor="let column of columns"
          class="kanban-column"
          [style.border-top-color]="column.color">
          <div class="column-header">
            <h3>{{ column.title }}</h3>
            <span class="deal-count">{{ column.deals.length }}</span>
            <span class="column-value">{{ getColumnValue(column) | currency:defaultCurrency }}</span>
          </div>

          <div
            class="deal-list"
            cdkDropList
            [cdkDropListData]="column.deals"
            [id]="column.stage"
            [cdkDropListConnectedTo]="getConnectedLists()"
            (cdkDropListDropped)="onDrop($event)">

            <div
              *ngFor="let deal of column.deals"
              class="deal-card"
              cdkDrag
              (click)="viewDeal(deal)">
              <div class="deal-card-header">
                <strong>{{ deal.title }}</strong>
                <button
                  mat-icon-button
                  [matMenuTriggerFor]="menu"
                  (click)="$event.stopPropagation()">
                  <mat-icon>more_vert</mat-icon>
                </button>
                <mat-menu #menu="matMenu">
                  <button mat-menu-item (click)="viewDeal(deal)">
                    <mat-icon>visibility</mat-icon>
                    <span>View</span>
                  </button>
                  <button mat-menu-item (click)="editDeal(deal)">
                    <mat-icon>edit</mat-icon>
                    <span>Edit</span>
                  </button>
                  <button mat-menu-item (click)="predictDeal(deal)">
                    <mat-icon>psychology</mat-icon>
                    <span>AI Prediction</span>
                  </button>
                  <mat-divider></mat-divider>
                  <button mat-menu-item (click)="deleteDeal(deal)" class="delete-action">
                    <mat-icon>delete</mat-icon>
                    <span>Delete</span>
                  </button>
                </mat-menu>
              </div>

              <div class="deal-card-content">
                <div class="deal-value">
                  <mat-icon>attach_money</mat-icon>
                  <span>{{ deal.value | currency:deal.currency }}</span>
                </div>

                <div class="deal-probability">
                  <mat-progress-bar
                    mode="determinate"
                    [value]="deal.probability"
                    [class]="getProbabilityClass(deal.probability)">
                  </mat-progress-bar>
                  <span class="probability-text">{{ deal.probability }}% probability</span>
                </div>

                <div class="deal-date" *ngIf="deal.expected_close_date">
                  <mat-icon>event</mat-icon>
                  <span>{{ deal.expected_close_date | date:'shortDate' }}</span>
                  <mat-chip *ngIf="isOverdue(deal.expected_close_date)" class="overdue-chip">
                    Overdue
                  </mat-chip>
                </div>

                <div class="deal-contact" *ngIf="deal.contact_id">
                  <mat-icon>person</mat-icon>
                  <span>{{ deal.contact_id }}</span>
                </div>

                <!-- AI Insights -->
                <div class="ai-insights" *ngIf="deal.ai_insights">
                  <mat-chip class="ai-chip">
                    <mat-icon>psychology</mat-icon>
                    AI: {{ deal.ai_insights.win_probability }}% win
                  </mat-chip>
                  <div class="health-score">
                    <small>Health: {{ deal.ai_insights.health_score }}/100</small>
                  </div>
                </div>

                <!-- Risk Factors -->
                <div class="risk-factors" *ngIf="deal.risk_factors && deal.risk_factors.length > 0">
                  <mat-chip class="risk-chip">
                    <mat-icon>warning</mat-icon>
                    {{ deal.risk_factors.length }} risk{{ deal.risk_factors.length > 1 ? 's' : '' }}
                  </mat-chip>
                </div>
              </div>
            </div>

            <div *ngIf="column.deals.length === 0" class="empty-column">
              <mat-icon>inbox</mat-icon>
              <p>No deals in this stage</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .deal-list-container {
      max-width: 100%;
      padding: 20px;
      height: 100vh;
      overflow-x: auto;
    }

    .header {
      margin-bottom: 20px;
    }

    .header h1 {
      margin: 0 0 16px 0;
    }

    .header-actions {
      display: flex;
      gap: 16px;
      align-items: center;
    }

    .search-field {
      flex: 1;
      max-width: 400px;
    }

    /* Pipeline Statistics */
    .pipeline-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .stat-label {
      font-size: 14px;
      color: rgba(0, 0, 0, 0.6);
      font-weight: 500;
    }

    .stat-value {
      font-size: 24px;
      font-weight: 600;
      color: #1976d2;
    }

    /* Kanban Board */
    .kanban-board {
      display: flex;
      gap: 16px;
      overflow-x: auto;
      padding-bottom: 20px;
      min-height: 600px;
    }

    .kanban-column {
      min-width: 320px;
      max-width: 320px;
      background-color: #f5f5f5;
      border-radius: 8px;
      border-top: 4px solid;
      display: flex;
      flex-direction: column;
    }

    .column-header {
      padding: 16px;
      background-color: white;
      border-radius: 8px 8px 0 0;
      border-bottom: 1px solid #e0e0e0;
    }

    .column-header h3 {
      margin: 0 0 8px 0;
      font-size: 16px;
      font-weight: 600;
    }

    .deal-count {
      display: inline-block;
      background-color: #e0e0e0;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
      margin-right: 8px;
    }

    .column-value {
      font-size: 14px;
      color: rgba(0, 0, 0, 0.6);
      font-weight: 500;
    }

    .deal-list {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      min-height: 200px;
    }

    .deal-card {
      background-color: white;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
      cursor: pointer;
      transition: box-shadow 0.2s, transform 0.2s;
    }

    .deal-card:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transform: translateY(-2px);
    }

    .deal-card.cdk-drag-preview {
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
      transform: rotate(2deg);
    }

    .deal-card.cdk-drag-animating {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }

    .deal-list.cdk-drop-list-dragging .deal-card:not(.cdk-drag-placeholder) {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }

    .deal-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
    }

    .deal-card-header strong {
      flex: 1;
      font-size: 15px;
      line-height: 1.4;
    }

    .deal-card-content {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .deal-value {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 18px;
      font-weight: 600;
      color: #2e7d32;
    }

    .deal-value mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .deal-probability {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .deal-probability mat-progress-bar {
      height: 6px;
      border-radius: 3px;
    }

    .deal-probability.high ::ng-deep .mdc-linear-progress__bar-inner {
      border-color: #4CAF50 !important;
    }

    .deal-probability.medium ::ng-deep .mdc-linear-progress__bar-inner {
      border-color: #FF9800 !important;
    }

    .deal-probability.low ::ng-deep .mdc-linear-progress__bar-inner {
      border-color: #F44336 !important;
    }

    .probability-text {
      font-size: 12px;
      color: rgba(0, 0, 0, 0.6);
    }

    .deal-date,
    .deal-contact {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: rgba(0, 0, 0, 0.7);
    }

    .deal-date mat-icon,
    .deal-contact mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: rgba(0, 0, 0, 0.5);
    }

    .overdue-chip {
      background-color: #F44336;
      color: white;
      font-size: 10px;
      padding: 2px 8px;
      height: 20px;
      margin-left: 8px;
    }

    .ai-insights {
      padding: 8px;
      background-color: #e3f2fd;
      border-radius: 4px;
      border-left: 3px solid #2196F3;
    }

    .ai-chip {
      background-color: #2196F3;
      color: white;
      font-size: 12px;
      height: 24px;
    }

    .ai-chip mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .health-score {
      margin-top: 4px;
      font-size: 11px;
      color: rgba(0, 0, 0, 0.7);
    }

    .risk-factors {
      padding: 8px;
      background-color: #ffebee;
      border-radius: 4px;
      border-left: 3px solid #F44336;
    }

    .risk-chip {
      background-color: #F44336;
      color: white;
      font-size: 12px;
      height: 24px;
    }

    .risk-chip mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .empty-column {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      color: rgba(0, 0, 0, 0.4);
    }

    .empty-column mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 8px;
    }

    .empty-column p {
      margin: 0;
      font-size: 14px;
    }

    .delete-action {
      color: #F44336;
    }

    /* Stage Colors */
    .kanban-column:nth-child(1) { border-top-color: #2196F3; }
    .kanban-column:nth-child(2) { border-top-color: #FF9800; }
    .kanban-column:nth-child(3) { border-top-color: #FFC107; }
    .kanban-column:nth-child(4) { border-top-color: #9C27B0; }
    .kanban-column:nth-child(5) { border-top-color: #4CAF50; }
    .kanban-column:nth-child(6) { border-top-color: #F44336; }
  `]
})
export class DealListComponent implements OnInit {
  columns: DealColumn[] = [
    { stage: 'prospect', title: 'Prospect', deals: [], color: '#2196F3' },
    { stage: 'qualification', title: 'Qualification', deals: [], color: '#FF9800' },
    { stage: 'proposal', title: 'Proposal', deals: [], color: '#FFC107' },
    { stage: 'negotiation', title: 'Negotiation', deals: [], color: '#9C27B0' },
    { stage: 'closed_won', title: 'Closed Won', deals: [], color: '#4CAF50' },
    { stage: 'closed_lost', title: 'Closed Lost', deals: [], color: '#F44336' }
  ];

  allDeals: Deal[] = [];
  searchTerm = '';
  defaultCurrency = 'USD';

  totalPipelineValue = 0;
  weightedPipelineValue = 0;
  totalDeals = 0;
  avgDealSize = 0;

  constructor(
    private dealService: DealService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadDeals();
  }

  loadDeals(): void {
    this.dealService.getDeals({}).subscribe({
      next: (response) => {
        this.allDeals = response.deals;
        this.organizeDealsIntoColumns();
        this.calculateStatistics();
      },
      error: (error) => {
        this.snackBar.open('Error loading deals', 'Close', { duration: 3000 });
      }
    });
  }

  organizeDealsIntoColumns(): void {
    // Reset all columns
    this.columns.forEach(col => col.deals = []);

    // Filter and organize deals
    const filteredDeals = this.searchTerm
      ? this.allDeals.filter(deal =>
          deal.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
          (deal.account_id && deal.account_id.toLowerCase().includes(this.searchTerm.toLowerCase()))
        )
      : this.allDeals;

    // Distribute deals into columns
    filteredDeals.forEach(deal => {
      const column = this.columns.find(col => col.stage === deal.stage);
      if (column) {
        column.deals.push(deal);
      }
    });
  }

  calculateStatistics(): void {
    const activeDeals = this.allDeals.filter(d =>
      d.stage !== 'closed_won' && d.stage !== 'closed_lost'
    );

    this.totalDeals = activeDeals.length;
    this.totalPipelineValue = activeDeals.reduce((sum, deal) => sum + deal.value, 0);
    this.weightedPipelineValue = activeDeals.reduce(
      (sum, deal) => sum + (deal.value * deal.probability / 100),
      0
    );
    this.avgDealSize = this.totalDeals > 0 ? this.totalPipelineValue / this.totalDeals : 0;
  }

  applyFilter(): void {
    this.organizeDealsIntoColumns();
  }

  getConnectedLists(): string[] {
    return this.columns.map(col => col.stage);
  }

  getColumnValue(column: DealColumn): number {
    return column.deals.reduce((sum, deal) => sum + deal.value, 0);
  }

  getProbabilityClass(probability: number): string {
    if (probability >= 70) return 'high';
    if (probability >= 40) return 'medium';
    return 'low';
  }

  isOverdue(dateString: string): boolean {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  }

  onDrop(event: CdkDragDrop<Deal[]>): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      const deal = event.previousContainer.data[event.previousIndex];
      const newStage = event.container.id as DealStage;

      // Update deal stage via API
      this.dealService.updateDeal(deal.id, { stage: newStage }).subscribe({
        next: (updatedDeal) => {
          transferArrayItem(
            event.previousContainer.data,
            event.container.data,
            event.previousIndex,
            event.currentIndex
          );
          this.calculateStatistics();
          this.snackBar.open(`Deal moved to ${newStage}`, 'Close', { duration: 2000 });
        },
        error: (error) => {
          this.snackBar.open('Error updating deal stage', 'Close', { duration: 3000 });
        }
      });
    }
  }

  openCreateDialog(): void {
    // TODO: Implement create dialog
    this.snackBar.open('Create dialog not implemented yet', 'Close', { duration: 3000 });
  }

  viewDeal(deal: Deal): void {
    // TODO: Navigate to deal detail
    console.log('View deal:', deal);
  }

  editDeal(deal: Deal): void {
    // TODO: Implement edit dialog
    this.snackBar.open('Edit dialog not implemented yet', 'Close', { duration: 3000 });
  }

  predictDeal(deal: Deal): void {
    this.snackBar.open('Predicting deal outcome with AI...', '', { duration: 2000 });
    this.dealService.predictDeal(deal.id).subscribe({
      next: (result) => {
        this.snackBar.open(
          `AI Prediction: ${result.win_probability}% win probability, health score ${result.health_score}/100`,
          'Close',
          { duration: 5000 }
        );
        this.loadDeals(); // Reload to show updated insights
      },
      error: (error) => {
        const message = error.status === 503
          ? 'AI service is being migrated. Feature temporarily unavailable.'
          : 'Error predicting deal';
        this.snackBar.open(message, 'Close', { duration: 5000 });
      }
    });
  }

  deleteDeal(deal: Deal): void {
    if (confirm(`Are you sure you want to delete "${deal.title}"?`)) {
      this.dealService.deleteDeal(deal.id).subscribe({
        next: () => {
          this.snackBar.open('Deal deleted successfully', 'Close', { duration: 3000 });
          this.loadDeals();
        },
        error: () => {
          this.snackBar.open('Error deleting deal', 'Close', { duration: 3000 });
        }
      });
    }
  }
}
