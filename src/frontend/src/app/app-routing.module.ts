import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

// Components
import { LoginComponent } from './features/auth/components/login.component';
import { DashboardComponent } from './features/dashboard/components/dashboard.component';
import { LeadListComponent } from './features/leads/components/lead-list.component';
import { DealListComponent } from './features/deals/components/deal-list.component';
import { NotificationListComponent } from './features/notifications/components/notification-list.component';
import { SettingsComponent } from './features/settings/components/settings.component';

const routes: Routes = [
  // Public routes
  {
    path: 'login',
    component: LoginComponent
  },

  // Protected routes
  {
    path: '',
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        redirectTo: '/dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        component: DashboardComponent
      },
      {
        path: 'leads',
        component: LeadListComponent
      },
      {
        path: 'leads/:id',
        component: LeadListComponent // TODO: Replace with LeadDetailComponent
      },
      {
        path: 'deals',
        component: DealListComponent
      },
      {
        path: 'deals/:id',
        component: DealListComponent // TODO: Replace with DealDetailComponent
      },
      {
        path: 'contacts',
        component: DashboardComponent // TODO: Create ContactListComponent
      },
      {
        path: 'contacts/:id',
        component: DashboardComponent // TODO: Create ContactDetailComponent
      },
      {
        path: 'accounts',
        component: DashboardComponent // TODO: Create AccountListComponent
      },
      {
        path: 'accounts/:id',
        component: DashboardComponent // TODO: Create AccountDetailComponent
      },
      {
        path: 'activities',
        component: DashboardComponent // TODO: Create ActivityListComponent
      },
      {
        path: 'activities/:id',
        component: DashboardComponent // TODO: Create ActivityDetailComponent
      },
      {
        path: 'notifications',
        component: NotificationListComponent
      },
      {
        path: 'settings',
        component: SettingsComponent
      }
    ]
  },

  // Wildcard route - redirect to dashboard
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
