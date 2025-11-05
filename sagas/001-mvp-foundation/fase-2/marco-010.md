# Marco 010: Lead List UI
> Frontend - Página de listagem de leads | 3 dias

**Responsável**: Frontend Dev
**Revisor**: Designer + Tech Lead
**Status**: 🔵 Planejado

---

## 🎯 Objetivo

Criar página de listagem de leads com tabela/grid responsiva, filtros, busca, paginação e ações em massa. Interface deve ser intuitiva e rápida.

---

## 📋 Contexto

Esta é a **primeira página funcional** do CRM. Vendedores vão passar muito tempo aqui, então UX é crítica. Deve carregar rápido mesmo com centenas de leads.

### Fluxo do Usuário
1. User navega para `/leads`
2. Sistema carrega lista de leads (paginada)
3. User pode filtrar, buscar, ordenar
4. User clica em lead → vai para Lead Detail (marco 015)
5. User clica "New Lead" → abre form (marco 011)

---

## 🎨 Design Specifications

### Layout

```
┌─────────────────────────────────────────────────────────┐
│ [☰ Menu]  Leads                      [🔔][👤 User]     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  📊 Leads                                                │
│  ─────────                                               │
│                                                          │
│  [🔍 Search...]  [🎯 Filters ▼]  [+ New Lead]          │
│                                                          │
│  ┌──────┬─────────┬──────────┬────────┬─────────┐     │
│  │ ☑️   │ Name    │ Company  │ Status │ Score   │     │
│  ├──────┼─────────┼──────────┼────────┼─────────┤     │
│  │ ☑    │ João    │ TechCorp │ 🔥 Hot │ 88      │  →  │
│  │ ☑    │ Maria   │ Startup  │ ☀️ Warm│ 65      │  →  │
│  │ ☑    │ Carlos  │ BigCo    │ ❄️ Cold│ 32      │  →  │
│  └──────┴─────────┴──────────┴────────┴─────────┘     │
│                                                          │
│  [← Prev]  Page 1 of 15  [Next →]                      │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Componentes

#### 1. Header Bar
- Title: "Leads"
- Count badge: "(150)"
- Action button: "New Lead" (primary)

#### 2. Filter Bar
- Search input (full-width)
- Filters dropdown
- Refresh button (icon)

#### 3. Lead Table
- Selectable rows (checkbox)
- Sortable columns
- Row hover effect
- Click row → navigate to detail

#### 4. Pagination
- Previous/Next buttons
- Page indicator
- Jump to page (input)

---

## 🔧 Especificações Técnicas

### Angular Component Structure

```
src/app/modules/leads/
├── leads-routing.module.ts
├── leads.module.ts
├── components/
│   ├── lead-list/
│   │   ├── lead-list.component.ts
│   │   ├── lead-list.component.html
│   │   ├── lead-list.component.scss
│   │   └── lead-list.component.spec.ts
│   ├── lead-filters/
│   │   ├── lead-filters.component.ts
│   │   ├── lead-filters.component.html
│   │   └── lead-filters.component.scss
│   └── lead-table/
│       ├── lead-table.component.ts
│       ├── lead-table.component.html
│       └── lead-table.component.scss
├── services/
│   └── lead.service.ts
└── store/
    ├── lead.actions.ts
    ├── lead.reducer.ts
    ├── lead.selectors.ts
    └── lead.effects.ts
```

---

### Component: `lead-list.component.ts`

#### Properties
```typescript
export class LeadListComponent implements OnInit {
  // Data
  leads$: Observable<Lead[]>;
  loading$: Observable<boolean>;
  error$: Observable<string | null>;
  pagination$: Observable<PaginationState>;

  // Filters
  searchTerm = '';
  selectedStatuses: string[] = [];
  selectedClassifications: string[] = [];
  sortBy: 'created_at' | 'name' | 'company' | 'qualification_score' = 'created_at';
  sortOrder: 'asc' | 'desc' = 'desc';

  // Selection
  selectedLeads: Set<string> = new Set();
  selectAll = false;

  // UI State
  showFilters = false;

  constructor(
    private store: Store,
    private leadService: LeadService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadLeads();
    this.setupObservables();
  }

  // Methods
  loadLeads() {
    this.store.dispatch(LeadActions.loadLeads({
      filters: this.getFilters(),
      pagination: this.getPagination()
    }));
  }

  onSearchChange(term: string) {
    this.searchTerm = term;
    this.debounceSearch();
  }

  onFilterChange(filters: Filters) {
    this.selectedStatuses = filters.statuses;
    this.selectedClassifications = filters.classifications;
    this.loadLeads();
  }

