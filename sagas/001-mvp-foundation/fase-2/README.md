# 🏗️ FASE 2: Core Features
> Especificação Detalhada - Semanas 3-7 | 15 Marcos

**Período**: Semanas 3-7 (5 semanas)
**Objetivo**: Implementar funcionalidades core do CRM (Leads, Deals, Contacts)
**Time**: Backend Dev, Frontend Dev, Tech Lead, Designer
**Status**: 🔵 Planejado

---

## 📊 Visão Geral

A Fase 2 é o **coração do MVP**. Aqui construímos as 3 entidades fundamentais do CRM:
1. **Leads** - Captura e qualificação com IA
2. **Deals** - Pipeline de vendas
3. **Contacts & Companies** - Gestão de relacionamentos

### Diferencial IA
- ✅ LeadQualifier_Agent (Marco 012) - Qualificação automática
- ✅ Auto-Enrichment (Marco 013) - Enriquecimento de dados
- ✅ Gmail Integration (Marco 023) - Sincronização inteligente

---

## 🎯 Objetivos da Fase

### Objetivo Principal
**Entregar sistema funcional de gestão de leads e deals com inteligência artificial**

### Objetivos Específicos
1. ✅ Lead Management completo (captura, qualificação, detalhes, import)
2. ✅ Deal Pipeline visual e funcional (Kanban)
3. ✅ Contact & Company Management
4. ✅ Activity Logging centralizado
5. ✅ Integração Gmail bidirecional

---

## 📅 Cronograma Detalhado

### Semana 3: Lead Management Foundation
- **Marco 009**: Lead Model & API (3 dias)
- **Marco 010**: Lead List UI (3 dias)
- **Marco 011**: Lead Creation Flow (2 dias)

### Semana 4: Lead Intelligence (IA)
- **Marco 012**: LeadQualifier_Agent v1 (5 dias)
- **Marco 013**: Auto-Enrichment Pipeline (3 dias)

### Semana 5: Lead UI & Import
- **Marco 014**: Lead Qualification UI (3 dias)
- **Marco 015**: Lead Detail Page (4 dias)
- **Marco 016**: Lead Import (CSV) (3 dias)

### Semana 6: Deal Management
- **Marco 017**: Deal Model & API (3 dias)
- **Marco 018**: Pipeline Kanban View (5 dias)
- **Marco 019**: Deal Detail Page (4 dias)

### Semana 7: Contacts & Integration
- **Marco 020**: Contact & Company Models (3 dias)
- **Marco 021**: Contact Management UI (4 dias)
- **Marco 022**: Activity Logging System (3 dias)
- **Marco 023**: Gmail Integration (5 dias)

---

## 🏗️ Arquitetura da Fase

```
┌─────────────────────────────────────────────────┐
│                  FRONTEND (Angular)              │
├─────────────────────────────────────────────────┤
│                                                  │
│  Lead List  │  Lead Detail  │  Pipeline Kanban  │
│  Lead Form  │  Contact List │  Deal Detail      │
│                                                  │
└──────────────────┬──────────────────────────────┘
                   │ REST API
┌──────────────────▼──────────────────────────────┐
│                BACKEND (FastAPI)                 │
├─────────────────────────────────────────────────┤
│                                                  │
│  Lead CRUD  │  Deal CRUD  │  Contact CRUD       │
│  Activity Logging  │  Gmail Sync                │
│                                                  │
├─────────────────────────────────────────────────┤
│               IA LAYER (Conductor)               │
├─────────────────────────────────────────────────┤
│                                                  │
│  LeadQualifier_Agent  │  Auto-Enrichment        │
│                                                  │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│              DATABASE (MongoDB)                  │
├─────────────────────────────────────────────────┤
│                                                  │
│  leads          │  deals          │  contacts   │
│  companies      │  activities     │  emails     │
│                                                  │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│            EXTERNAL INTEGRATIONS                 │
├─────────────────────────────────────────────────┤
│  Clearbit API  │  Gmail API  │  OpenAI/Claude   │
└─────────────────────────────────────────────────┘
```

---

## 🗂️ Estrutura de Dados

### Collections MongoDB

