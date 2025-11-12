import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// Routing
import { AppRoutingModule } from './app-routing.module';

// Material
import { MaterialModule } from './shared/material.module';

// App Component
import { AppComponent } from './app.component';

// Guards
import { AuthGuard } from './core/guards/auth.guard';

// Interceptors
import { AuthInterceptor } from './core/interceptors/auth.interceptor';

// Services
import { AuthService } from './core/services/auth.service';
import { LeadService } from './core/services/lead.service';
import { DealService } from './core/services/deal.service';
import { NotificationService } from './core/services/notification.service';

// Auth Components
import { LoginComponent } from './features/auth/components/login.component';

// Dashboard Components
import { DashboardComponent } from './features/dashboard/components/dashboard.component';

// Lead Components
import { LeadListComponent } from './features/leads/components/lead-list.component';

// Deal Components
import { DealListComponent } from './features/deals/components/deal-list.component';

// Notification Components
import { NotificationListComponent } from './features/notifications/components/notification-list.component';

// Settings Components
import { SettingsComponent } from './features/settings/components/settings.component';

@NgModule({
  declarations: [
    // App
    AppComponent,

    // Auth
    LoginComponent,

    // Dashboard
    DashboardComponent,

    // Leads
    LeadListComponent,

    // Deals
    DealListComponent,

    // Notifications
    NotificationListComponent,

    // Settings
    SettingsComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    AppRoutingModule,
    MaterialModule
  ],
  providers: [
    // Guards
    AuthGuard,

    // Services
    AuthService,
    LeadService,
    DealService,
    NotificationService,

    // Interceptors
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
