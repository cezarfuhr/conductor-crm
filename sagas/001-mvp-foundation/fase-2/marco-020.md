# Marco 020: Contact & Company Models
> Backend - Modelos de Contacts e Companies | 3 dias

**Responsável**: Backend Dev
**Revisor**: Tech Lead
**Status**: 🔵 Planejado

---

## 🎯 Objetivo

Implementar modelos e APIs para Contacts (pessoas) e Companies (empresas), com relacionamentos entre si e com Leads/Deals, deduplicação básica.

---

## 🗄️ MongoDB Schemas

### Collection: contacts

```javascript
{
  _id: ObjectId,

  // Basic Info
  first_name: String,
  last_name: String,
  full_name: String,  // first_name + last_name (indexed)
  email: String,  // Primary email (unique)
  emails: [String],  // Additional emails
  phone: String,  // Primary phone
  phones: [String],  // Additional phones

  // Job Info
  job_title: String,
  company_id: ObjectId,  // Reference to companies
  company_name: String,  // Denormalized for performance

  // Social
  linkedin_url: String,
  twitter_handle: String,

  // Relationships
  lead_ids: [ObjectId],  // Leads relacionados
  deal_ids: [ObjectId],  // Deals relacionados

  // Ownership
  owner_id: ObjectId,
  team_id: ObjectId,

  // Tags & Custom
  tags: [String],
  custom_fields: Map,

  // Notes
  notes: String,  // Internal notes

  // Metadata
  created_at: Date,
  updated_at: Date,
  created_by: ObjectId,
  last_contact_at: Date,  // Última interação

  // Source
  source: String,  // 'manual', 'import', 'enrichment'

  // Soft Delete
  deleted_at: Date
}

// Indexes
db.contacts.createIndex({ email: 1 }, { unique: true, sparse: true })
db.contacts.createIndex({ full_name: "text" })
db.contacts.createIndex({ company_id: 1 })
db.contacts.createIndex({ owner_id: 1 })
```

### Collection: companies

```javascript
{
  _id: ObjectId,

  // Basic Info
  name: String,  // Company name (indexed)
  domain: String,  // Website domain (unique)
  website_url: String,
  logo_url: String,

  // Details
  description: String,
  industry: String,
  sector: String,

  // Size
  employee_count: Number,
  employee_range: String,  // '10-50', '50-200', etc

  // Location
  address: String,
  city: String,
  state: String,
  country: String,
  timezone: String,

  // Business Info
  founded_year: Number,
  annual_revenue: Number,  // In cents
  raised: Number,  // Funding raised

  // Social
  linkedin_handle: String,
  twitter_handle: String,

  // Tags & Tech
  tags: [String],
  tech_stack: [String],  // Technologies used

  // Relationships
  contact_ids: [ObjectId],  // Contacts nesta empresa
  lead_ids: [ObjectId],
  deal_ids: [ObjectId],

  // Ownership
  owner_id: ObjectId,
  team_id: ObjectId,

  // Enrichment
  enriched_data: Map,  // Data from Clearbit, etc
  enrichment_status: String,
  enriched_at: Date,

  // Metadata
  created_at: Date,
  updated_at: Date,
  created_by: ObjectId,
  last_activity_at: Date,

  // Custom Fields
  custom_fields: Map,

  // Soft Delete
  deleted_at: Date
}

// Indexes
db.companies.createIndex({ name: "text", domain: "text" })
db.companies.createIndex({ domain: 1 }, { unique: true, sparse: true })
db.companies.createIndex({ owner_id: 1 })
```

---

## 📝 Pydantic Models