  onSortChange(column: string) {
    if (this.sortBy === column) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = column;
      this.sortOrder = 'desc';
    }
    this.loadLeads();
  }

  onPageChange(page: number) {
    this.store.dispatch(LeadActions.changePage({ page }));
  }

  onRowClick(lead: Lead) {
    this.router.navigate(['/leads', lead.id]);
  }

  onNewLead() {
    this.router.navigate(['/leads/new']);
  }

  // Selection
  onSelectAll() {
    // Toggle select all
  }

  onSelectLead(leadId: string) {
    // Toggle select single lead
  }

  // Bulk Actions
  onBulkAssign() {
    // Bulk assign selected leads
  }

  onBulkDelete() {
    // Bulk delete selected leads
  }
}
```

---

### Template: `lead-list.component.html`

```html
<div class="lead-list-container">
  <!-- Header -->
  <div class="header">
    <div class="title">
      <h1>Leads</h1>
      <span class="count-badge" *ngIf="(pagination$ | async)?.total">
        {{ (pagination$ | async)?.total }}
      </span>
    </div>
    <button
      mat-raised-button
      color="primary"
      (click)="onNewLead()"
      class="new-lead-btn">
      <mat-icon>add</mat-icon>
      New Lead
    </button>
  </div>

  <!-- Filter Bar -->
  <div class="filter-bar">
    <!-- Search -->
    <mat-form-field class="search-field" appearance="outline">
      <mat-icon matPrefix>search</mat-icon>
      <input
        matInput
        placeholder="Search leads..."
        [(ngModel)]="searchTerm"
        (ngModelChange)="onSearchChange($event)">
      <button
        mat-icon-button
        matSuffix
        *ngIf="searchTerm"
        (click)="searchTerm = ''; onSearchChange('')">
        <mat-icon>close</mat-icon>
      </button>
    </mat-form-field>

    <!-- Filters -->
    <button
      mat-button
      (click)="showFilters = !showFilters"
      [class.active]="showFilters">
      <mat-icon>filter_list</mat-icon>
      Filters
      <span class="filter-count" *ngIf="getActiveFiltersCount() > 0">
        {{ getActiveFiltersCount() }}
      </span>
    </button>

    <!-- Refresh -->
    <button mat-icon-button (click)="loadLeads()" matTooltip="Refresh">
      <mat-icon>refresh</mat-icon>
    </button>

    <!-- Bulk Actions (when leads selected) -->
    <div class="bulk-actions" *ngIf="selectedLeads.size > 0">
      <span class="selected-count">{{ selectedLeads.size }} selected</span>
      <button mat-button (click)="onBulkAssign()">Assign</button>
      <button mat-button color="warn" (click)="onBulkDelete()">Delete</button>
    </div>
  </div>

  <!-- Filters Panel (collapsible) -->
  <app-lead-filters
    *ngIf="showFilters"
    [selectedStatuses]="selectedStatuses"
    [selectedClassifications]="selectedClassifications"
    (filtersChange)="onFilterChange($event)">
  </app-lead-filters>

  <!-- Loading State -->
  <div class="loading" *ngIf="loading$ | async">
    <mat-spinner diameter="50"></mat-spinner>
    <p>Loading leads...</p>
  </div>

  <!-- Error State -->
  <div class="error" *ngIf="error$ | async as error">
    <mat-icon>error</mat-icon>
    <p>{{ error }}</p>
    <button mat-button (click)="loadLeads()">Try Again</button>
  </div>

  <!-- Empty State -->
  <div class="empty-state" *ngIf="(leads$ | async)?.length === 0 && !(loading$ | async)">
    <mat-icon>inbox</mat-icon>
    <h3>No leads yet</h3>
    <p>Create your first lead to get started</p>
    <button mat-raised-button color="primary" (click)="onNewLead()">
      New Lead
    </button>
  </div>

  <!-- Lead Table -->
  <app-lead-table
    *ngIf="(leads$ | async)?.length > 0"
    [leads]="leads$ | async"
    [sortBy]="sortBy"
    [sortOrder]="sortOrder"
    [selectedLeads]="selectedLeads"
    [selectAll]="selectAll"
    (rowClick)="onRowClick($event)"
    (sortChange)="onSortChange($event)"
    (selectAllChange)="onSelectAll()"
    (selectLeadChange)="onSelectLead($event)">
  </app-lead-table>

  <!-- Pagination -->
  <mat-paginator
    *ngIf="(pagination$ | async) as pagination"
    [length]="pagination.total"
    [pageSize]="pagination.limit"
    [pageIndex]="pagination.currentPage"
    [pageSizeOptions]="[10, 20, 50, 100]"
    (page)="onPageChange($event.pageIndex)"
    showFirstLastButtons>
  </mat-paginator>
</div>
```

---

### Component: `lead-table.component.ts`

```typescript
@Component({
  selector: 'app-lead-table',
  templateUrl: './lead-table.component.html',
  styleUrls: ['./lead-table.component.scss']
})
export class LeadTableComponent {
  @Input() leads: Lead[] = [];
  @Input() sortBy: string;
  @Input() sortOrder: 'asc' | 'desc';
  @Input() selectedLeads: Set<string>;
  @Input() selectAll: boolean;