#### 1. Collection: `leads`
```javascript
{
  _id: ObjectId,
  name: String,
  email: String,
  phone: String,
  company: String,
  job_title: String,
  source: String,
  status: Enum['new', 'qualified', 'contacted', 'converted', 'lost'],

  // IA Fields
  qualification_score: Number (0-100),
  classification: Enum['hot', 'warm', 'cold'],
  qualification_reasons: Array<String>,
  next_actions: Array<String>,

  // Enrichment
  enriched_data: {
    company_size: Number,
    company_industry: String,
    company_revenue: Number,
    linkedin_url: String,
    ...
  },

  // Metadata
  created_at: Date,
  updated_at: Date,
  created_by: ObjectId (User),
  assigned_to: ObjectId (User)
}
```

#### 2. Collection: `deals`
```javascript
{
  _id: ObjectId,
  title: String,
  value: Number,
  currency: String,
  stage: Enum['qualified', 'demo_scheduled', 'proposal_sent', 'negotiation', 'closed_won', 'closed_lost'],
  probability: Number (0-100),

  // Relationships
  lead_id: ObjectId,
  contact_ids: Array<ObjectId>,
  company_id: ObjectId,

  // Dates
  expected_close_date: Date,
  actual_close_date: Date,
  stage_entered_at: Date,

  // Metadata
  created_at: Date,
  updated_at: Date,
  owner_id: ObjectId (User),

  // Custom fields
  notes: String,
  tags: Array<String>
}
```

#### 3. Collection: `contacts`
```javascript
{
  _id: ObjectId,
  name: String,
  email: String,
  phone: String,
  job_title: String,

  // Relationship
  company_id: ObjectId,

  // Social
  linkedin_url: String,
  twitter_url: String,

  // Metadata
  created_at: Date,
  updated_at: Date
}
```

#### 4. Collection: `companies`
```javascript
{
  _id: ObjectId,
  name: String,
  website: String,
  industry: String,
  size: Number,
  revenue: Number,

  // Address
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    zip: String
  },

  // Metadata
  created_at: Date,
  updated_at: Date
}
```

#### 5. Collection: `activities`
```javascript
{
  _id: ObjectId,
  type: Enum['call', 'email', 'meeting', 'note', 'task'],
  subject: String,
  description: String,

  // Relationships
  lead_id: ObjectId (optional),
  deal_id: ObjectId (optional),
  contact_id: ObjectId (optional),

  // Email specific
  email_data: {
    from: String,
    to: Array<String>,
    cc: Array<String>,
    message_id: String,
    thread_id: String,
    html_body: String,
    text_body: String
  },

  // Metadata
  created_at: Date,
  created_by: ObjectId (User)
}
```

---

## 🔌 APIs da Fase

### Lead APIs

#### `POST /api/v1/leads`
Criar novo lead
- **Input**: Lead data
- **Output**: Lead object + qualification job_id
- **Side-effect**: Trigger LeadQualifier_Agent

#### `GET /api/v1/leads`
Listar leads com filtros
- **Query params**: status, classification, created_after, assigned_to, limit, offset
- **Output**: Paginated list of leads

#### `GET /api/v1/leads/:id`
Buscar lead específico
- **Output**: Lead object + activities timeline

#### `PUT /api/v1/leads/:id`
Atualizar lead
- **Input**: Partial lead data
- **Output**: Updated lead object

#### `DELETE /api/v1/leads/:id`
Deletar lead (soft delete)
- **Output**: Success message

#### `POST /api/v1/leads/:id/convert`
Converter lead em deal
- **Input**: Deal data
- **Output**: Deal object

#### `POST /api/v1/leads/import`
Import CSV de leads
- **Input**: CSV file (multipart/form-data)
- **Output**: Import job_id + async processing

### Deal APIs

#### `POST /api/v1/deals`
Criar novo deal
- **Input**: Deal data
- **Output**: Deal object

#### `GET /api/v1/deals`
Listar deals
- **Query params**: stage, owner_id, value_min, value_max, limit, offset
- **Output**: Paginated list of deals

#### `GET /api/v1/deals/:id`
Buscar deal específico
- **Output**: Deal object + related contacts + activities

#### `PUT /api/v1/deals/:id`
Atualizar deal
- **Input**: Partial deal data
- **Output**: Updated deal object

#### `PUT /api/v1/deals/:id/stage`
Mover deal para outro estágio
- **Input**: { stage: string }
- **Output**: Updated deal object
- **Side-effect**: Log activity

### Contact & Company APIs

#### `POST /api/v1/contacts`
Criar contato

#### `GET /api/v1/contacts`
Listar contatos

