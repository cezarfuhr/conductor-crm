import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LeadService } from '../../../core/services/lead.service';
import { Lead, LeadStatus } from '../../../shared/models/lead.model';

@Component({
  selector: 'app-lead-list',
  template: `
    <div class="lead-list-container">
      <div class="header">
        <h1>Leads</h1>
        <button mat-raised-button color="primary" (click)="openCreateDialog()">
          <mat-icon>add</mat-icon>
          New Lead
        </button>
      </div>

      <mat-card>
        <mat-card-content>
          <!-- Filters -->
          <div class="filters">
            <mat-form-field appearance="outline">
              <mat-label>Search</mat-label>
              <input matInput (keyup)="applyFilter($event)" placeholder="Search leads...">
              <mat-icon matSuffix>search</mat-icon>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Status</mat-label>
              <mat-select [(value)]="selectedStatus" (selectionChange)="loadLeads()">
                <mat-option [value]="undefined">All</mat-option>
                <mat-option value="new">New</mat-option>
                <mat-option value="contacted">Contacted</mat-option>
                <mat-option value="qualified">Qualified</mat-option>
                <mat-option value="converted">Converted</mat-option>
                <mat-option value="lost">Lost</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <!-- Table -->
          <div class="table-container">
            <table mat-table [dataSource]="dataSource" class="leads-table" matSort>
              <!-- Name Column -->
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Name</th>
                <td mat-cell *matCellDef="let lead">
                  <div class="lead-name">
                    <strong>{{ lead.name }}</strong>
                    <small>{{ lead.company }}</small>
                  </div>
                </td>
              </ng-container>

              <!-- Email Column -->
              <ng-container matColumnDef="email">
                <th mat-header-cell *matHeaderCellDef>Email</th>
                <td mat-cell *matCellDef="let lead">{{ lead.email }}</td>
              </ng-container>

              <!-- Status Column -->
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let lead">
                  <mat-chip [class]="'status-' + lead.status">
                    {{ lead.status | uppercase }}
                  </mat-chip>
                </td>
              </ng-container>

              <!-- Score Column -->
              <ng-container matColumnDef="score">
                <th mat-header-cell *matHeaderCellDef>Score</th>
                <td mat-cell *matCellDef="let lead">
                  <div class="score-container">
                    <mat-progress-bar mode="determinate" [value]="lead.score" [class]="getScoreClass(lead.score)"></mat-progress-bar>
                    <span>{{ lead.score }}/100</span>
                  </div>
                </td>
              </ng-container>

              <!-- Classification Column -->
              <ng-container matColumnDef="classification">
                <th mat-header-cell *matHeaderCellDef>Classification</th>
                <td mat-cell *matCellDef="let lead">
                  <mat-chip *ngIf="lead.classification" [class]="'classification-' + lead.classification.toLowerCase()">
                    {{ lead.classification }}
                  </mat-chip>
                  <span *ngIf="!lead.classification" class="not-qualified">Not qualified</span>
                </td>
              </ng-container>

              <!-- Actions Column -->
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Actions</th>
                <td mat-cell *matCellDef="let lead">
                  <button mat-icon-button [matMenuTriggerFor]="menu">
                    <mat-icon>more_vert</mat-icon>
                  </button>
                  <mat-menu #menu="matMenu">
                    <button mat-menu-item (click)="viewLead(lead)">
                      <mat-icon>visibility</mat-icon>
                      <span>View</span>
                    </button>
                    <button mat-menu-item (click)="editLead(lead)">
                      <mat-icon>edit</mat-icon>
                      <span>Edit</span>
                    </button>
                    <button mat-menu-item (click)="qualifyLead(lead)">
                      <mat-icon>psychology</mat-icon>
                      <span>AI Qualify</span>
                    </button>
                    <mat-divider></mat-divider>
                    <button mat-menu-item (click)="deleteLead(lead)" class="delete-action">
                      <mat-icon>delete</mat-icon>
                      <span>Delete</span>
                    </button>
                  </mat-menu>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>
          </div>

          <mat-paginator
            [length]="totalCount"
            [pageSize]="pageSize"
            [pageSizeOptions]="[10, 25, 50, 100]"
            (page)="onPageChange($event)"
            showFirstLastButtons>
          </mat-paginator>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .lead-list-container {
      max-width: 1400px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .filters {
      display: flex;
      gap: 16px;
      margin-bottom: 20px;
    }

    .filters mat-form-field {
      flex: 1;
      max-width: 300px;
    }

    .table-container {
      overflow-x: auto;
    }

    .leads-table {
      width: 100%;
    }

    .lead-name {
      display: flex;
      flex-direction: column;
    }

    .lead-name small {
      color: rgba(0,0,0,0.6);
      font-size: 12px;
    }

    .score-container {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 100px;
    }

    .score-container span {
      font-size: 12px;
      color: rgba(0,0,0,0.6);
    }

    .status-new { background-color: #2196F3; color: white; }
    .status-contacted { background-color: #FF9800; color: white; }
    .status-qualified { background-color: #4CAF50; color: white; }
    .status-converted { background-color: #9C27B0; color: white; }
    .status-lost { background-color: #F44336; color: white; }

    .classification-hot { background-color: #F44336; color: white; }
    .classification-warm { background-color: #FF9800; color: white; }
    .classification-cold { background-color: #2196F3; color: white; }

    .not-qualified {
      color: rgba(0,0,0,0.4);
      font-size: 12px;
    }

    mat-progress-bar {
      height: 8px;
      border-radius: 4px;
    }

    mat-progress-bar.high ::ng-deep .mdc-linear-progress__bar-inner {
      border-color: #4CAF50 !important;
    }

    mat-progress-bar.medium ::ng-deep .mdc-linear-progress__bar-inner {
      border-color: #FF9800 !important;
    }

    mat-progress-bar.low ::ng-deep .mdc-linear-progress__bar-inner {
      border-color: #F44336 !important;
    }

    .delete-action {
      color: #F44336;
    }
  `]
})
export class LeadListComponent implements OnInit {
  displayedColumns: string[] = ['name', 'email', 'status', 'score', 'classification', 'actions'];
  dataSource = new MatTableDataSource<Lead>([]);
  totalCount = 0;
  pageSize = 25;
  currentPage = 0;
  selectedStatus?: LeadStatus;
  searchTerm = '';

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private leadService: LeadService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadLeads();
  }

  loadLeads(): void {
    this.leadService.getLeads({
      skip: this.currentPage * this.pageSize,
      limit: this.pageSize,
      status: this.selectedStatus,
      search: this.searchTerm || undefined
    }).subscribe({
      next: (response) => {
        this.dataSource.data = response.leads;
        this.totalCount = response.total;
      },
      error: (error) => {
        this.snackBar.open('Error loading leads', 'Close', { duration: 3000 });
      }
    });
  }

  applyFilter(event: Event): void {
    this.searchTerm = (event.target as HTMLInputElement).value.trim();
    this.currentPage = 0;
    this.loadLeads();
  }

  onPageChange(event: any): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadLeads();
  }

  getScoreClass(score: number): string {
    if (score >= 70) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  openCreateDialog(): void {
    // TODO: Implement create dialog
    this.snackBar.open('Create dialog not implemented yet', 'Close', { duration: 3000 });
  }

  viewLead(lead: Lead): void {
    // TODO: Navigate to lead detail
    console.log('View lead:', lead);
  }

  editLead(lead: Lead): void {
    // TODO: Implement edit dialog
    this.snackBar.open('Edit dialog not implemented yet', 'Close', { duration: 3000 });
  }

  qualifyLead(lead: Lead): void {
    this.snackBar.open('Qualifying lead with AI...', '', { duration: 2000 });
    this.leadService.qualifyLead(lead.id).subscribe({
      next: (result) => {
        this.snackBar.open(`Lead qualified as ${result.classification} with score ${result.score}`, 'Close', { duration: 5000 });
        this.loadLeads();
      },
      error: (error) => {
        const message = error.status === 503
          ? 'AI service is being migrated. Feature temporarily unavailable.'
          : 'Error qualifying lead';
        this.snackBar.open(message, 'Close', { duration: 5000 });
      }
    });
  }

  deleteLead(lead: Lead): void {
    if (confirm(`Are you sure you want to delete ${lead.name}?`)) {
      this.leadService.deleteLead(lead.id).subscribe({
        next: () => {
          this.snackBar.open('Lead deleted successfully', 'Close', { duration: 3000 });
          this.loadLeads();
        },
        error: () => {
          this.snackBar.open('Error deleting lead', 'Close', { duration: 3000 });
        }
      });
    }
  }
}