  @Output() rowClick = new EventEmitter<Lead>();
  @Output() sortChange = new EventEmitter<string>();
  @Output() selectAllChange = new EventEmitter<void>();
  @Output() selectLeadChange = new EventEmitter<string>();

  displayedColumns: string[] = [
    'select',
    'name',
    'company',
    'job_title',
    'status',
    'classification',
    'score',
    'assigned_to',
    'created_at',
    'actions'
  ];

  getClassificationIcon(classification: string): string {
    const icons = {
      hot: '🔥',
      warm: '☀️',
      cold: '❄️'
    };
    return icons[classification] || '';
  }

  getClassificationColor(classification: string): string {
    const colors = {
      hot: 'red',
      warm: 'orange',
      cold: 'blue'
    };
    return colors[classification] || 'gray';
  }

  getStatusColor(status: string): string {
    const colors = {
      new: 'blue',
      contacted: 'cyan',
      qualified: 'green',
      converted: 'purple',
      unqualified: 'orange',
      lost: 'red'
    };
    return colors[status] || 'gray';
  }

  onRowClickHandler(event: Event, lead: Lead) {
    // Don't navigate if clicking checkbox or action buttons
    if ((event.target as HTMLElement).closest('.checkbox, .actions')) {
      return;
    }
    this.rowClick.emit(lead);
  }
}
```

### Template: `lead-table.component.html`

```html
<table mat-table [dataSource]="leads" class="lead-table">
  <!-- Checkbox Column -->
  <ng-container matColumnDef="select">
    <th mat-header-cell *matHeaderCellDef>
      <mat-checkbox
        [checked]="selectAll"
        [indeterminate]="selectedLeads.size > 0 && !selectAll"
        (change)="selectAllChange.emit()">
      </mat-checkbox>
    </th>
    <td mat-cell *matCellDef="let lead" class="checkbox">
      <mat-checkbox
        [checked]="selectedLeads.has(lead.id)"
        (change)="selectLeadChange.emit(lead.id)"
        (click)="$event.stopPropagation()">
      </mat-checkbox>
    </td>
  </ng-container>

  <!-- Name Column -->
  <ng-container matColumnDef="name">
    <th mat-header-cell *matHeaderCellDef (click)="sortChange.emit('name')">
      Name
      <mat-icon *ngIf="sortBy === 'name'">
        {{ sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward' }}
      </mat-icon>
    </th>
    <td mat-cell *matCellDef="let lead">
      <div class="lead-name">
        <span class="name">{{ lead.name }}</span>
        <span class="email">{{ lead.email }}</span>
      </div>
    </td>
  </ng-container>

  <!-- Company Column -->
  <ng-container matColumnDef="company">
    <th mat-header-cell *matHeaderCellDef (click)="sortChange.emit('company')">
      Company
    </th>
    <td mat-cell *matCellDef="let lead">{{ lead.company || '-' }}</td>
  </ng-container>

  <!-- Job Title Column -->
  <ng-container matColumnDef="job_title">
    <th mat-header-cell *matHeaderCellDef>Title</th>
    <td mat-cell *matCellDef="let lead">{{ lead.job_title || '-' }}</td>
  </ng-container>

  <!-- Status Column -->
  <ng-container matColumnDef="status">
    <th mat-header-cell *matHeaderCellDef>Status</th>
    <td mat-cell *matCellDef="let lead">
      <mat-chip [color]="getStatusColor(lead.status)" selected>
        {{ lead.status | titlecase }}
      </mat-chip>
    </td>
  </ng-container>

  <!-- Classification Column -->
  <ng-container matColumnDef="classification">
    <th mat-header-cell *matHeaderCellDef>Classification</th>
    <td mat-cell *matCellDef="let lead">
      <span
        *ngIf="lead.classification"
        class="classification"
        [style.color]="getClassificationColor(lead.classification)">
        {{ getClassificationIcon(lead.classification) }}
        {{ lead.classification | titlecase }}
      </span>
      <span *ngIf="!lead.classification" class="muted">-</span>
    </td>
  </ng-container>

  <!-- Score Column -->
  <ng-container matColumnDef="score">
    <th mat-header-cell *matHeaderCellDef (click)="sortChange.emit('qualification_score')">
      Score
    </th>
    <td mat-cell *matCellDef="let lead">
      <div *ngIf="lead.qualification_score" class="score">
        <mat-progress-spinner
          [value]="lead.qualification_score"
          diameter="40"
          mode="determinate">
        </mat-progress-spinner>
        <span class="score-value">{{ lead.qualification_score }}</span>
      </div>
      <span *ngIf="!lead.qualification_score" class="muted">-</span>
    </td>
  </ng-container>

  <!-- Assigned To Column -->
  <ng-container matColumnDef="assigned_to">
    <th mat-header-cell *matHeaderCellDef>Owner</th>
    <td mat-cell *matCellDef="let lead">
      <div *ngIf="lead.assigned_to" class="assigned-user">
        <mat-icon class="avatar">account_circle</mat-icon>
        <span>{{ lead.assigned_to.name }}</span>
      </div>
      <span *ngIf="!lead.assigned_to" class="muted">Unassigned</span>
    </td>
  </ng-container>

  <!-- Created At Column -->
  <ng-container matColumnDef="created_at">
    <th mat-header-cell *matHeaderCellDef (click)="sortChange.emit('created_at')">
      Created
    </th>
    <td mat-cell *matCellDef="let lead">
      {{ lead.created_at | date: 'short' }}
    </td>
  </ng-container>

  <!-- Actions Column -->
  <ng-container matColumnDef="actions">
    <th mat-header-cell *matHeaderCellDef></th>
    <td mat-cell *matCellDef="let lead" class="actions">
      <button mat-icon-button [matMenuTriggerFor]="menu">
        <mat-icon>more_vert</mat-icon>
      </button>
      <mat-menu #menu="matMenu">
        <button mat-menu-item (click)="$event.stopPropagation()">
          <mat-icon>edit</mat-icon>
          <span>Edit</span>
        </button>
        <button mat-menu-item (click)="$event.stopPropagation()">
          <mat-icon>person_add</mat-icon>
          <span>Assign</span>
        </button>
        <button mat-menu-item (click)="$event.stopPropagation()">
          <mat-icon>delete</mat-icon>
          <span>Delete</span>
        </button>
      </mat-menu>
    </td>
  </ng-container>

  <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
  <tr
    mat-row
    *matRowDef="let row; columns: displayedColumns;"
    (click)="onRowClickHandler($event, row)"
    class="clickable-row">
  </tr>
</table>
```

---

### NgRx Store

#### Actions (`lead.actions.ts`)
```typescript
export const loadLeads = createAction(
  '[Lead List] Load Leads',
  props<{ filters: Filters; pagination: Pagination }>()
);

export const loadLeadsSuccess = createAction(
  '[Lead API] Load Leads Success',
  props<{ leads: Lead[]; total: number }>()
);

export const loadLeadsFailure = createAction(
  '[Lead API] Load Leads Failure',
  props<{ error: string }>()
);
```

#### Reducer (`lead.reducer.ts`)
```typescript
export interface LeadState {
  leads: Lead[];
  loading: boolean;
  error: string | null;
  pagination: {
    total: number;
    limit: number;
    offset: number;
    currentPage: number;
  };
  filters: {
    search: string;
    statuses: string[];
    classifications: string[];
  };
}

const initialState: LeadState = {
  leads: [],
  loading: false,
  error: null,
  pagination: {
    total: 0,
    limit: 20,
    offset: 0,
    currentPage: 0
  },
  filters: {
    search: '',
    statuses: [],
    classifications: []
  }
};
```

---

## ✅ Critérios de Aceitação

### Funcional
- [ ] Página carrega e exibe lista de leads
- [ ] Tabela mostra colunas: select, name, company, job_title, status, classification, score, assigned_to, created_at, actions
- [ ] Search funciona (busca name, company, email)
- [ ] Filters funcionam (status, classification)
- [ ] Sorting funciona (name, company, score, created_at)
- [ ] Pagination funciona (prev, next, jump to page)
- [ ] Click em row navega para lead detail
- [ ] Checkbox selection funciona (individual e select all)
- [ ] Bulk actions aparecem quando leads selecionados
- [ ] "New Lead" button abre form

### Performance
- [ ] Página carrega em < 2s (100 leads)
- [ ] Search é debounced (300ms)
- [ ] Scroll suave
- [ ] Sem lag ao clicar

### Responsivo
- [ ] Desktop (> 1024px): tabela completa
- [ ] Tablet (768-1024px): colunas essenciais
- [ ] Mobile (< 768px): card list

### Loading & Error States
- [ ] Loading spinner enquanto carrega
- [ ] Error message se falha
- [ ] Empty state se sem leads
- [ ] Skeleton loading (opcional)

---

## 🔗 Dependências

- ✅ Marco 009 (Lead Model & API) - API deve estar pronta
- ✅ Angular Material instalado
- ✅ NgRx configurado
- ✅ Routing configurado

---

## 🚨 Riscos

### Risco 1: Performance com muitos leads
**Mitigação**: Virtual scrolling (CDK) ou paginação rigorosa

### Risco 2: Filtros complexos travam UI
**Mitigação**: Debounce + loading indicator

---

**Status**: 🔵 Pronto para Implementação
