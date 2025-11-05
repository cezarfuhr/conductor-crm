# Marco 011: Lead Creation Flow
> Frontend - Formulário de criação de leads | 2 dias

**Responsável**: Frontend Dev
**Revisor**: Designer
**Status**: 🔵 Planejado

---

## 🎯 Objetivo

Implementar formulário intuitivo e validado para criação de leads, com feedback em tempo real e integração com API.

---

## 📋 Especific

ações Técnicas

### Form Fields

#### Required Fields
- **Name** (text)
  - Min: 2 chars
  - Max: 100 chars
  - Validation: realtime

- **Email** (email)
  - Format validation
  - Unique check (async)
  - Suggestion: "Did you mean...?"

#### Optional Fields
- **Phone** (tel)
  - International format
  - Auto-format as types
  - Mask: +XX (XX) XXXXX-XXXX

- **Company** (text)
  - Auto-complete (se já existe)
  - Max: 200 chars

- **Job Title** (text)
  - Suggestions from common titles
  - Max: 100 chars

- **Source** (select)
  - Options: website_form, linkedin, referral, cold_outreach, event, import, other
  - Default: website_form

- **Source Details** (textarea)
  - Optional context
  - Max: 500 chars

---

### Component Structure

```typescript
@Component({
  selector: 'app-lead-form',
  templateUrl: './lead-form.component.html',
  styleUrls: ['./lead-form.component.scss']
})
export class LeadFormComponent implements OnInit {
  leadForm: FormGroup;
  loading = false;
  errors: { [key: string]: string } = {};

  sources = [
    { value: 'website_form', label: 'Website Form' },
    { value: 'linkedin', label: 'LinkedIn' },
    { value: 'referral', label: 'Referral' },
    { value: 'cold_outreach', label: 'Cold Outreach' },
    { value: 'event', label: 'Event' },
    { value: 'import', label: 'Import' },
    { value: 'other', label: 'Other' }
  ];

  constructor(
    private fb: FormBuilder,
    private leadService: LeadService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.leadForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email], [this.emailUniqueValidator()]],
      phone: ['', [phoneValidator]],
      company: ['', [Validators.maxLength(200)]],
      job_title: ['', [Validators.maxLength(100)]],
      source: ['website_form', [Validators.required]],
      source_details: ['', [Validators.maxLength(500)]]
    });
  }

  ngOnInit() {
    this.setupAutoComplete();
    this.setupPhoneMask();
  }

  onSubmit() {
    if (this.leadForm.invalid) {
      this.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.leadService.createLead(this.leadForm.value).subscribe({
      next: (lead) => {
        this.snackBar.open('Lead created successfully! 🎉', 'Close', {
          duration: 3000
        });
        this.router.navigate(['/leads', lead.id]);
      },
      error: (error) => {
        this.loading = false;
        this.handleError(error);
      }
    });
  }

  // Email unique validator (async)
  emailUniqueValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value) {
        return of(null);
      }
      return this.leadService.checkEmailExists(control.value).pipe(
        map(exists => exists ? { emailTaken: true } : null),
        debounceTime(500)
      );
    };
  }

  handleError(error: any) {
    if (error.status === 409) {
      this.leadForm.get('email')?.setErrors({ emailTaken: true });
    } else {
      this.snackBar.open('Error creating lead. Please try again.', 'Close', {
        duration: 5000
      });
    }
  }
}
```

---

### Template

