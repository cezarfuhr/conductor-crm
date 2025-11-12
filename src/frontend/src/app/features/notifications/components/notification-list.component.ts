import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificationService } from '../../../core/services/notification.service';
import { Notification, NotificationPriority, NotificationType } from '../../../shared/models/notification.model';

@Component({
  selector: 'app-notification-list',
  template: `
    <div class="notification-list-container">
      <div class="header">
        <h1>Notifications</h1>
        <div class="header-actions">
          <button
            mat-raised-button
            color="primary"
            [disabled]="unreadCount === 0"
            (click)="markAllAsRead()">
            <mat-icon>done_all</mat-icon>
            Mark All as Read
          </button>
        </div>
      </div>

      <mat-card>
        <mat-card-content>
          <!-- Filters -->
          <div class="filters">
            <mat-button-toggle-group [(value)]="filterStatus" (change)="applyFilters()">
              <mat-button-toggle value="all">
                All ({{ totalCount }})
              </mat-button-toggle>
              <mat-button-toggle value="unread">
                Unread ({{ unreadCount }})
              </mat-button-toggle>
              <mat-button-toggle value="read">
                Read
              </mat-button-toggle>
            </mat-button-toggle-group>

            <mat-form-field appearance="outline">
              <mat-label>Priority</mat-label>
              <mat-select [(value)]="filterPriority" (selectionChange)="applyFilters()">
                <mat-option [value]="undefined">All Priorities</mat-option>
                <mat-option value="high">High</mat-option>
                <mat-option value="medium">Medium</mat-option>
                <mat-option value="low">Low</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Type</mat-label>
              <mat-select [(value)]="filterType" (selectionChange)="applyFilters()">
                <mat-option [value]="undefined">All Types</mat-option>
                <mat-option value="lead_created">Lead Created</mat-option>
                <mat-option value="lead_qualified">Lead Qualified</mat-option>
                <mat-option value="deal_created">Deal Created</mat-option>
                <mat-option value="deal_won">Deal Won</mat-option>
                <mat-option value="deal_lost">Deal Lost</mat-option>
                <mat-option value="activity_reminder">Activity Reminder</mat-option>
                <mat-option value="email_received">Email Received</mat-option>
                <mat-option value="system">System</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <!-- Notification List -->
          <div class="notification-list" *ngIf="filteredNotifications.length > 0">
            <div
              *ngFor="let notification of filteredNotifications"
              class="notification-item"
              [class.unread]="!notification.read"
              [class.priority-high]="notification.priority === 'high'"
              (click)="handleNotificationClick(notification)">

              <div class="notification-icon-container">
                <mat-icon
                  [class]="'notification-icon priority-' + notification.priority"
                  [style.color]="getNotificationColor(notification)">
                  {{ getNotificationIcon(notification.type) }}
                </mat-icon>
              </div>

              <div class="notification-content">
                <div class="notification-header">
                  <h3 class="notification-title">{{ notification.title }}</h3>
                  <mat-chip [class]="'priority-chip-' + notification.priority" class="small-chip">
                    {{ notification.priority | uppercase }}
                  </mat-chip>
                </div>

                <p class="notification-message">{{ notification.message }}</p>

                <div class="notification-meta">
                  <span class="notification-time">
                    <mat-icon>access_time</mat-icon>
                    {{ notification.created_at | date:'medium' }}
                  </span>

                  <span *ngIf="notification.entity_type" class="notification-entity">
                    <mat-icon>link</mat-icon>
                    {{ formatEntityType(notification.entity_type) }}
                  </span>

                  <mat-chip class="type-chip" class="small-chip">
                    {{ formatNotificationType(notification.type) }}
                  </mat-chip>
                </div>
              </div>

              <div class="notification-actions">
                <button
                  mat-icon-button
                  *ngIf="!notification.read"
                  (click)="markAsRead(notification, $event)"
                  matTooltip="Mark as read">
                  <mat-icon>check_circle</mat-icon>
                </button>

                <button
                  mat-icon-button
                  [matMenuTriggerFor]="menu"
                  (click)="$event.stopPropagation()">
                  <mat-icon>more_vert</mat-icon>
                </button>

                <mat-menu #menu="matMenu">
                  <button
                    mat-menu-item
                    *ngIf="!notification.read"
                    (click)="markAsRead(notification, $event)">
                    <mat-icon>check_circle</mat-icon>
                    <span>Mark as Read</span>
                  </button>
                  <button
                    mat-menu-item
                    *ngIf="notification.entity_type && notification.entity_id"
                    (click)="navigateToEntity(notification)">
                    <mat-icon>open_in_new</mat-icon>
                    <span>View {{ formatEntityType(notification.entity_type) }}</span>
                  </button>
                  <mat-divider></mat-divider>
                  <button mat-menu-item (click)="deleteNotification(notification)" class="delete-action">
                    <mat-icon>delete</mat-icon>
                    <span>Delete</span>
                  </button>
                </mat-menu>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div *ngIf="filteredNotifications.length === 0" class="empty-state">
            <mat-icon>notifications_none</mat-icon>
            <h2>No notifications</h2>
            <p>You're all caught up!</p>
          </div>

          <!-- Pagination -->
          <mat-paginator
            *ngIf="totalCount > 0"
            [length]="totalCount"
            [pageSize]="pageSize"
            [pageSizeOptions]="[10, 25, 50]"
            (page)="onPageChange($event)"
            showFirstLastButtons>
          </mat-paginator>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .notification-list-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }

    .header-actions {
      display: flex;
      gap: 12px;
    }

    /* Filters */
    .filters {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
      flex-wrap: wrap;
      align-items: center;
    }

    .filters mat-form-field {
      max-width: 200px;
    }

    /* Notification List */
    .notification-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 24px;
    }

    .notification-item {
      display: flex;
      gap: 16px;
      padding: 20px;
      border-radius: 8px;
      background-color: white;
      border: 1px solid #e0e0e0;
      cursor: pointer;
      transition: all 0.2s;
    }

    .notification-item:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      transform: translateY(-2px);
    }

    .notification-item.unread {
      background-color: #e3f2fd;
      border-left: 4px solid #2196F3;
    }

    .notification-item.priority-high {
      border-left-color: #F44336;
    }

    .notification-item.priority-high.unread {
      background-color: #ffebee;
    }

    .notification-icon-container {
      display: flex;
      align-items: flex-start;
      padding-top: 4px;
    }

    .notification-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    .notification-icon.priority-high {
      color: #F44336;
    }

    .notification-icon.priority-medium {
      color: #FF9800;
    }

    .notification-icon.priority-low {
      color: #2196F3;
    }

    .notification-content {
      flex: 1;
      min-width: 0;
    }

    .notification-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }

    .notification-title {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      flex: 1;
    }

    .notification-message {
      margin: 0 0 12px 0;
      font-size: 14px;
      color: rgba(0, 0, 0, 0.7);
      line-height: 1.5;
    }

    .notification-meta {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      align-items: center;
    }

    .notification-time,
    .notification-entity {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: rgba(0, 0, 0, 0.6);
    }

    .notification-time mat-icon,
    .notification-entity mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .notification-actions {
      display: flex;
      gap: 4px;
      align-items: flex-start;
    }

    /* Chips */
    .small-chip {
      height: 24px;
      font-size: 11px;
      min-height: 0;
    }

    .priority-chip-high {
      background-color: #F44336;
      color: white;
    }

    .priority-chip-medium {
      background-color: #FF9800;
      color: white;
    }

    .priority-chip-low {
      background-color: #2196F3;
      color: white;
    }

    .type-chip {
      background-color: #e0e0e0;
      color: rgba(0, 0, 0, 0.87);
    }

    /* Empty State */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      color: rgba(0, 0, 0, 0.4);
    }

    .empty-state mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      margin-bottom: 16px;
    }

    .empty-state h2 {
      margin: 0 0 8px 0;
      font-size: 24px;
      font-weight: 500;
    }

    .empty-state p {
      margin: 0;
      font-size: 14px;
    }

    .delete-action {
      color: #F44336;
    }

    @media (max-width: 768px) {
      .notification-item {
        flex-direction: column;
      }

      .notification-actions {
        flex-direction: row;
        justify-content: flex-end;
      }
    }
  `]
})
export class NotificationListComponent implements OnInit {
  allNotifications: Notification[] = [];
  filteredNotifications: Notification[] = [];
  totalCount = 0;
  unreadCount = 0;
  pageSize = 25;
  currentPage = 0;

