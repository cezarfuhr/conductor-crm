import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../shared/models/user.model';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-settings',
  template: `
    <div class="settings-container">
      <div class="header">
        <h1>Settings</h1>
      </div>

      <mat-tab-group>
        <!-- Profile Tab -->
        <mat-tab label="Profile">
          <div class="tab-content">
            <mat-card>
              <mat-card-header>
                <mat-card-title>Profile Information</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <form [formGroup]="profileForm" (ngSubmit)="updateProfile()">
                  <div class="form-grid">
                    <mat-form-field appearance="outline">
                      <mat-label>Full Name</mat-label>
                      <input matInput formControlName="full_name" required>
                      <mat-icon matPrefix>person</mat-icon>
                      <mat-error *ngIf="profileForm.get('full_name')?.hasError('required')">
                        Full name is required
                      </mat-error>
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>Email</mat-label>
                      <input matInput type="email" formControlName="email" required>
                      <mat-icon matPrefix>email</mat-icon>
                      <mat-error *ngIf="profileForm.get('email')?.hasError('required')">
                        Email is required
                      </mat-error>
                      <mat-error *ngIf="profileForm.get('email')?.hasError('email')">
                        Invalid email address
                      </mat-error>
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>Company</mat-label>
                      <input matInput formControlName="company">
                      <mat-icon matPrefix>business</mat-icon>
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>Phone</mat-label>
                      <input matInput type="tel" formControlName="phone">
                      <mat-icon matPrefix>phone</mat-icon>
                    </mat-form-field>
                  </div>

                  <div class="form-actions">
                    <button mat-raised-button color="primary" type="submit" [disabled]="!profileForm.valid || profileForm.pristine">
                      <mat-icon>save</mat-icon>
                      Save Changes
                    </button>
                    <button mat-button type="button" (click)="resetProfileForm()">
                      Cancel
                    </button>
                  </div>
                </form>
              </mat-card-content>
            </mat-card>

            <!-- Change Password -->
            <mat-card>
              <mat-card-header>
                <mat-card-title>Change Password</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <form [formGroup]="passwordForm" (ngSubmit)="changePassword()">
                  <div class="form-grid">
                    <mat-form-field appearance="outline">
                      <mat-label>Current Password</mat-label>
                      <input matInput [type]="hideCurrentPassword ? 'password' : 'text'" formControlName="current_password" required>
                      <mat-icon matPrefix>lock</mat-icon>
                      <button mat-icon-button matSuffix type="button" (click)="hideCurrentPassword = !hideCurrentPassword">
                        <mat-icon>{{ hideCurrentPassword ? 'visibility' : 'visibility_off' }}</mat-icon>
                      </button>
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>New Password</mat-label>
                      <input matInput [type]="hideNewPassword ? 'password' : 'text'" formControlName="new_password" required>
                      <mat-icon matPrefix>lock</mat-icon>
                      <button mat-icon-button matSuffix type="button" (click)="hideNewPassword = !hideNewPassword">
                        <mat-icon>{{ hideNewPassword ? 'visibility' : 'visibility_off' }}</mat-icon>
                      </button>
                      <mat-error *ngIf="passwordForm.get('new_password')?.hasError('minlength')">
                        Password must be at least 8 characters
                      </mat-error>
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>Confirm New Password</mat-label>
                      <input matInput [type]="hideConfirmPassword ? 'password' : 'text'" formControlName="confirm_password" required>
                      <mat-icon matPrefix>lock</mat-icon>
                      <button mat-icon-button matSuffix type="button" (click)="hideConfirmPassword = !hideConfirmPassword">
                        <mat-icon>{{ hideConfirmPassword ? 'visibility' : 'visibility_off' }}</mat-icon>
                      </button>
                      <mat-error *ngIf="passwordForm.get('confirm_password')?.hasError('passwordMismatch')">
                        Passwords do not match
                      </mat-error>
                    </mat-form-field>
                  </div>

                  <div class="form-actions">
                    <button mat-raised-button color="primary" type="submit" [disabled]="!passwordForm.valid">
                      <mat-icon>lock_reset</mat-icon>
                      Change Password
                    </button>
                    <button mat-button type="button" (click)="resetPasswordForm()">
                      Cancel
                    </button>
                  </div>
                </form>
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>

        <!-- Integrations Tab -->
        <mat-tab label="Integrations">
          <div class="tab-content">
            <mat-card>
              <mat-card-header>
                <mat-card-title>Google Calendar</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="integration-section">
                  <div class="integration-info">
                    <mat-icon class="integration-icon">event</mat-icon>
                    <div>
                      <h3>Connect Google Calendar</h3>
                      <p>Sync your activities and meetings with Google Calendar</p>
                    </div>
                  </div>

                  <div *ngIf="!currentUser?.google_connected" class="integration-status disconnected">
                    <mat-icon>error_outline</mat-icon>
                    <span>Not connected</span>
                  </div>

                  <div *ngIf="currentUser?.google_connected" class="integration-status connected">
                    <mat-icon>check_circle</mat-icon>
                    <span>Connected</span>
                  </div>

                  <div class="integration-actions">
                    <button
                      *ngIf="!currentUser?.google_connected"
                      mat-raised-button
                      color="primary"
                      (click)="connectGoogleCalendar()">
                      <mat-icon>add_link</mat-icon>
                      Connect
                    </button>

                    <button
                      *ngIf="currentUser?.google_connected"
                      mat-raised-button
                      color="warn"
                      (click)="disconnectGoogleCalendar()">
                      <mat-icon>link_off</mat-icon>
                      Disconnect
                    </button>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>

            <!-- Future: Email Integration -->
            <mat-card>
              <mat-card-header>
                <mat-card-title>Email Integration</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="integration-section">
                  <div class="integration-info">
                    <mat-icon class="integration-icon">mail</mat-icon>
                    <div>
                      <h3>Connect Email</h3>
                      <p>Sync emails with leads and deals</p>
                    </div>
                  </div>

                  <mat-chip class="coming-soon-chip">Coming Soon</mat-chip>
                </div>
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>

        <!-- Preferences Tab -->
        <mat-tab label="Preferences">
          <div class="tab-content">
            <mat-card>
              <mat-card-header>
                <mat-card-title>Notification Preferences</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <form [formGroup]="preferencesForm">
                  <div class="preference-section">
                    <h3>Email Notifications</h3>
                    <mat-checkbox formControlName="email_lead_notifications">
                      Lead updates and qualifications
                    </mat-checkbox>
                    <mat-checkbox formControlName="email_deal_notifications">
                      Deal progress and predictions
                    </mat-checkbox>
                    <mat-checkbox formControlName="email_activity_reminders">
                      Activity reminders
                    </mat-checkbox>
                  </div>

                  <mat-divider></mat-divider>

                  <div class="preference-section">
                    <h3>In-App Notifications</h3>
                    <mat-checkbox formControlName="app_notifications">
                      Enable in-app notifications
                    </mat-checkbox>
                    <mat-checkbox formControlName="notification_sound">
                      Play sound for notifications
                    </mat-checkbox>
                  </div>

                  <mat-divider></mat-divider>

                  <div class="preference-section">
                    <h3>Display Settings</h3>
                    <mat-form-field appearance="outline">
                      <mat-label>Items per page</mat-label>
                      <mat-select formControlName="items_per_page">
                        <mat-option [value]="10">10</mat-option>
                        <mat-option [value]="25">25</mat-option>
                        <mat-option [value]="50">50</mat-option>
                        <mat-option [value]="100">100</mat-option>
                      </mat-select>
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>Default currency</mat-label>
                      <mat-select formControlName="default_currency">
                        <mat-option value="USD">USD ($)</mat-option>
                        <mat-option value="EUR">EUR (€)</mat-option>
                        <mat-option value="GBP">GBP (£)</mat-option>
                        <mat-option value="BRL">BRL (R$)</mat-option>
                      </mat-select>
                    </mat-form-field>
                  </div>

                  <div class="form-actions">
                    <button mat-raised-button color="primary" (click)="savePreferences()" [disabled]="!preferencesForm.dirty">
                      <mat-icon>save</mat-icon>
                      Save Preferences
                    </button>
                  </div>
                </form>
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>

        <!-- Danger Zone Tab -->
        <mat-tab label="Account">
          <div class="tab-content">
            <mat-card>
              <mat-card-header>
                <mat-card-title>Account Information</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="info-section">
                  <div class="info-row">
                    <span class="info-label">Account Created:</span>
                    <span class="info-value">{{ currentUser?.created_at | date:'medium' }}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Last Updated:</span>
                    <span class="info-value">{{ currentUser?.updated_at | date:'medium' }}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Account Status:</span>
                    <mat-chip [class]="currentUser?.is_active ? 'status-active' : 'status-inactive'">
                      {{ currentUser?.is_active ? 'Active' : 'Inactive' }}
                    </mat-chip>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>

            <mat-card class="danger-zone">
              <mat-card-header>
                <mat-card-title>
                  <mat-icon>warning</mat-icon>
                  Danger Zone
                </mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="danger-actions">
                  <div class="danger-action">
                    <div>
                      <h3>Delete Account</h3>
                      <p>Permanently delete your account and all associated data. This action cannot be undone.</p>
                    </div>
                    <button mat-raised-button color="warn" (click)="deleteAccount()">
                      <mat-icon>delete_forever</mat-icon>
                      Delete Account
                    </button>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [`
    .settings-container {
      max-width: 1000px;
      margin: 0 auto;
      padding: 24px;
    }

    .header {
      margin-bottom: 24px;
    }

    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }

    .tab-content {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    mat-card {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    mat-card-header {
      margin-bottom: 24px;
    }

    mat-card-title {
      font-size: 20px;
      font-weight: 600;
    }

    /* Forms */
    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    mat-form-field {
      width: 100%;
    }

    .form-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }

    /* Integration Section */
    .integration-section {
      display: flex;
      align-items: center;
      gap: 24px;
      padding: 16px;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
    }

    .integration-info {
      display: flex;
      align-items: center;
      gap: 16px;
      flex: 1;
    }

    .integration-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #1976d2;
    }

    .integration-info h3 {
      margin: 0 0 4px 0;
      font-size: 16px;
      font-weight: 600;
    }

    .integration-info p {
      margin: 0;
      font-size: 14px;
      color: rgba(0, 0, 0, 0.6);
    }

    .integration-status {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: 500;
    }

    .integration-status.connected {
      background-color: #e8f5e9;
      color: #2e7d32;
    }

    .integration-status.disconnected {
      background-color: #ffebee;
      color: #c62828;
    }

    .integration-status mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .integration-actions {
      display: flex;
      gap: 12px;
    }

    .coming-soon-chip {
      background-color: #FF9800;
      color: white;
    }

    /* Preferences */
    .preference-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 16px 0;
    }

    .preference-section h3 {
      margin: 0 0 8px 0;
      font-size: 16px;
      font-weight: 600;
    }

    /* Account Info */
    .info-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      background-color: #f5f5f5;
      border-radius: 4px;
    }

    .info-label {
      font-weight: 500;
      color: rgba(0, 0, 0, 0.7);
    }

    .info-value {
      color: rgba(0, 0, 0, 0.87);
    }

    .status-active {
      background-color: #4CAF50;
      color: white;
    }

    .status-inactive {
      background-color: #F44336;
      color: white;
    }

    /* Danger Zone */
    .danger-zone {
      border: 2px solid #F44336;
    }

    .danger-zone mat-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #F44336;
    }

    .danger-actions {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .danger-action {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 24px;
      padding: 16px;
      background-color: #ffebee;
      border-radius: 8px;
    }

    .danger-action h3 {
      margin: 0 0 4px 0;
      font-size: 16px;
      font-weight: 600;
      color: #c62828;
    }

    .danger-action p {
      margin: 0;
      font-size: 14px;
      color: rgba(0, 0, 0, 0.7);
    }

    @media (max-width: 768px) {
      .integration-section {
        flex-direction: column;
        align-items: flex-start;
      }

      .danger-action {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  `]
})
export class SettingsComponent implements OnInit {
  currentUser: User | null = null;
  profileForm: FormGroup;
  passwordForm: FormGroup;
  preferencesForm: FormGroup;

  hideCurrentPassword = true;
  hideNewPassword = true;
  hideConfirmPassword = true;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {
    this.profileForm = this.fb.group({
      full_name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      company: [''],
      phone: ['']
    });

    this.passwordForm = this.fb.group({
      current_password: ['', Validators.required],
      new_password: ['', [Validators.required, Validators.minLength(8)]],
      confirm_password: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });

    this.preferencesForm = this.fb.group({
      email_lead_notifications: [true],
      email_deal_notifications: [true],
      email_activity_reminders: [true],
      app_notifications: [true],
      notification_sound: [false],
      items_per_page: [25],
      default_currency: ['USD']
    });
  }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.profileForm.patchValue({
          full_name: user.full_name,
          email: user.email,
          company: user.company || ''
        });
      }
    });

    this.loadPreferences();
  }

  passwordMatchValidator(group: FormGroup): { [key: string]: boolean } | null {
    const newPassword = group.get('new_password')?.value;
    const confirmPassword = group.get('confirm_password')?.value;

    if (newPassword !== confirmPassword) {
      group.get('confirm_password')?.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }

    return null;
  }

  updateProfile(): void {
    if (!this.profileForm.valid) {
      return;
    }

    const profileData = this.profileForm.value;

    this.http.put(`${environment.apiUrl}/api/v1/users/me`, profileData).subscribe({
      next: (updatedUser: any) => {
        this.snackBar.open('Profile updated successfully', 'Close', { duration: 3000 });
        this.profileForm.markAsPristine();
        this.authService.updateCurrentUser(updatedUser);
      },
      error: (error) => {
        this.snackBar.open('Error updating profile', 'Close', { duration: 3000 });
      }
    });
  }

  resetProfileForm(): void {
    if (this.currentUser) {
      this.profileForm.patchValue({
        full_name: this.currentUser.full_name,
        email: this.currentUser.email,
        company: this.currentUser.company || ''
      });
      this.profileForm.markAsPristine();
    }
  }

  changePassword(): void {
    if (!this.passwordForm.valid) {
      return;
    }

    const passwordData = {
      current_password: this.passwordForm.value.current_password,
      new_password: this.passwordForm.value.new_password
    };

    this.http.post(`${environment.apiUrl}/api/v1/users/change-password`, passwordData).subscribe({
      next: () => {
        this.snackBar.open('Password changed successfully', 'Close', { duration: 3000 });
        this.resetPasswordForm();
      },
      error: (error) => {
        const message = error.status === 400
          ? 'Current password is incorrect'
          : 'Error changing password';
        this.snackBar.open(message, 'Close', { duration: 3000 });
      }
    });
  }

  resetPasswordForm(): void {
    this.passwordForm.reset();
  }

  loadPreferences(): void {
    const savedPreferences = localStorage.getItem('user_preferences');
    if (savedPreferences) {
      try {
        const preferences = JSON.parse(savedPreferences);
        this.preferencesForm.patchValue(preferences);
      } catch (e) {
        console.error('Error loading preferences:', e);
      }
    }
  }

  savePreferences(): void {
    const preferences = this.preferencesForm.value;
    localStorage.setItem('user_preferences', JSON.stringify(preferences));
    this.preferencesForm.markAsPristine();
    this.snackBar.open('Preferences saved successfully', 'Close', { duration: 3000 });
  }

  connectGoogleCalendar(): void {
    window.location.href = `${environment.apiUrl}/api/v1/google/authorize`;
  }

  disconnectGoogleCalendar(): void {
    if (confirm('Are you sure you want to disconnect Google Calendar?')) {
      this.http.post(`${environment.apiUrl}/api/v1/google/disconnect`, {}).subscribe({
        next: () => {
          this.snackBar.open('Google Calendar disconnected', 'Close', { duration: 3000 });
          if (this.currentUser) {
            this.currentUser.google_connected = false;
          }
        },
        error: () => {
          this.snackBar.open('Error disconnecting Google Calendar', 'Close', { duration: 3000 });
        }
      });
    }
  }

  deleteAccount(): void {
    const confirmed = confirm(
      'Are you absolutely sure you want to delete your account? This action CANNOT be undone and all your data will be permanently deleted.'
    );

    if (confirmed) {
      const doubleConfirmed = confirm(
        'This is your last warning. Type DELETE to confirm account deletion.'
      );

      if (doubleConfirmed) {
        this.http.delete(`${environment.apiUrl}/api/v1/users/me`).subscribe({
          next: () => {
            this.snackBar.open('Account deleted successfully', 'Close', { duration: 3000 });
            this.authService.logout();
          },
          error: () => {
            this.snackBar.open('Error deleting account', 'Close', { duration: 3000 });
          }
        });
      }
    }
  }
}
