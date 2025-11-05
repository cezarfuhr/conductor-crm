# Marco 035: User Settings & Preferences
> Frontend - Página de configurações completa | 3 dias

**Responsável**: Frontend Dev
**Revisor**: Designer
**Status**: 🔵 Planejado

---

## 🎯 Objetivo

Implementar página completa de settings com profile management, integration status, notification preferences, e API keys.

---

## 📋 Sections

1. **Profile Settings**: Avatar, name, bio, phone
2. **Integration Management**: Gmail, Calendar status
3. **Notification Preferences**: Email/Push per type
4. **API Keys**: OpenAI, Anthropic keys
5. **UI Preferences**: Theme, language, timezone

---

## 💻 Implementation

```typescript
// src/app/features/settings/pages/settings/settings.component.ts

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html'
})
export class SettingsComponent implements OnInit {
  profileForm!: FormGroup;
  notificationForm!: FormGroup;
  apiKeysForm!: FormGroup;

  integrations = {
    gmail: { connected: false, email: '' },
    calendar: { connected: false, email: '' }
  };

  ngOnInit(): void {
    this.initForms();
    this.loadSettings();
    this.loadIntegrations();
  }

  initForms(): void {
    this.profileForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      bio: [''],
      avatar: ['']
    });

    this.notificationForm = this.fb.group({
      email_new_lead: [true],
      email_deal_won: [true],
      email_task_due: [true],
      push_new_lead: [true],
      push_deal_won: [true],
      quiet_hours_enabled: [false],
      quiet_hours_start: ['22:00'],
      quiet_hours_end: ['08:00']
    });

    this.apiKeysForm = this.fb.group({
      openai_key: [''],
      anthropic_key: ['']
    });
  }

  async saveProfile(): Promise<void> {
    if (this.profileForm.invalid) return;

    await this.settingsService.updateProfile(this.profileForm.value).toPromise();
    this.snackBar.open('Profile updated!', 'Close', { duration: 3000 });
  }

  async saveNotifications(): Promise<void> {
    await this.settingsService.updateNotificationPreferences(
      this.notificationForm.value
    ).toPromise();
    this.snackBar.open('Preferences saved!', 'Close', { duration: 3000 });
  }

  async saveApiKeys(): Promise<void> {
    await this.settingsService.updateApiKeys(this.apiKeysForm.value).toPromise();
    this.snackBar.open('API keys saved!', 'Close', { duration: 3000 });
  }

  connectGmail(): void {
    this.integrationsService.connectGmail().subscribe(
      result => window.location.href = result.auth_url
    );
  }

  disconnectGmail(): void {
    if (confirm('Disconnect Gmail?')) {
      this.integrationsService.disconnectGmail().subscribe(() => {
        this.integrations.gmail.connected = false;
      });
    }
  }

  uploadAvatar(event: any): void {
    const file = event.target.files[0];
    const formData = new FormData();
    formData.append('avatar', file);

    this.settingsService.uploadAvatar(formData).subscribe(
      result => {
        this.profileForm.patchValue({ avatar: result.url });
        this.snackBar.open('Avatar uploaded!', 'Close', { duration: 3000 });
      }
    );
  }
}
```

### Template Structure

```html
<div class="settings-page">
  <mat-tab-group>

    <!-- Profile Tab -->
    <mat-tab label="Profile">
      <form [formGroup]="profileForm" (ngSubmit)="saveProfile()">
        <!-- Avatar Upload -->
        <div class="avatar-section">
          <img [src]="profileForm.value.avatar || 'default-avatar.png'" />
          <input type="file" (change)="uploadAvatar($event)" accept="image/*" />
        </div>

        <mat-form-field>
          <input matInput formControlName="name" placeholder="Name" />
        </mat-form-field>

        <mat-form-field>
          <input matInput formControlName="email" placeholder="Email" />
        </mat-form-field>

        <mat-form-field>
          <textarea matInput formControlName="bio" placeholder="Bio"></textarea>
        </mat-form-field>

        <button mat-raised-button color="primary" type="submit">
          Save Profile
        </button>
      </form>
    </mat-tab>

    <!-- Integrations Tab -->
    <mat-tab label="Integrations">
      <div class="integration-card" *ngFor="let int of integrations | keyvalue">
        <mat-icon>{{ int.key === 'gmail' ? 'email' : 'event' }}</mat-icon>
        <div class="info">
          <h4>{{ int.key | titlecase }}</h4>
          <p *ngIf="int.value.connected">Connected: {{ int.value.email }}</p>
          <p *ngIf="!int.value.connected">Not connected</p>
        </div>
        <button
          mat-button
          *ngIf="!int.value.connected"
          (click)="int.key === 'gmail' ? connectGmail() : connectCalendar()">
          Connect
        </button>
        <button
          mat-button
          color="warn"
          *ngIf="int.value.connected"
          (click)="int.key === 'gmail' ? disconnectGmail() : disconnectCalendar()">
          Disconnect
        </button>
      </div>
    </mat-tab>

    <!-- Notifications Tab -->
    <mat-tab label="Notifications">
      <form [formGroup]="notificationForm" (ngSubmit)="saveNotifications()">
        <h4>Email Notifications</h4>
        <mat-checkbox formControlName="email_new_lead">New Lead</mat-checkbox>
        <mat-checkbox formControlName="email_deal_won">Deal Won</mat-checkbox>
        <mat-checkbox formControlName="email_task_due">Task Due</mat-checkbox>

        <h4>Push Notifications</h4>
        <mat-checkbox formControlName="push_new_lead">New Lead</mat-checkbox>
        <mat-checkbox formControlName="push_deal_won">Deal Won</mat-checkbox>

        <h4>Quiet Hours</h4>
        <mat-checkbox formControlName="quiet_hours_enabled">Enable</mat-checkbox>
        <mat-form-field>
          <input matInput type="time" formControlName="quiet_hours_start" />
        </mat-form-field>
        <mat-form-field>
          <input matInput type="time" formControlName="quiet_hours_end" />
        </mat-form-field>

        <button mat-raised-button color="primary" type="submit">
          Save Preferences
        </button>
      </form>
    </mat-tab>

    <!-- API Keys Tab -->
    <mat-tab label="API Keys">
      <form [formGroup]="apiKeysForm" (ngSubmit)="saveApiKeys()">
        <mat-form-field>
          <input matInput formControlName="openai_key" type="password" placeholder="OpenAI API Key" />
        </mat-form-field>

        <mat-form-field>
          <input matInput formControlName="anthropic_key" type="password" placeholder="Anthropic API Key" />
        </mat-form-field>

        <button mat-raised-button color="primary" type="submit">
          Save API Keys
        </button>
      </form>
    </mat-tab>

  </mat-tab-group>
</div>
```

---

## ✅ Critérios de Aceitação

- [ ] Profile edit funciona
- [ ] Avatar upload funciona
- [ ] Integration status exibido
- [ ] Connect/disconnect integrations
- [ ] Notification preferences salvam
- [ ] API keys salvam (encrypted)
- [ ] Form validation funciona
- [ ] Success/error messages
- [ ] Responsive em mobile

---

**Status**: 🔵 Pronto para Implementação
**Estimativa**: 3 dias