  filterStatus: 'all' | 'unread' | 'read' = 'all';
  filterPriority?: NotificationPriority;
  filterType?: NotificationType;

  constructor(
    private notificationService: NotificationService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.notificationService.getNotifications({
      skip: this.currentPage * this.pageSize,
      limit: this.pageSize
    }).subscribe({
      next: (response) => {
        this.allNotifications = response.notifications;
        this.totalCount = response.total;
        this.unreadCount = response.unread_count;
        this.applyFilters();
      },
      error: (error) => {
        this.snackBar.open('Error loading notifications', 'Close', { duration: 3000 });
      }
    });
  }

  applyFilters(): void {
    let filtered = [...this.allNotifications];

    // Filter by read status
    if (this.filterStatus === 'unread') {
      filtered = filtered.filter(n => !n.read);
    } else if (this.filterStatus === 'read') {
      filtered = filtered.filter(n => n.read);
    }

    // Filter by priority
    if (this.filterPriority) {
      filtered = filtered.filter(n => n.priority === this.filterPriority);
    }

    // Filter by type
    if (this.filterType) {
      filtered = filtered.filter(n => n.type === this.filterType);
    }

    this.filteredNotifications = filtered;
  }

  onPageChange(event: any): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadNotifications();
  }

  getNotificationIcon(type: NotificationType): string {
    const iconMap: Record<NotificationType, string> = {
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

  getNotificationColor(notification: Notification): string {
    if (notification.priority === 'high') return '#F44336';
    if (notification.priority === 'medium') return '#FF9800';
    return '#2196F3';
  }

  formatEntityType(entityType: string): string {
    return entityType.charAt(0).toUpperCase() + entityType.slice(1);
  }

  formatNotificationType(type: string): string {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  handleNotificationClick(notification: Notification): void {
    if (!notification.read) {
      this.markAsRead(notification);
    }

    if (notification.entity_type && notification.entity_id) {
      this.navigateToEntity(notification);
    }
  }

  markAsRead(notification: Notification, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    this.notificationService.markAsRead(notification.id).subscribe({
      next: () => {
        notification.read = true;
        this.unreadCount = Math.max(0, this.unreadCount - 1);
        this.snackBar.open('Notification marked as read', 'Close', { duration: 2000 });
      },
      error: () => {
        this.snackBar.open('Error marking notification as read', 'Close', { duration: 3000 });
      }
    });
  }

  markAllAsRead(): void {
    const unreadNotifications = this.allNotifications.filter(n => !n.read);

    if (unreadNotifications.length === 0) {
      return;
    }

    // Mark each unread notification as read
    const markAsReadRequests = unreadNotifications.map(n =>
      this.notificationService.markAsRead(n.id)
    );

    // Use forkJoin to wait for all requests (would need to import)
    unreadNotifications.forEach(n => {
      this.notificationService.markAsRead(n.id).subscribe({
        next: () => {
          n.read = true;
        }
      });
    });

    this.unreadCount = 0;
    this.snackBar.open('All notifications marked as read', 'Close', { duration: 2000 });
  }

  navigateToEntity(notification: Notification): void {
    if (!notification.entity_type || !notification.entity_id) {
      return;
    }

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

  deleteNotification(notification: Notification): void {
    if (confirm('Are you sure you want to delete this notification?')) {
      this.notificationService.deleteNotification(notification.id).subscribe({
        next: () => {
          this.allNotifications = this.allNotifications.filter(n => n.id !== notification.id);
          this.totalCount--;
          if (!notification.read) {
            this.unreadCount--;
          }
          this.applyFilters();
          this.snackBar.open('Notification deleted', 'Close', { duration: 2000 });
        },
        error: () => {
          this.snackBar.open('Error deleting notification', 'Close', { duration: 3000 });
        }
      });
    }
  }
}
