import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { LeadService } from '../../../core/services/lead.service';
import { DealService } from '../../../core/services/deal.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';
import { Lead } from '../../../shared/models/lead.model';
import { Deal } from '../../../shared/models/deal.model';
import { Notification } from '../../../shared/models/notification.model';

interface DashboardStats {
  totalLeads: number;
  newLeads: number;
  qualifiedLeads: number;
  convertedLeads: number;
  totalDeals: number;
  activeDeals: number;
  totalPipelineValue: number;
  weightedPipelineValue: number;
  closedWonDeals: number;
  closedWonValue: number;
  unreadNotifications: number;
}

@Component({
  selector: 'app-dashboard',
  template: `
    <div class="dashboard-container">
      <div class="header">
        <h1>Dashboard</h1>
        <p class="greeting">Welcome back, {{ userName }}!</p>
      </div>

      <!-- Quick Stats Grid -->
      <div class="stats-grid">
        <!-- Leads Stats -->
        <mat-card class="stat-card leads-card">
          <mat-card-content>
            <div class="stat-header">
              <mat-icon class="stat-icon">contact_page</mat-icon>
              <span class="stat-label">Total Leads</span>
            </div>
            <div class="stat-value">{{ stats.totalLeads }}</div>
            <div class="stat-details">
              <span class="detail-item new">{{ stats.newLeads }} new</span>
              <span class="detail-item qualified">{{ stats.qualifiedLeads }} qualified</span>
              <span class="detail-item converted">{{ stats.convertedLeads }} converted</span>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Deals Stats -->
        <mat-card class="stat-card deals-card">
          <mat-card-content>
            <div class="stat-header">
              <mat-icon class="stat-icon">handshake</mat-icon>
              <span class="stat-label">Active Deals</span>
            </div>
            <div class="stat-value">{{ stats.activeDeals }}</div>
            <div class="stat-details">
              <span class="detail-item">{{ stats.totalDeals }} total</span>
              <span class="detail-item won">{{ stats.closedWonDeals }} won</span>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Pipeline Value -->
        <mat-card class="stat-card pipeline-card">
          <mat-card-content>
            <div class="stat-header">
              <mat-icon class="stat-icon">trending_up</mat-icon>
              <span class="stat-label">Pipeline Value</span>
            </div>
            <div class="stat-value">{{ stats.totalPipelineValue | currency:'USD':'symbol':'1.0-0' }}</div>
            <div class="stat-details">
              <span class="detail-item">Weighted: {{ stats.weightedPipelineValue | currency:'USD':'symbol':'1.0-0' }}</span>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Revenue -->
        <mat-card class="stat-card revenue-card">
          <mat-card-content>
            <div class="stat-header">
              <mat-icon class="stat-icon">attach_money</mat-icon>
              <span class="stat-label">Closed Won</span>
            </div>
            <div class="stat-value">{{ stats.closedWonValue | currency:'USD':'symbol':'1.0-0' }}</div>
            <div class="stat-details">
              <span class="detail-item">{{ stats.closedWonDeals }} deals</span>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <div class="content-grid">
        <!-- Recent Leads -->
        <mat-card class="content-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>contact_page</mat-icon>
              Recent Leads
            </mat-card-title>
            <button mat-button color="primary" routerLink="/leads">View All</button>
          </mat-card-header>
          <mat-card-content>
            <div *ngIf="recentLeads.length === 0" class="empty-state">
              <mat-icon>inbox</mat-icon>
              <p>No recent leads</p>
            </div>
            <div *ngIf="recentLeads.length > 0" class="list-container">
              <div
                *ngFor="let lead of recentLeads"
                class="list-item lead-item"
                (click)="navigateToLead(lead.id)">
                <div class="item-main">
                  <div class="item-title">
                    <strong>{{ lead.name }}</strong>
                    <mat-chip [class]="'status-' + lead.status" class="small-chip">
                      {{ lead.status | uppercase }}
                    </mat-chip>
                  </div>
                  <div class="item-subtitle">
                    {{ lead.email }}
                    <span *ngIf="lead.company"> • {{ lead.company }}</span>
                  </div>
                </div>
                <div class="item-actions">
                  <div class="score-badge" [class]="getScoreClass(lead.score)">
                    {{ lead.score }}
                  </div>
                  <mat-chip
                    *ngIf="lead.classification"
                    [class]="'classification-' + lead.classification.toLowerCase()"
                    class="small-chip">
                    {{ lead.classification }}
                  </mat-chip>
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Recent Deals -->
        <mat-card class="content-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>handshake</mat-icon>
              Recent Deals
            </mat-card-title>
            <button mat-button color="primary" routerLink="/deals">View All</button>
          </mat-card-header>
          <mat-card-content>
            <div *ngIf="recentDeals.length === 0" class="empty-state">
              <mat-icon>inbox</mat-icon>
              <p>No recent deals</p>
            </div>
            <div *ngIf="recentDeals.length > 0" class="list-container">
              <div
                *ngFor="let deal of recentDeals"
                class="list-item deal-item"
                (click)="navigateToDeal(deal.id)">
                <div class="item-main">
                  <div class="item-title">
                    <strong>{{ deal.title }}</strong>
                    <mat-chip [class]="'stage-' + deal.stage" class="small-chip">
                      {{ formatStage(deal.stage) }}
                    </mat-chip>
                  </div>
                  <div class="item-subtitle">
                    {{ deal.value | currency:deal.currency }} • {{ deal.probability }}% probability
                  </div>
                </div>
                <div class="item-actions">
                  <div class="deal-value">
                    {{ deal.value | currency:deal.currency:'symbol':'1.0-0' }}
                  </div>
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Recent Notifications -->
        <mat-card class="content-card notifications-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>notifications</mat-icon>
              Recent Notifications
              <span *ngIf="stats.unreadNotifications > 0" class="unread-badge">
                {{ stats.unreadNotifications }}
              </span>
            </mat-card-title>
            <button mat-button color="primary" routerLink="/notifications">View All</button>
          </mat-card-header>
          <mat-card-content>
            <div *ngIf="recentNotifications.length === 0" class="empty-state">
              <mat-icon>inbox</mat-icon>
              <p>No notifications</p>
            </div>
            <div *ngIf="recentNotifications.length > 0" class="list-container">
              <div
                *ngFor="let notification of recentNotifications"
                class="list-item notification-item"
                [class.unread]="!notification.read"
                (click)="markNotificationAsRead(notification)">
                <mat-icon [class]="'priority-' + notification.priority">
                  {{ getNotificationIcon(notification.type) }}
                </mat-icon>
                <div class="item-main">
                  <div class="item-title">
                    <strong>{{ notification.title }}</strong>
                  </div>
                  <div class="item-subtitle">
                    {{ notification.message }}
                  </div>
                  <div class="item-meta">
                    {{ notification.created_at | date:'short' }}
                  </div>
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Quick Actions -->
        <mat-card class="content-card quick-actions-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>bolt</mat-icon>
              Quick Actions
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="quick-actions">
              <button mat-raised-button color="primary" class="action-button" routerLink="/leads" [queryParams]="{action: 'create'}">
                <mat-icon>add</mat-icon>
                New Lead
              </button>
              <button mat-raised-button color="primary" class="action-button" routerLink="/deals" [queryParams]="{action: 'create'}">
                <mat-icon>add</mat-icon>
                New Deal
              </button>
              <button mat-raised-button class="action-button" routerLink="/contacts" [queryParams]="{action: 'create'}">
                <mat-icon>person_add</mat-icon>
                New Contact
              </button>
              <button mat-raised-button class="action-button" routerLink="/accounts" [queryParams]="{action: 'create'}">
                <mat-icon>business</mat-icon>
                New Account
              </button>
              <button mat-raised-button class="action-button" routerLink="/activities" [queryParams]="{action: 'create'}">
                <mat-icon>event</mat-icon>
                New Activity
              </button>
              <button mat-raised-button class="action-button" routerLink="/settings">
                <mat-icon>settings</mat-icon>
                Settings
              </button>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      max-width: 1600px;
      margin: 0 auto;
      padding: 24px;
    }

    .header {
      margin-bottom: 32px;
    }

    .header h1 {
      margin: 0 0 8px 0;
      font-size: 32px;
      font-weight: 600;
    }

    .greeting {
      margin: 0;
      font-size: 16px;
      color: rgba(0, 0, 0, 0.6);
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
      margin-bottom: 32px;
    }

    .stat-card {
      border-left: 4px solid;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .stat-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
    }

    .stat-card.leads-card { border-left-color: #2196F3; }
    .stat-card.deals-card { border-left-color: #9C27B0; }
    .stat-card.pipeline-card { border-left-color: #FF9800; }
    .stat-card.revenue-card { border-left-color: #4CAF50; }

    .stat-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }

    .stat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: rgba(0, 0, 0, 0.6);
    }

    .stat-label {
      font-size: 14px;
      font-weight: 500;
      color: rgba(0, 0, 0, 0.6);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .stat-value {
      font-size: 36px;
      font-weight: 700;
      margin-bottom: 12px;
      color: #1976d2;
    }

    .stat-details {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }

    .detail-item {
      font-size: 13px;
      color: rgba(0, 0, 0, 0.7);
    }

    .detail-item.new { color: #2196F3; font-weight: 500; }
    .detail-item.qualified { color: #4CAF50; font-weight: 500; }
    .detail-item.converted { color: #9C27B0; font-weight: 500; }
    .detail-item.won { color: #4CAF50; font-weight: 500; }

    /* Content Grid */
    .content-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 20px;
    }

    .content-card {
      height: fit-content;
    }

    .content-card mat-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .content-card mat-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 18px;
      font-weight: 600;
      margin: 0;
    }

    .content-card mat-card-title mat-icon {
      color: rgba(0, 0, 0, 0.6);
    }

    .unread-badge {
      background-color: #F44336;
      color: white;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      margin-left: 8px;
    }

    /* Empty State */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      color: rgba(0, 0, 0, 0.4);
    }

    .empty-state mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 8px;
    }

    .empty-state p {
      margin: 0;
      font-size: 14px;
    }

    /* List Items */
    .list-container {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .list-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      border-radius: 8px;
      background-color: #f5f5f5;
      cursor: pointer;
      transition: background-color 0.2s;
      gap: 16px;
    }

    .list-item:hover {
      background-color: #e0e0e0;
    }

    .list-item.unread {
      background-color: #e3f2fd;
      border-left: 3px solid #2196F3;
    }

    .item-main {
      flex: 1;
      min-width: 0;
    }

    .item-title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
      flex-wrap: wrap;
    }

    .item-title strong {
      font-size: 14px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .item-subtitle {
      font-size: 12px;
      color: rgba(0, 0, 0, 0.6);
    }

    .item-meta {
      font-size: 11px;
      color: rgba(0, 0, 0, 0.5);
      margin-top: 4px;
    }

    .item-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .score-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      font-weight: 600;
      font-size: 14px;
      color: white;
    }

    .score-badge.high { background-color: #4CAF50; }
    .score-badge.medium { background-color: #FF9800; }
    .score-badge.low { background-color: #F44336; }

    .deal-value {
      font-size: 16px;
      font-weight: 600;
      color: #2e7d32;
    }

    .notification-item mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .notification-item mat-icon.priority-high {
      color: #F44336;
    }

    .notification-item mat-icon.priority-medium {
      color: #FF9800;
    }

    .notification-item mat-icon.priority-low {
      color: #2196F3;
    }

    /* Chips */
    .small-chip {
      height: 20px;
      font-size: 11px;
      min-height: 0;
    }

    .status-new { background-color: #2196F3; color: white; }
    .status-contacted { background-color: #FF9800; color: white; }
    .status-qualified { background-color: #4CAF50; color: white; }
    .status-converted { background-color: #9C27B0; color: white; }
    .status-lost { background-color: #F44336; color: white; }

    .classification-hot { background-color: #F44336; color: white; }
    .classification-warm { background-color: #FF9800; color: white; }
    .classification-cold { background-color: #2196F3; color: white; }

    .stage-prospect { background-color: #2196F3; color: white; }
    .stage-qualification { background-color: #FF9800; color: white; }
    .stage-proposal { background-color: #FFC107; color: white; }
    .stage-negotiation { background-color: #9C27B0; color: white; }
    .stage-closed_won { background-color: #4CAF50; color: white; }
    .stage-closed_lost { background-color: #F44336; color: white; }

    /* Quick Actions */
    .quick-actions {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 12px;
    }

    .action-button {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 16px;
      height: auto;
    }

    .action-button mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    @media (max-width: 768px) {
      .stats-grid {
        grid-template-columns: 1fr;
      }

      .content-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class DashboardComponent implements OnInit {
  userName = '';
  stats: DashboardStats = {
    totalLeads: 0,
    newLeads: 0,
    qualifiedLeads: 0,
    convertedLeads: 0,
    totalDeals: 0,
    activeDeals: 0,
    totalPipelineValue: 0,
    weightedPipelineValue: 0,
    closedWonDeals: 0,
    closedWonValue: 0,
    unreadNotifications: 0
  };

  recentLeads: Lead[] = [];
  recentDeals: Deal[] = [];
  recentNotifications: Notification[] = [];

  constructor(
    private authService: AuthService,
    private leadService: LeadService,
    private dealService: DealService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadUserName();
    this.loadDashboardData();
  }

  loadUserName(): void {
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.userName = user.full_name;
      }
    });
  }

  loadDashboardData(): void {
    forkJoin({
      leads: this.leadService.getLeads({ limit: 100 }),
      deals: this.dealService.getDeals({ limit: 100 }),
      notifications: this.notificationService.getNotifications({ limit: 10 })
    }).subscribe({
      next: (data) => {
        this.processLeadsData(data.leads.leads);
        this.processDealsData(data.deals.deals);
        this.processNotificationsData(data.notifications.notifications);
      },
      error: (error) => {
        console.error('Error loading dashboard data:', error);
      }
    });
  }

  processLeadsData(leads: Lead[]): void {
    this.stats.totalLeads = leads.length;
    this.stats.newLeads = leads.filter(l => l.status === 'new').length;
    this.stats.qualifiedLeads = leads.filter(l => l.status === 'qualified').length;
    this.stats.convertedLeads = leads.filter(l => l.status === 'converted').length;

    // Get 5 most recent leads
    this.recentLeads = leads
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
  }

  processDealsData(deals: Deal[]): void {
    this.stats.totalDeals = deals.length;

    const activeDeals = deals.filter(d =>
      d.stage !== 'closed_won' && d.stage !== 'closed_lost'
    );
    this.stats.activeDeals = activeDeals.length;
    this.stats.totalPipelineValue = activeDeals.reduce((sum, d) => sum + d.value, 0);
    this.stats.weightedPipelineValue = activeDeals.reduce(
      (sum, d) => sum + (d.value * d.probability / 100),
      0
    );

    const closedWonDeals = deals.filter(d => d.stage === 'closed_won');
    this.stats.closedWonDeals = closedWonDeals.length;
    this.stats.closedWonValue = closedWonDeals.reduce((sum, d) => sum + d.value, 0);

    // Get 5 most recent deals
    this.recentDeals = deals
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
  }

  processNotificationsData(notifications: Notification[]): void {
    this.recentNotifications = notifications;
    this.stats.unreadNotifications = notifications.filter(n => !n.read).length;
  }

  getScoreClass(score: number): string {
    if (score >= 70) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  formatStage(stage: string): string {
    return stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  getNotificationIcon(type: string): string {
    const iconMap: Record<string, string> = {
      lead_created: 'contact_page',
      lead_qualified: 'verified',
      deal_created: 'handshake',
      deal_won: 'celebration',
      deal_lost: 'error',
      activity_reminder: 'alarm',
      email_received: 'mail',
      system: 'info'
    };
    return iconMap[type] || 'notifications';
  }

  navigateToLead(id: string): void {
    this.router.navigate(['/leads', id]);
  }

  navigateToDeal(id: string): void {
    this.router.navigate(['/deals', id]);
  }

  markNotificationAsRead(notification: Notification): void {
    if (!notification.read) {
      this.notificationService.markAsRead(notification.id).subscribe({
        next: () => {
          notification.read = true;
          this.stats.unreadNotifications--;
        },
        error: (error) => {
          console.error('Error marking notification as read:', error);
        }
      });
    }

    // Navigate to entity if available
    if (notification.entity_type && notification.entity_id) {
      const routeMap: Record<string, string> = {
        lead: '/leads',
        deal: '/deals',
        contact: '/contacts',
        account: '/accounts',
        activity: '/activities'
      };
      const route = routeMap[notification.entity_type];
      if (route) {
        this.router.navigate([route, notification.entity_id]);
      }
    }
  }
}