```python
# src/models/contact.py

from pydantic import BaseModel, EmailStr, validator
from typing import Optional, List
from datetime import datetime

class ContactBase(BaseModel):
    first_name: str
    last_name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    job_title: Optional[str] = None
    company_id: Optional[str] = None
    linkedin_url: Optional[str] = None
    tags: List[str] = []
    notes: Optional[str] = None

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()

class ContactCreate(ContactBase):
    owner_id: str

class ContactUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    job_title: Optional[str] = None
    company_id: Optional[str] = None
    tags: Optional[List[str]] = None
    notes: Optional[str] = None

class ContactInDB(ContactBase):
    id: str
    full_name: str
    company_name: Optional[str] = None
    owner_id: str
    created_at: datetime
    updated_at: datetime

# src/models/company.py

class CompanyBase(BaseModel):
    name: str
    domain: Optional[str] = None
    website_url: Optional[str] = None
    description: Optional[str] = None
    industry: Optional[str] = None
    employee_count: Optional[int] = None
    employee_range: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    tags: List[str] = []

class CompanyCreate(CompanyBase):
    owner_id: str

class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    domain: Optional[str] = None
    website_url: Optional[str] = None
    description: Optional[str] = None
    industry: Optional[str] = None
    employee_count: Optional[int] = None
    tags: Optional[List[str]] = None

class CompanyInDB(CompanyBase):
    id: str
    owner_id: str
    contact_count: int = 0
    deal_count: int = 0
    created_at: datetime
    updated_at: datetime
```

---

## 🔌 API Endpoints

### Contacts

```python
POST /api/v1/contacts - Create contact
GET /api/v1/contacts - List contacts (filters: company_id, search, tags)
GET /api/v1/contacts/:id - Get single contact
PUT /api/v1/contacts/:id - Update contact
DELETE /api/v1/contacts/:id - Delete contact (soft)

# Deduplication
POST /api/v1/contacts/merge - Merge duplicate contacts
GET /api/v1/contacts/duplicates - Find potential duplicates
```

### Companies

```python
POST /api/v1/companies - Create company
GET /api/v1/companies - List companies (filters: industry, size, search)
GET /api/v1/companies/:id - Get single company
PUT /api/v1/companies/:id - Update company
DELETE /api/v1/companies/:id - Delete company (soft)

# Auto-complete
GET /api/v1/companies/search?q=<query> - Search companies (for autocomplete)

# Enrichment
POST /api/v1/companies/:id/enrich - Trigger enrichment for company
```

---

## 🔍 Deduplication Logic

### Contact Deduplication

Match criteria (in order):
1. **Email exact match** (highest priority)
2. **Full name + company** (fuzzy match >90%)
3. **Phone + company**

```python
def find_duplicate_contacts(contact: Contact) -> List[Contact]:
    duplicates = []

    # 1. Email match
    if contact.email:
        email_matches = db.contacts.find({'email': contact.email})
        duplicates.extend(email_matches)

    # 2. Name + Company match (fuzzy)
    if contact.company_id:
        name_matches = db.contacts.find({
            'company_id': contact.company_id,
            'full_name': {'$regex': contact.full_name, '$options': 'i'}
        })
        # Filter by similarity > 90%
        duplicates.extend([c for c in name_matches if similarity(c.full_name, contact.full_name) > 0.9])

    return list(set(duplicates))

def merge_contacts(primary_id: str, duplicate_ids: List[str]):
    """
    Merge duplicate contacts into primary
    - Transfer all relationships (leads, deals, activities)
    - Merge fields (keep non-null values)
    - Soft delete duplicates
    """
    pass
```

### Company Deduplication

Match criteria:
1. **Domain exact match** (highest priority)
2. **Name fuzzy match >95%**

---

## ✅ Critérios de Aceitação

- [ ] Contact model implementado
- [ ] Company model implementado
- [ ] CRUD completo para ambos
- [ ] Relacionamentos funcionam (contact ↔ company)
- [ ] Deduplication detecta duplicados
- [ ] Merge de duplicados funciona
- [ ] Search/autocomplete funciona
- [ ] Indexes criados
- [ ] Validações de campos
- [ ] Soft delete implementado
- [ ] Testes unitários

---

## 🔗 Dependências

- ✅ Marco 005: Database & Backend Setup
- ✅ Marco 009: Lead Model
- ✅ Marco 017: Deal Model

---

**Status**: 🔵 Pronto para Implementação
**Estimativa**: 3 dias