#### `GET /api/v1/contacts/:id`
Buscar contato

#### `PUT /api/v1/contacts/:id`
Atualizar contato

#### `POST /api/v1/companies`
Criar empresa

#### `GET /api/v1/companies`
Listar empresas

#### `GET /api/v1/companies/:id`
Buscar empresa

### Activity APIs

#### `POST /api/v1/activities`
Criar atividade

#### `GET /api/v1/activities`
Listar atividades
- **Query params**: lead_id, deal_id, contact_id, type

### Gmail Integration APIs

#### `GET /api/v1/integrations/gmail/auth`
Iniciar OAuth flow do Gmail

#### `GET /api/v1/integrations/gmail/callback`
Callback OAuth

#### `POST /api/v1/integrations/gmail/sync`
Sincronizar emails manualmente

#### `GET /api/v1/integrations/gmail/status`
Status da sincronização

---

## 🎨 UX/UI da Fase

### Páginas a serem criadas

1. **Lead List Page** (`/leads`)
   - Tabela de leads
   - Filtros (status, classification, data)
   - Busca
   - Ações em massa
   - Botão "New Lead"

2. **Lead Detail Page** (`/leads/:id`)
   - Header com dados principais
   - Card de qualificação IA
   - Timeline de atividades
   - Ações (convert to deal, edit, delete)

3. **Lead Form** (Modal ou Page)
   - Formulário de criação/edição
   - Validações frontend
   - Auto-save (opcional)

4. **Pipeline Page** (`/pipeline`)
   - Kanban board (5 colunas)
   - Drag & drop de deals
   - Filtros (owner, value range)
   - Deal cards com info essencial

5. **Deal Detail Page** (`/deals/:id`)
   - Header com dados principais
   - Timeline de atividades
   - Related contacts
   - Notes & attachments

6. **Contact List Page** (`/contacts`)
   - Tabela de contatos
   - Busca
   - Filtros

7. **Contact Detail Page** (`/contacts/:id`)
   - Dados do contato
   - Company info
   - Related deals
   - Activity timeline

---

## 🧪 Critérios de Aceitação da Fase

### Must Have (Obrigatório)
- [ ] ✅ Lead CRUD completo funcionando
- [ ] ✅ LeadQualifier_Agent retorna score e classification
- [ ] ✅ Auto-enrichment funciona com Clearbit
- [ ] ✅ Lead List UI responsiva e funcional
- [ ] ✅ Lead Detail page com timeline
- [ ] ✅ CSV import processa mínimo 100 leads
- [ ] ✅ Deal CRUD completo funcionando
- [ ] ✅ Pipeline Kanban com drag & drop funcional
- [ ] ✅ Deal Detail page completa
- [ ] ✅ Contact & Company CRUD funcionando
- [ ] ✅ Activity Logging registra todas ações
- [ ] ✅ Gmail sync bidirecional (enviar/receber)

### Should Have (Desejável)
- [ ] Lead deduplication automática
- [ ] Bulk actions em Lead List
- [ ] Deal probability auto-update ao mudar stage
- [ ] Contact deduplication
- [ ] Email thread view

### Could Have (Opcional)
- [ ] Lead scoring histórico (gráfico)
- [ ] Deal forecast view
- [ ] Contact merge
- [ ] Email templates

### Won't Have (Não nesta fase)
- ❌ Advanced filters (fase 3)
- ❌ Custom fields (fase 3)
- ❌ Reports (fase 3)
- ❌ Automações visuais (fase 3)

---

## 📦 Entregáveis da Fase

### Backend
- [ ] 30+ API endpoints funcionais
- [ ] 5 collections MongoDB com schemas
- [ ] LeadQualifier_Agent integrado com Conductor
- [ ] Auto-enrichment pipeline com Clearbit
- [ ] Gmail OAuth + sync funcionando
- [ ] Activity logging automático

### Frontend
- [ ] 7 páginas/views implementadas
- [ ] 15+ componentes Angular reutilizáveis
- [ ] NgRx store para leads, deals, contacts
- [ ] Serviços API para todas entidades
- [ ] Drag & drop funcional no Kanban

### IA
- [ ] LeadQualifier_Agent v1 (score + classification)
- [ ] Enrichment automático com Clearbit
- [ ] Email parsing inteligente

---

## 🚨 Riscos da Fase

