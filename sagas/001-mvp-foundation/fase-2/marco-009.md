# Marco 009: Lead Model & API
> Backend - Lead CRUD completo | 3 dias

**Responsável**: Backend Dev
**Revisor**: Tech Lead
**Status**: 🔵 Planejado

---

## 🎯 Objetivo

Implementar modelo de dados Lead no MongoDB e criar API REST completa (CRUD) para gestão de leads, incluindo validações, error handling e relacionamentos.

---

## 📋 Contexto

Este é o **primeiro marco de desenvolvimento** da Fase 2 e estabelece a fundação para todo sistema de leads. Um lead representa um potencial cliente que ainda não foi convertido em deal.

### Importância
- ✅ Base para LeadQualifier_Agent (marco 012)
- ✅ Primeiro contato entre frontend e backend
- ✅ Define padrões de API que serão replicados

---

## 🔧 Especificações Técnicas

### 1. Schema MongoDB

#### Collection: `leads`

```javascript
{
  // Primary Key
  _id: ObjectId,

  // Basic Info (Required)
  name: {
    type: String,
    required: true,
    minLength: 2,
    maxLength: 100,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    validate: emailValidator
  },

  // Contact Info (Optional)
  phone: {
    type: String,
    validate: phoneValidator // International format
  },
  company: {
    type: String,
    maxLength: 200
  },
  job_title: {
    type: String,
    maxLength: 100
  },

  // Acquisition
  source: {
    type: String,
    enum: ['website_form', 'linkedin', 'referral', 'cold_outreach', 'event', 'import', 'other'],
    default: 'website_form'
  },
  source_details: {
    type: String, // URL, campaign name, etc
    maxLength: 500
  },

  // Status
  status: {
    type: String,
    enum: ['new', 'contacted', 'qualified', 'converted', 'unqualified', 'lost'],
    default: 'new',
    index: true
  },

  // AI Qualification Fields (Set by LeadQualifier_Agent)
  qualification_score: {
    type: Number,
    min: 0,
    max: 100,
    default: null
  },
  classification: {
    type: String,
    enum: ['hot', 'warm', 'cold', null],
    default: null,
    index: true
  },
  qualification_reasons: {
    type: [String], // Array of reasons from AI
    default: []
  },
  next_actions: {
    type: [String], // AI suggested actions
    default: []
  },
  qualification_date: {
    type: Date,
    default: null
  },

  // Enrichment Data (Set by Auto-Enrichment)
  enriched_data: {
    company_size: Number,
    company_industry: String,
    company_revenue: Number,
    company_location: String,
    linkedin_url: String,
    twitter_url: String,
    website: String,
    technologies_used: [String],
    enrichment_source: String, // 'clearbit', 'manual', etc
    enriched_at: Date
  },

  // Assignment
  assigned_to: {
    type: ObjectId,
    ref: 'users',
    index: true,
    default: null
  },
  assigned_at: {
    type: Date,
    default: null
  },

  // Conversion
  converted_to_deal_id: {
    type: ObjectId,
    ref: 'deals',
    default: null
  },
  converted_at: {
    type: Date,
    default: null
  },

  // Metadata
  created_at: {
    type: Date,
    default: Date.now,
    index: true
  },
  updated_at: {
    type: Date,
    default: Date.now
  },
  created_by: {
    type: ObjectId,
    ref: 'users',
    required: true
  },

  // Soft Delete
  deleted_at: {
    type: Date,
    default: null
  },

  // Tags & Custom
  tags: {
    type: [String],
    default: []
  },
  custom_fields: {
    type: Map,
    of: Schema.Types.Mixed
  }
}
```

