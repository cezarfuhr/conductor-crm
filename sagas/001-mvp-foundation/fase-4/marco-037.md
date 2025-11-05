# Marco 037: Error Handling & UX Polish
> Frontend - Estados, mensagens e polish | 3 dias

**Responsável**: Frontend Dev + Designer
**Revisor**: Product Manager
**Status**: 🔵 Planejado

---

## 🎯 Objetivo

Refinar experiência do usuário com error pages bem desenhadas, loading states com skeletons, empty states com ilustrações, e feedback messages.

---

## 📋 Components to Implement

### 1. Error Pages

**404 Not Found**
```typescript
@Component({
  selector: 'app-not-found',
  template: `
    <div class="error-page">
      <mat-icon>search_off</mat-icon>
      <h1>404</h1>
      <h2>Page Not Found</h2>
      <p>The page you're looking for doesn't exist.</p>
      <button mat-raised-button color="primary" [routerLink]="['/dashboard']">
        Go to Dashboard
      </button>
    </div>
  `
})
export class NotFoundComponent {}
```

**500 Server Error**
```html
<div class="error-page">
  <mat-icon>error_outline</mat-icon>
  <h1>500</h1>
  <h2>Something Went Wrong</h2>
  <p>We're working to fix the problem. Please try again later.</p>
  <button mat-button (click)="retry()">Retry</button>
  <button mat-button [routerLink]="['/dashboard']">Go Home</button>
</div>
```

---

### 2. Loading Skeletons

**Lead List Skeleton**
```html
<div class="skeleton-list">
  <div class="skeleton-item" *ngFor="let _ of [1,2,3,4,5]">
    <div class="skeleton-avatar"></div>
    <div class="skeleton-content">
      <div class="skeleton-line skeleton-line-lg"></div>
      <div class="skeleton-line skeleton-line-md"></div>
    </div>
  </div>
</div>
```

```scss
.skeleton-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
}

.skeleton-line {
  height: 12px;
  border-radius: 4px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;

  &-lg { width: 80%; }
  &-md { width: 60%; }
}

@keyframes skeleton-loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

---

### 3. Empty States

**No Leads**
```html
<div class="empty-state">
  <img src="assets/illustrations/empty-leads.svg" alt="No leads" />
  <h3>No leads yet</h3>
  <p>Create your first lead to start tracking potential customers</p>
  <button mat-raised-button color="primary" (click)="createLead()">
    <mat-icon>add</mat-icon>
    Create Lead
  </button>
</div>
```

**Search No Results**
```html
<div class="empty-state">
  <mat-icon>search_off</mat-icon>
  <h3>No results found</h3>
  <p>Try adjusting your search or filters</p>
  <button mat-button (click)="clearFilters()">Clear Filters</button>
</div>
```

---

### 4. Toast Messages

**Success/Error Toasts**
```typescript
// Service
export class ToastService {
  constructor(private snackBar: MatSnackBar) {}

  success(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['toast-success'],
      horizontalPosition: 'end',
      verticalPosition: 'top'
    });
  }

  error(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['toast-error'],
      horizontalPosition: 'end',
      verticalPosition: 'top'
    });
  }

  warning(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 4000,
      panelClass: ['toast-warning'],
      horizontalPosition: 'end',
      verticalPosition: 'top'
    });
  }
}

// Usage
this.toastService.success('Lead created successfully! ✨');
this.toastService.error('Failed to save. Please try again.');
```

```scss
// Toast styles
.toast-success {
  background: #4CAF50;
  color: white;
}

.toast-error {
  background: #f44336;
  color: white;
}

.toast-warning {
  background: #FF9800;
  color: white;
}
```

---

### 5. Confirmation Dialogs

```typescript
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {
      title: string;
      message: string;
      confirmText?: string;
      cancelText?: string;
    }
  ) {}

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}

// Service
export class DialogService {
  constructor(private dialog: MatDialog) {}

  confirm(title: string, message: string): Observable<boolean> {
    return this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: { title, message }
    }).afterClosed();
  }
}

// Usage
this.dialogService.confirm(
  'Delete Lead',
  'Are you sure you want to delete this lead?'
).subscribe(confirmed => {
  if (confirmed) {
    this.deleteLead();
  }
});
```

---

### 6. Form Validation Messages

```html
<mat-form-field>
  <input matInput formControlName="email" placeholder="Email" />
  <mat-error *ngIf="form.get('email')?.hasError('required')">
    Email is required
  </mat-error>
  <mat-error *ngIf="form.get('email')?.hasError('email')">
    Please enter a valid email
  </mat-error>
</mat-form-field>

<mat-form-field>
  <input matInput formControlName="phone" placeholder="Phone" />
  <mat-hint>Format: +55 11 99999-9999</mat-hint>
  <mat-error>Invalid phone number</mat-error>
</mat-form-field>
```

---

### 7. Loading Indicators

**Button Loading**
```html
<button
  mat-raised-button
  color="primary"
  [disabled]="loading"
  (click)="save()">
  <mat-spinner diameter="20" *ngIf="loading"></mat-spinner>
  <span *ngIf="!loading">Save</span>
  <span *ngIf="loading">Saving...</span>
</button>
```

**Inline Loading**
```html
<div class="inline-loading" *ngIf="loading">
  <mat-spinner diameter="24"></mat-spinner>
  <span>Loading...</span>
</div>
```

---

## ✅ Checklist

- [ ] 404 page implementada
- [ ] 500 page implementada
- [ ] 403 (Forbidden) page
- [ ] Loading skeletons em todas as listas
- [ ] Empty states em todas as páginas
- [ ] Toast service global
- [ ] Confirmation dialogs
- [ ] Form validation messages
- [ ] Button loading states
- [ ] Inline loading indicators
- [ ] Error boundary (global error handler)

---

**Status**: 🔵 Pronto para Implementação
**Estimativa**: 3 dias