### Risco 1: LeadQualifier_Agent não atinge precisão esperada
**Probabilidade**: Média
**Impacto**: Alto
**Mitigação**:
- Testar com dataset real desde marco 012
- Ter fallback de scoring manual
- Iterar prompt engineering

### Risco 2: Gmail API rate limits
**Probabilidade**: Alta
**Impacto**: Médio
**Mitigação**:
- Implementar batching de emails
- Queue system (Celery)
- Incremental sync

### Risco 3: Performance com grande volume de leads
**Probabilidade**: Média
**Impacto**: Médio
**Mitigação**:
- Indexação MongoDB desde início
- Paginação em todas listas
- Lazy loading no frontend

### Risco 4: Drag & drop complexo no Kanban
**Probabilidade**: Média
**Impacto**: Baixo
**Mitigação**:
- Usar biblioteca pronta (ng-dnd, dnd-kit)
- Prototipar antes de implementar
- Fallback: botões de "move stage"

---

## 🔗 Dependências

### Dependências Externas
- ✅ Fase 1 completa (setup, auth, DB)
- ✅ Conductor core funcionando
- ✅ Clearbit API key ativa
- ✅ Gmail API OAuth configurado
- ✅ OpenAI/Claude API key

### Dependências Internas
- Marco 009 → Marco 010, 011
- Marco 012 → Marco 014
- Marco 013 → Marco 014
- Marco 017 → Marco 018, 019
- Marco 020 → Marco 021
- Marco 022 → usado por todos

---

## 📋 Checklist de Conclusão da Fase

### Backend
- [ ] Todos endpoints testados manualmente (Postman/Insomnia)
- [ ] MongoDB indexes criados
- [ ] Error handling implementado
- [ ] Logging estruturado
- [ ] API documentation (OpenAPI/Swagger)

### Frontend
- [ ] Todas páginas navegáveis
- [ ] Loading states implementados
- [ ] Error handling (toasts)
- [ ] Responsive (mobile testado)
- [ ] Componentes documentados

### IA
- [ ] LeadQualifier_Agent testado com 50+ leads reais
- [ ] Enrichment testado com 20+ empresas
- [ ] Gmail sync testado com 100+ emails

### Integração
- [ ] Frontend ↔ Backend integrado
- [ ] Backend ↔ Conductor integrado
- [ ] Backend ↔ Clearbit integrado
- [ ] Backend ↔ Gmail integrado

### Qualidade
- [ ] Code review de todos PRs
- [ ] Documentação de decisões técnicas
- [ ] Logs de bugs encontrados e resolvidos

---

## 📊 Métricas de Sucesso

### Performance
- [ ] API response time < 500ms (p95)
- [ ] Frontend FCP < 2s
- [ ] Lead list carrega 100 leads em < 1s

### Funcionalidade
- [ ] Lead qualification accuracy > 70% (manual validation)
- [ ] Enrichment success rate > 80%
- [ ] Gmail sync sem perda de emails

### UX
- [ ] Navegação intuitiva (teste com 3 usuários)
- [ ] Zero crashes críticos
- [ ] Feedback visual em todas ações

---

## 📚 Documentos da Fase

Especificações detalhadas por marco:

1. [Marco 009: Lead Model & API](./marco-009.md)
2. [Marco 010: Lead List UI](./marco-010.md)
3. [Marco 011: Lead Creation Flow](./marco-011.md)
4. [Marco 012: LeadQualifier_Agent v1](./marco-012.md)
5. [Marco 013: Auto-Enrichment Pipeline](./marco-013.md)
6. [Marco 014: Lead Qualification UI](./marco-014.md)
7. [Marco 015: Lead Detail Page](./marco-015.md)
8. [Marco 016: Lead Import (CSV)](./marco-016.md)
9. [Marco 017: Deal Model & API](./marco-017.md)
10. [Marco 018: Pipeline Kanban View](./marco-018.md)
11. [Marco 019: Deal Detail Page](./marco-019.md)
12. [Marco 020: Contact & Company Models](./marco-020.md)
13. [Marco 021: Contact Management UI](./marco-021.md)
14. [Marco 022: Activity Logging System](./marco-022.md)
15. [Marco 023: Gmail Integration](./marco-023.md)

---

**Versão**: 1.0
**Data**: 2025-11-05
**Responsável**: Tech Lead + Product Manager
**Status**: 🔵 Especificação Completa