#### Indexes
```javascript
// Compound Indexes
leads.createIndex({ email: 1 }, { unique: true })
leads.createIndex({ status: 1, classification: 1 })
leads.createIndex({ assigned_to: 1, status: 1 })
leads.createIndex({ created_at: -1 })
leads.createIndex({ company: 1 })
leads.createIndex({ deleted_at: 1 }) // For soft delete queries

// Text Search
leads.createIndex(
  { name: "text", company: "text", email: "text" },
  { weights: { name: 3, company: 2, email: 1 } }
)
```

---

### 2. API Endpoints

#### `POST /api/v1/leads`
**Criar novo lead**

**Request Body**:
```json
{
  "name": "João Silva",
  "email": "joao.silva@techcorp.com",
  "phone": "+55 11 98765-4321",
  "company": "TechCorp Inc",
  "job_title": "CTO",
  "source": "linkedin",
  "source_details": "InMail campaign Q4 2025"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "name": "João Silva",
    "email": "joao.silva@techcorp.com",
    "phone": "+55 11 98765-4321",
    "company": "TechCorp Inc",
    "job_title": "CTO",
    "source": "linkedin",
    "source_details": "InMail campaign Q4 2025",
    "status": "new",
    "qualification_score": null,
    "classification": null,
    "assigned_to": null,
    "created_at": "2025-11-05T14:30:00Z",
    "updated_at": "2025-11-05T14:30:00Z"
  },
  "meta": {
    "qualification_job_id": "job_abc123" // Job ID for async qualification
  }
}
```

**Side Effects**:
- ✅ Trigger LeadQualifier_Agent (async job)
- ✅ Trigger Auto-Enrichment (async job)
- ✅ Create activity log (lead created)

**Validations**:
- Email format válido
- Email único (não existe outro lead com mesmo email)
- Name não vazio
- Phone formato internacional (se fornecido)
- Source é um valor válido do enum

**Error Responses**:
- 400 Bad Request: Validation error
- 409 Conflict: Email já existe
- 500 Internal Server Error

---

#### `GET /api/v1/leads`
**Listar leads com filtros e paginação**

**Query Parameters**:
```
?status=new,qualified
&classification=hot,warm
&assigned_to=507f1f77bcf86cd799439011
&source=linkedin
&created_after=2025-11-01
&created_before=2025-11-30
&search=techcorp
&sort_by=created_at
&sort_order=desc
&limit=20
&offset=0
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "name": "João Silva",
      "email": "joao.silva@techcorp.com",
      "company": "TechCorp Inc",
      "job_title": "CTO",
      "status": "new",
      "classification": "hot",
      "qualification_score": 88,
      "assigned_to": {
        "id": "user123",
        "name": "Maria Santos"
      },
      "created_at": "2025-11-05T14:30:00Z"
    }
  ],
  "meta": {
    "total": 150,
    "limit": 20,
    "offset": 0,
    "has_more": true
  }
}
```

**Filtros Suportados**:
- `status`: Array de statuses (OR)
- `classification`: Array de classifications (OR)
- `assigned_to`: User ID ou "unassigned"
- `source`: Lead source
- `created_after`: ISO date
- `created_before`: ISO date
- `search`: Full-text search (name, company, email)

**Sorting**:
- `sort_by`: created_at, updated_at, name, company, qualification_score
- `sort_order`: asc, desc

**Performance**:
- Use indexes para todos filtros
- Pagination obrigatória (max limit: 100)
- Cache de 30s para queries repetidas

---