```html
<div class="lead-form-container">
  <h2>New Lead</h2>

  <form [formGroup]="leadForm" (ngSubmit)="onSubmit()">
    <!-- Name -->
    <mat-form-field appearance="outline">
      <mat-label>Name *</mat-label>
      <input matInput formControlName="name" placeholder="John Doe">
      <mat-error *ngIf="leadForm.get('name')?.hasError('required')">
        Name is required
      </mat-error>
      <mat-error *ngIf="leadForm.get('name')?.hasError('minlength')">
        Name must be at least 2 characters
      </mat-error>
    </mat-form-field>

    <!-- Email -->
    <mat-form-field appearance="outline">
      <mat-label>Email *</mat-label>
      <input matInput type="email" formControlName="email" placeholder="john@company.com">
      <mat-icon matSuffix *ngIf="leadForm.get('email')?.pending">
        <mat-spinner diameter="20"></mat-spinner>
      </mat-icon>
      <mat-error *ngIf="leadForm.get('email')?.hasError('required')">
        Email is required
      </mat-error>
      <mat-error *ngIf="leadForm.get('email')?.hasError('email')">
        Invalid email format
      </mat-error>
      <mat-error *ngIf="leadForm.get('email')?.hasError('emailTaken')">
        This email already exists
      </mat-error>
    </mat-form-field>

    <!-- Phone -->
    <mat-form-field appearance="outline">
      <mat-label>Phone</mat-label>
      <input matInput type="tel" formControlName="phone" placeholder="+1 (555) 123-4567">
      <mat-error *ngIf="leadForm.get('phone')?.hasError('invalidPhone')">
        Invalid phone format
      </mat-error>
    </mat-form-field>

    <!-- Company -->
    <mat-form-field appearance="outline">
      <mat-label>Company</mat-label>
      <input
        matInput
        formControlName="company"
        placeholder="Acme Corp"
        [matAutocomplete]="companyAuto">
      <mat-autocomplete #companyAuto="matAutocomplete">
        <mat-option *ngFor="let company of filteredCompanies | async" [value]="company">
          {{ company }}
        </mat-option>
      </mat-autocomplete>
    </mat-form-field>

    <!-- Job Title -->
    <mat-form-field appearance="outline">
      <mat-label>Job Title</mat-label>
      <input
        matInput
        formControlName="job_title"
        placeholder="CTO"
        [matAutocomplete]="titleAuto">
      <mat-autocomplete #titleAuto="matAutocomplete">
        <mat-option *ngFor="let title of commonTitles" [value]="title">
          {{ title }}
        </mat-option>
      </mat-autocomplete>
    </mat-form-field>

    <!-- Source -->
    <mat-form-field appearance="outline">
      <mat-label>Source *</mat-label>
      <mat-select formControlName="source">
        <mat-option *ngFor="let source of sources" [value]="source.value">
          {{ source.label }}
        </mat-option>
      </mat-select>
    </mat-form-field>

    <!-- Source Details -->
    <mat-form-field appearance="outline">
      <mat-label>Source Details</mat-label>
      <textarea
        matInput
        formControlName="source_details"
        placeholder="Campaign name, referral source, etc."
        rows="3">
      </textarea>
      <mat-hint align="end">
        {{ leadForm.get('source_details')?.value?.length || 0 }} / 500
      </mat-hint>
    </mat-form-field>

    <!-- Actions -->
    <div class="form-actions">
      <button
        type="button"
        mat-button
        [routerLink]="['/leads']">
        Cancel
      </button>
      <button
        type="submit"
        mat-raised-button
        color="primary"
        [disabled]="leadForm.invalid || loading">
        <mat-spinner *ngIf="loading" diameter="20"></mat-spinner>
        <span *ngIf="!loading">Create Lead</span>
      </button>
    </div>
  </form>

  <!-- AI Hint -->
  <div class="ai-hint">
    <mat-icon>tips_and_updates</mat-icon>
    <span>AI will automatically qualify and enrich this lead after creation</span>
  </div>
</div>
```

---

## ✅ Critérios de Aceitação

- [ ] Form valida campos em tempo real
- [ ] Email unique check funciona (async)
- [ ] Phone auto-format funciona
- [ ] Company auto-complete funciona
- [ ] Submit cria lead e navega para detail
- [ ] Loading state durante submit
- [ ] Error handling mostra mensagens claras
- [ ] Responsive em mobile

---

**Status**: 🔵 Pronto para Implementação
