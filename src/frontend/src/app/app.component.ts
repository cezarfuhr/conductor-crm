import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { NotificationService } from './core/services/notification.service';
import { Observable } from 'rxjs';
import { User } from './shared/models/user.model';

@Component({
  selector: 'app-root',
  template: `
    <div class="app-container">
      <mat-toolbar color="primary" class="app-toolbar" *ngIf="isAuthenticated">
        <button mat-icon-button (click)="drawer.toggle()">
          <mat-icon>menu</mat-icon>
        </button>
        <span class="app-title">Conductor CRM</span>
        <span class="spacer"></span>

        <button mat-icon-button [matMenuTriggerFor]="notificationMenu" [matBadge]="(unreadCount$ | async) || 0" matBadgeColor="warn">
          <mat-icon>notifications</mat-icon>
        </button>
        <mat-menu #notificationMenu="matMenu">
          <button mat-menu-item routerLink="/notifications">
            <mat-icon>list</mat-icon>
            <span>View All Notifications</span>
          </button>
          <button mat-menu-item (click)="markAllAsRead()">
            <mat-icon>done_all</mat-icon>
            <span>Mark All as Read</span>
          </button>
        </mat-menu>

        <button mat-icon-button [matMenuTriggerFor]="userMenu">
          <mat-icon>account_circle</mat-icon>
        </button>
        <mat-menu #userMenu="matMenu">
          <div class="user-info" mat-menu-item disabled>
            <div class="user-name">{{ (currentUser$ | async)?.full_name }}</div>
            <div class="user-email">{{ (currentUser$ | async)?.email }}</div>
          </div>
          <mat-divider></mat-divider>
          <button mat-menu-item routerLink="/settings">
            <mat-icon>settings</mat-icon>
            <span>Settings</span>
          </button>
          <button mat-menu-item (click)="logout()">
            <mat-icon>exit_to_app</mat-icon>
            <span>Logout</span>
          </button>
        </mat-menu>
      </mat-toolbar>

      <mat-sidenav-container class="app-sidenav-container" [hasBackdrop]="false">
        <mat-sidenav #drawer [mode]="'side'" [opened]="isAuthenticated" class="app-sidenav" *ngIf="isAuthenticated">
          <mat-nav-list>
            <a mat-list-item routerLink="/dashboard" routerLinkActive="active">
              <mat-icon matListItemIcon>dashboard</mat-icon>
              <span matListItemTitle>Dashboard</span>
            </a>
            <a mat-list-item routerLink="/leads" routerLinkActive="active">
              <mat-icon matListItemIcon>person_search</mat-icon>
              <span matListItemTitle>Leads</span>
            </a>
            <a mat-list-item routerLink="/deals" routerLinkActive="active">
              <mat-icon matListItemIcon>handshake</mat-icon>
              <span matListItemTitle>Deals</span>
            </a>
            <mat-divider></mat-divider>
            <a mat-list-item routerLink="/notifications" routerLinkActive="active">
              <mat-icon matListItemIcon [matBadge]="(unreadCount$ | async) || 0" matBadgeColor="warn" matBadgeSize="small">notifications</mat-icon>
              <span matListItemTitle>Notifications</span>
            </a>
            <a mat-list-item routerLink="/settings" routerLinkActive="active">
              <mat-icon matListItemIcon>settings</mat-icon>
              <span matListItemTitle>Settings</span>
            </a>
          </mat-nav-list>
        </mat-sidenav>

        <mat-sidenav-content class="app-content">
          <router-outlet></router-outlet>
        </mat-sidenav-content>
      </mat-sidenav-container>
    </div>
  `,
  styles: [`
    .app-container {
      height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .app-toolbar {
      position: sticky;
      top: 0;
      z-index: 2;
    }

    .app-title {
      font-size: 20px;
      font-weight: 500;
    }

    .spacer {
      flex: 1 1 auto;
    }

    .app-sidenav-container {
      flex: 1;
      overflow: hidden;
    }

    .app-sidenav {
      width: 250px;
    }

    .app-content {
      padding: 20px;
      overflow: auto;
    }

    .user-info {
      padding: 16px;
      cursor: default !important;
    }

    .user-name {
      font-weight: 500;
      font-size: 16px;
    }

    .user-email {
      font-size: 14px;
      color: rgba(0,0,0,0.6);
    }

    .active {
      background-color: rgba(0,0,0,0.04);
    }

    ::ng-deep .mat-badge-content {
      right: -4px !important;
      top: -4px !important;
    }
  `]
})
export class AppComponent implements OnInit {
  currentUser$: Observable<User | null>;
  unreadCount$: Observable<number>;
  isAuthenticated = false;

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService,
    private router: Router
  ) {
    this.currentUser$ = this.authService.currentUser$;
    this.unreadCount$ = this.notificationService.unreadCount$;
  }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.isAuthenticated = !!user;
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe();
  }
}