#### `GET /api/v1/leads/:id`
**Buscar lead específico**

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "name": "João Silva",
    "email": "joao.silva@techcorp.com",
    "phone": "+55 11 98765-4321",
    "company": "TechCorp Inc",
    "job_title": "CTO",
    "source": "linkedin",
    "source_details": "InMail campaign Q4 2025",
    "status": "qualified",
    "classification": "hot",
    "qualification_score": 88,
    "qualification_reasons": [
      "Empresa de tecnologia (fit com ICP)",
      "Cargo de decisão (CTO)",
      "Empresa média porte (150 funcionários)"
    ],
    "next_actions": [
      "Ligar em até 5 minutos",
      "Mencionar integração Salesforce",
      "Oferecer demo técnica"
    ],
    "enriched_data": {
      "company_size": 150,
      "company_industry": "Software",
      "company_revenue": 5000000,
      "linkedin_url": "https://linkedin.com/in/joaosilva",
      "enriched_at": "2025-11-05T14:30:10Z"
    },
    "assigned_to": {
      "id": "user123",
      "name": "Maria Santos",
      "email": "maria@empresa.com"
    },
    "assigned_at": "2025-11-05T14:31:00Z",
    "created_at": "2025-11-05T14:30:00Z",
    "updated_at": "2025-11-05T14:32:00Z",

    // Related data
    "activities": [
      {
        "id": "act123",
        "type": "note",
        "description": "Lead criado via LinkedIn",
        "created_at": "2025-11-05T14:30:00Z"
      }
    ],
    "activities_count": 1
  }
}
```

**Include Related Data**:
- Activities (últimas 10)
- Assigned user info
- Converted deal (se convertido)

**Error Responses**:
- 404 Not Found: Lead não existe
- 403 Forbidden: Sem permissão para ver este lead

---

#### `PUT /api/v1/leads/:id`
**Atualizar lead (partial update)**

**Request Body** (campos opcionais):
```json
{
  "phone": "+55 11 99999-8888",
  "status": "contacted",
  "assigned_to": "user456",
  "tags": ["priority", "enterprise"]
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    // Lead object completo atualizado
  }
}
```

**Business Rules**:
- Não permitir alterar email (usar outro endpoint para isso)
- Não permitir alterar qualification_score/classification (só IA)
- Status transitions válidas:
  - new → contacted, qualified, unqualified, lost
  - contacted → qualified, unqualified, lost
  - qualified → converted
- Ao mudar assigned_to, criar activity log

**Side Effects**:
- Log activity (lead updated)
- Se status mudou, log status change

---

#### `DELETE /api/v1/leads/:id`
**Soft delete de lead**

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Lead deleted successfully"
}
```

**Implementation**:
- Soft delete: set `deleted_at = now()`
- Não remover do banco
- Queries padrão devem filtrar `deleted_at IS NULL`

---

#### `POST /api/v1/leads/:id/convert`
**Converter lead em deal**

**Request Body**:
```json
{
  "deal_title": "TechCorp - CRM Implementation",
  "deal_value": 85000,
  "expected_close_date": "2025-12-31"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "deal_id": "deal123",
    "lead_id": "507f1f77bcf86cd799439011"
  }
}
```

**Business Rules**:
- Lead deve estar em status "qualified"
- Criar deal automaticamente
- Criar contact a partir do lead
- Atualizar lead: status = "converted", converted_to_deal_id, converted_at
- Log activity (lead converted)

---

### 3. Validações

#### Email Validation
```javascript
function validateEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}
```

#### Phone Validation
```javascript
function validatePhone(phone) {
  // Aceita formato internacional: +55 11 98765-4321
  const regex = /^\+?[1-9]\d{1,14}$/;
  return regex.test(phone.replace(/[\s-]/g, ''));
}
```

#### Name Validation
```javascript
function validateName(name) {
  return name.trim().length >= 2 && name.trim().length <= 100;
}
```

---

### 4. Error Handling

#### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
```

#### Error Codes
- `VALIDATION_ERROR`: Input validation failed
- `DUPLICATE_EMAIL`: Email already exists
- `NOT_FOUND`: Lead not found
- `FORBIDDEN`: No permission
- `INTERNAL_ERROR`: Server error

---

### 5. Logging

#### Structured Logging
```json
{
  "timestamp": "2025-11-05T14:30:00Z",
  "level": "info",
  "action": "lead_created",
  "user_id": "user123",
  "lead_id": "507f1f77bcf86cd799439011",
  "data": {
    "email": "joao.silva@techcorp.com",
    "source": "linkedin"
  }
}
```

#### Log Events
- lead_created
- lead_updated
- lead_deleted
- lead_converted
- lead_qualification_started
- lead_enrichment_started

---

## ✅ Critérios de Aceitação

### Funcional
- [ ] Criar lead via API retorna 201 e objeto completo
- [ ] Email duplicado retorna 409 Conflict
- [ ] Listar leads retorna paginação correta
- [ ] Filtros funcionam (status, classification, assigned_to)
- [ ] Busca full-text funciona (name, company, email)
- [ ] Buscar lead por ID retorna dados completos + activities
- [ ] Atualizar lead funciona (partial update)
- [ ] Status transitions são validadas
- [ ] Soft delete funciona (deleted_at set, não aparece em listagens)
- [ ] Converter lead cria deal e atualiza lead
- [ ] Assigned_to aceita user_id válido ou null

### Performance
- [ ] POST /leads responde em < 200ms
- [ ] GET /leads responde em < 300ms (100 leads)
- [ ] GET /leads/:id responde em < 200ms

### Qualidade
- [ ] Validações de email, phone, name funcionam
- [ ] Error handling retorna mensagens claras
- [ ] Logging estruturado em todos endpoints
- [ ] Todos indexes criados no MongoDB

### Segurança
- [ ] Apenas usuários autenticados podem acessar API
- [ ] User só vê leads que tem permissão
- [ ] Inputs são sanitizados (prevent injection)

---

## 🔗 Dependências

### Pré-requisitos
- ✅ MongoDB configurado (Fase 1, Marco 005)
- ✅ FastAPI setup (Fase 1, Marco 005)
- ✅ Authentication middleware (Fase 1, Marco 005)
- ✅ User model existe

### Bloqueia
- ⚠️ Marco 010 (Lead List UI) - depende desta API
- ⚠️ Marco 011 (Lead Creation Flow) - depende desta API
- ⚠️ Marco 012 (LeadQualifier_Agent) - depende deste schema

---

## 🚨 Riscos

### Risco 1: Performance com muitos leads
**Mitigação**:
- Indexes desde início
- Pagination obrigatória
- Cache de queries repetidas

### Risco 2: Email validation muito restritiva
**Mitigação**:
- Usar regex padrão do setor
- Logs de validations failed
- Permitir override manual (admin)

### Risco 3: Soft delete complicar queries
**Mitigação**:
- Helper functions para queries padrão
- Documentar bem
- Index em deleted_at

---

## 📋 Tasks (Checklist de Implementação)

### Setup
- [ ] Criar arquivo `models/lead.py`
- [ ] Definir schema Pydantic
- [ ] Criar indexes no MongoDB

### Endpoints
- [ ] Implementar POST /leads
- [ ] Implementar GET /leads (com filtros)
- [ ] Implementar GET /leads/:id
- [ ] Implementar PUT /leads/:id
- [ ] Implementar DELETE /leads/:id
- [ ] Implementar POST /leads/:id/convert

### Validations
- [ ] Email validator
- [ ] Phone validator
- [ ] Name validator
- [ ] Status transition validator

### Tests Manuais
- [ ] Testar criar lead (Postman)
- [ ] Testar validations (email inválido, duplicado)
- [ ] Testar filtros (status, classification)
- [ ] Testar busca full-text
- [ ] Testar pagination
- [ ] Testar update
- [ ] Testar soft delete
- [ ] Testar convert

### Documentation
- [ ] Documentar API no OpenAPI/Swagger
- [ ] Comentários no código
- [ ] README com exemplos

---

## 📚 Referências

- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [MongoDB Schema Design Best Practices](https://www.mongodb.com/developer/article/schema-design-best-practices/)
- [REST API Best Practices](https://restfulapi.net/)

---

**Versão**: 1.0
**Atualizado**: 2025-11-05
**Status**: 🔵 Pronto para Implementação
