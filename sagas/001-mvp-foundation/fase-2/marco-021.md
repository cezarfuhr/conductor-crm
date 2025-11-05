# Marco 021: Contact Management UI
> Frontend - Interface de gerenciamento de contatos e empresas | 4 dias

**Responsável**: Frontend Dev
**Revisor**: Designer
**Status**: 🔵 Planejado

---

## 🎯 Objetivo

Implementar interfaces completas para gerenciar Contacts e Companies: listas, detail pages, criação/edição, e busca/autocomplete.

---

## 📋 Páginas a Implementar

### 1. Contact List Page

Similar a Lead List (Marco 010):
- Lista com paginação
- Filtros: company, tags, owner
- Search bar
- Columns: Name, Email, Phone, Company, Job Title, Last Contact
- Click para navegar para detail

### 2. Contact Detail Page

Similar a Lead/Deal Detail:
- Header com nome, email, phone
- Quick actions: Call, Email, Add to Deal
- Company card (linked)
- Related leads/deals
- Activity timeline
- Edição inline
- Notes

### 3. Company List Page

- Lista com paginação
- Cards com logo, nome, industry, employee count
- Filtros: industry, size, tags
- Search
- Click para detail

### 4. Company Profile Page

- Header com logo, nome, website
- Company details (industry, size, location)
- Contacts list (from this company)
- Related deals
- Activity timeline
- Enriched data (se disponível)

---

## 💻 Key Components

### Contact Card Component

```typescript
@Component({
  selector: 'app-contact-card',
  template: `
    <mat-card class="contact-card" (click)="onClick()">
      <div class="avatar">{{ getInitials() }}</div>
      <div class="info">
        <h3>{{ contact.full_name }}</h3>
        <p class="job-title">{{ contact.job_title }}</p>
        <p class="company">{{ contact.company_name }}</p>
        <div class="contact-methods">
          <a [href]="'mailto:' + contact.email" (click)="$event.stopPropagation()">
            <mat-icon>email</mat-icon>
          </a>
          <a [href]="'tel:' + contact.phone" (click)="$event.stopPropagation()" *ngIf="contact.phone">
            <mat-icon>phone</mat-icon>
          </a>
        </div>
      </div>
    </mat-card>
  `
})
export class ContactCardComponent {
  @Input() contact!: Contact;
  @Output() click = new EventEmitter<Contact>();

  onClick(): void {
    this.click.emit(this.contact);
  }

  getInitials(): string {
    return `${this.contact.first_name[0]}${this.contact.last_name[0]}`.toUpperCase();
  }
}
```

### Company Autocomplete Component

Para uso em Lead/Deal forms:

```typescript
@Component({
  selector: 'app-company-autocomplete',
  template: `
    <mat-form-field appearance="outline">
      <mat-label>Company</mat-label>
      <input
        matInput
        [formControl]="searchControl"
        [matAutocomplete]="auto"
        placeholder="Search companies...">
      <mat-autocomplete
        #auto="matAutocomplete"
        [displayWith]="displayFn"
        (optionSelected)="onSelect($event)">
        <mat-option *ngFor="let company of filteredCompanies$ | async" [value]="company">
          <div class="company-option">
            <img [src]="company.logo_url" *ngIf="company.logo_url" />
            <span>{{ company.name }}</span>
          </div>
        </mat-option>
        <mat-option *ngIf="(filteredCompanies$ | async)?.length === 0">
          <button mat-button (click)="createNew()">
            <mat-icon>add</mat-icon>
            Create "{{ searchControl.value }}"
          </button>
        </mat-option>
      </mat-autocomplete>
    </mat-form-field>
  `
})
export class CompanyAutocompleteComponent implements OnInit {
  @Input() initialValue?: Company;
  @Output() companySelected = new EventEmitter<Company>();

  searchControl = new FormControl('');
  filteredCompanies$!: Observable<Company[]>;

  ngOnInit(): void {
    this.filteredCompanies$ = this.searchControl.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      switchMap(value => this.searchCompanies(value))
    );
  }

  searchCompanies(query: string): Observable<Company[]> {
    if (!query || query.length < 2) {
      return of([]);
    }
    return this.companiesService.search(query);
  }

  onSelect(event: MatAutocompleteSelectedEvent): void {
    this.companySelected.emit(event.option.value);
  }

  displayFn(company: Company): string {
    return company ? company.name : '';
  }

  createNew(): void {
    // Open create company dialog
  }
}
```

---

## 🎨 Layout Examples

### Contact List (Table View)

```
┌─────────────────────────────────────────────────────────────────┐
│  Contacts (245)                [Search] [Filters] [+ New]        │
├─────────────────────────────────────────────────────────────────┤
│  Name             Email              Company        Last Contact │
├─────────────────────────────────────────────────────────────────┤
│  🔵 John Doe     john@acme.com      Acme Corp      2 days ago    │
│  🟢 Jane Smith   jane@techco.com    Tech Co        1 week ago    │
│  🔴 Bob Wilson   bob@startup.io     Startup Inc    2 months ago  │
│  ...                                                              │
└─────────────────────────────────────────────────────────────────┘
```

### Company Profile

```
┌─────────────────────────────────────────────────────────────────┐
│  [Logo]  Acme Corp                             [Edit] [Delete]  │
│          www.acme.com                                            │
│          "Enterprise software company"                           │
├─────────────────────────────────────────────────────────────────┤
│  Industry: Technology | Employees: 100-250 | Location: São Paulo│
├──────────────────────┬──────────────────────────────────────────┤
│  Contacts (12)       │  Deals (3)                               │
│  - John Doe (CEO)    │  - Deal 1: R$ 50k (Proposal)             │
│  - Jane Smith (CTO)  │  - Deal 2: R$ 30k (Negotiation)          │
│  ...                 │  ...                                      │
└──────────────────────┴──────────────────────────────────────────┘
```

---

## 🔍 Search & Filter Features

### Contact Filters

```typescript
interface ContactFilters {
  search?: string;           // Name or email
  company_id?: string;       // Filter by company
  tags?: string[];           // Filter by tags
  has_phone?: boolean;       // Has phone number
  last_contact_days?: number; // Contacted in last N days
}
```

### Company Filters

```typescript
interface CompanyFilters {
  search?: string;            // Name or domain
  industry?: string[];        // Filter by industry
  employee_range?: string[];  // '10-50', '50-200', etc
  country?: string;           // Filter by country
  tags?: string[];
}
```

---

## ✅ Critérios de Aceitação

- [ ] Contact list page funciona (table view)
- [ ] Contact detail page completa
- [ ] Contact create/edit forms funcionam
- [ ] Company list page funciona (cards view)
- [ ] Company profile page completa
- [ ] Company autocomplete funciona (usado em forms)
- [ ] Search é rápido (<500ms)
- [ ] Filtros funcionam
- [ ] Paginação funciona
- [ ] Click em company navega para profile
- [ ] Click em contact navega para detail
- [ ] Related entities são exibidos (deals, leads)
- [ ] Activity timeline funciona
- [ ] Responsive em mobile

---

## 🔗 Dependências

- ✅ Marco 020: Contact & Company Models
- ⬜ Marco 022: Activity Timeline Component (reusável)

---

**Status**: 🔵 Pronto para Implementação
**Estimativa**: 4 dias
