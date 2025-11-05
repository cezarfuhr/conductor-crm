# 🚀 SAGA 001: MVP Foundation
> Cronograma Macro de Execução - Fundação do CRM AI-First

**Período**: 3 meses (12 semanas)
**Objetivo**: MVP funcional com 50 empresas beta
**Budget**: R$ 231.000
**Status**: 🔵 Planejado

---

## 📊 Visão Geral da Saga

```
SAGA 001: MVP FOUNDATION
├─ Fase 1: Setup & Fundação       (Semanas 1-2)   → 10 marcos
├─ Fase 2: Core Features          (Semanas 3-7)   → 13 marcos
├─ Fase 3: Intelligence Layer     (Semanas 8-9)   → 8 marcos
├─ Fase 4: Integration & Scale    (Semanas 10-11) → 6 marcos
└─ Fase 5: Launch & Validation    (Semana 12)     → 6 marcos

TOTAL: 43 Marcos
```

---

## 📅 Cronograma de Marcos

### 🔷 FASE 1: Setup & Fundação (Semanas 1-2)

#### Marco 001: Aprovação Executiva
- [ ] Validar documentação de requisitos com stakeholders
- [ ] Aprovar budget de R$ 231k
- [ ] Definir founders e papéis
- **Duração**: 2 dias
- **Responsável**: Founders/CEO

#### Marco 002: Formação do Time MVP
- [ ] Contratar/alocar Tech Lead
- [ ] Contratar/alocar Backend Dev (Python)
- [ ] Contratar/alocar Frontend Dev (Angular)
- [ ] Contratar/alocar Designer (part-time)
- **Duração**: 1 semana
- **Responsável**: CEO/CTO

#### Marco 003: Infraestrutura Base
- [ ] Setup repositórios (GitHub, branches, PR templates)
- [ ] Configurar CI/CD pipeline (GitHub Actions)
- [ ] Setup ambientes (Dev, Staging, Prod)
- [ ] Configurar monitoring e alerts (Sentry)
- **Duração**: 3 dias
- **Responsável**: Tech Lead

#### Marco 004: Docker & Containers Setup
- [ ] Criar Dockerfiles (backend, frontend)
- [ ] Docker Compose para dev local
- [ ] Setup docker-compose.dev.yml
- [ ] Testar build e run dos containers
- **Duração**: 2 dias
- **Responsável**: Tech Lead

#### Marco 005: Testing Framework Setup
- [ ] Setup pytest (backend) com coverage
- [ ] Setup Jasmine/Jest (frontend)
- [ ] Configurar test runners no CI/CD
- [ ] Estabelecer padrões de testes (TDD guidelines)
- **Duração**: 2 dias
- **Responsável**: Tech Lead

#### Marco 006: Inicialização Conductor Core
- [ ] Inicializar git submodules (conductor, gateway, web)
- [ ] Configurar submodules para versão estável
- [ ] Testar integração entre componentes
- [ ] Documentar setup local
- **Duração**: 2 dias
- **Responsável**: Tech Lead

#### Marco 007: Database & Backend Setup
- [ ] Setup MongoDB (local Docker + cloud)
- [ ] Definir schema inicial (leads, deals, contacts)
- [ ] Setup FastAPI boilerplate
- [ ] Configurar authentication (JWT) com testes
- **Duração**: 3 dias
- **Responsável**: Backend Dev

#### Marco 008: Frontend Scaffold
- [ ] Setup Angular 20 project
- [ ] Configurar Angular Material UI
- [ ] Implementar auth guards e routing
- [ ] Setup NgRx (state management)
- **Duração**: 3 dias
- **Responsável**: Frontend Dev

#### Marco 009: Integrações Externas Setup
- [ ] Cadastrar APIs (Clearbit, OpenAI, etc)
- [ ] Configurar API keys em .env
- [ ] Setup rate limiting e retry logic
- [ ] Testar conectividade e mocks
- **Duração**: 2 dias
- **Responsável**: Backend Dev

#### Marco 010: Design System
- [ ] Definir paleta de cores e tipografia
- [ ] Criar componentes base (buttons, cards, inputs)
- [ ] Documentar design tokens
- [ ] Protótipos low-fi principais telas
- **Duração**: 3 dias
- **Responsável**: Designer

---

### 🔷 FASE 2: Core Features (Semanas 3-7)

#### Marco 011: Lead Model & API
- [ ] Implementar modelo Lead (backend)
- [ ] CRUD endpoints para leads
- [ ] Validações e error handling
- [ ] Testes unitários (cobertura > 80%)
- **Duração**: 3 dias
- **Responsável**: Backend Dev

#### Marco 012: Lead List UI
- [ ] Página de listagem de leads
- [ ] Filtros básicos (status, data)
- [ ] Busca por nome/empresa
- [ ] Paginação e testes de componentes
- **Duração**: 3 dias
- **Responsável**: Frontend Dev

#### Marco 013: Lead Creation Flow
- [ ] Formulário de criação de lead
- [ ] Validações frontend
- [ ] Integração com backend
- [ ] Testes E2E do fluxo completo
- **Duração**: 2 dias
- **Responsável**: Frontend Dev

#### Marco 014: LeadQualifier_Agent v1
- [ ] Implementar agente básico de qualificação
- [ ] Integração com Conductor core
- [ ] Cálculo de score (0-100)
- [ ] Classificação Hot/Warm/Cold + testes
- **Duração**: 5 dias
- **Responsável**: Tech Lead + Backend Dev

#### Marco 015: Auto-Enrichment Pipeline
- [ ] Integração Clearbit API
- [ ] Enrichment automático ao criar lead
- [ ] Armazenar dados enriquecidos
- [ ] Retry logic e error handling
- **Duração**: 3 dias
- **Responsável**: Backend Dev

#### Marco 016: Lead Qualification UI
- [ ] Card de qualificação (score, classification)
- [ ] Explicação dos motivos (IA insights)
- [ ] Next actions sugeridas
- [ ] Visual indicators (cores, badges)
- **Duração**: 3 dias
- **Responsável**: Frontend Dev

#### Marco 017: Lead Detail Page
- [ ] Página de detalhes do lead
- [ ] Timeline de atividades
- [ ] Informações enriquecidas
- [ ] Edição inline de campos
- **Duração**: 4 dias
- **Responsável**: Frontend Dev

#### Marco 018: Lead Import (CSV)
- [ ] Upload de arquivo CSV
- [ ] Parser e validação com feedback
- [ ] Bulk creation de leads
- [ ] Relatório de importação com erros
- **Duração**: 3 dias
- **Responsável**: Backend Dev

#### Marco 019: Deal Model & API
- [ ] Implementar modelo Deal (backend)
- [ ] CRUD endpoints para deals
- [ ] Relacionamento Lead → Deal
- [ ] Estágios de pipeline + testes
- **Duração**: 3 dias
- **Responsável**: Backend Dev

#### Marco 020: Pipeline Kanban View
- [ ] Kanban board visual
- [ ] Drag & drop entre estágios
- [ ] Deal cards com info essencial
- [ ] Animações e transições
- **Duração**: 5 dias
- **Responsável**: Frontend Dev

#### Marco 021: Deal Detail Page
- [ ] Página de detalhes do deal
- [ ] Timeline de atividades
- [ ] Notas e anexos
- [ ] Relacionamento com contatos
- **Duração**: 4 dias
- **Responsável**: Frontend Dev

#### Marco 022: Contact & Company Models
- [ ] Modelos Contact e Company (backend)
- [ ] CRUD endpoints
- [ ] Relacionamentos com leads/deals
- [ ] Deduplicação básica + testes
- **Duração**: 3 dias
- **Responsável**: Backend Dev

#### Marco 023: Contact Management UI
- [ ] Lista de contatos e busca
- [ ] Página de detalhes do contato
- [ ] Company profile page
- [ ] Edição de informações
- **Duração**: 4 dias
- **Responsável**: Frontend Dev

---

### 🔷 FASE 3: Intelligence Layer (Semanas 8-9)

#### Marco 024: Activity Logging System
- [ ] Sistema de log de atividades (backend)
- [ ] Tipos: call, email, meeting, note
- [ ] Timeline component (reusável)
- [ ] Filtros por tipo + testes
- **Duração**: 3 dias
- **Responsável**: Backend + Frontend

#### Marco 025: Gmail Integration
- [ ] OAuth flow do Gmail
- [ ] Sync de emails (two-way)
- [ ] Parser de emails
- [ ] Email storage e indexação
- **Duração**: 5 dias
- **Responsável**: Backend Dev

#### Marco 026: EmailAssistant_Agent v1
- [ ] Agente de composição de emails
- [ ] Geração de 3 variações
- [ ] Subject line suggestions
- [ ] Contexto de deal/contato + testes
- **Duração**: 5 dias
- **Responsável**: Tech Lead

#### Marco 027: Email Composer UI
- [ ] Interface de composição
- [ ] Seleção de variações (tabs)
- [ ] Editor de email
- [ ] Preview e envio
- **Duração**: 4 dias
- **Responsável**: Frontend Dev

#### Marco 028: Email Tracking
- [ ] Tracking de opens e clicks
- [ ] Webhooks para eventos
- [ ] Exibir métricas na UI
- [ ] Engagement score
- **Duração**: 3 dias
- **Responsável**: Backend + Frontend

#### Marco 029: DealPredictor_Agent v1
- [ ] Agente de previsão de deals
- [ ] Win probability calculation
- [ ] Predicted close date
- [ ] Risk factors identification + testes
- **Duração**: 5 dias
- **Responsável**: Tech Lead

#### Marco 030: Deal Intelligence UI
- [ ] Deal health score display
- [ ] Win probability indicator
- [ ] Risk alerts
- [ ] Recommended actions
- **Duração**: 3 dias
- **Responsável**: Frontend Dev

#### Marco 031: Dashboard Principal
- [ ] Dashboard page layout
- [ ] Key metrics cards (pipeline value, win rate)
- [ ] Pipeline chart (visual)
- [ ] Recent activities widget
- **Duração**: 4 dias
- **Responsável**: Frontend Dev

---

### 🔷 FASE 4: Integration & Scale (Semanas 10-11)

#### Marco 032: AI Copilot Chat
- [ ] Chat widget (sidebar)
- [ ] Agente de chat conversacional
- [ ] Queries básicas (metrics, leads)
- [ ] Quick actions + testes
- **Duração**: 5 dias
- **Responsável**: Tech Lead + Frontend

#### Marco 033: Workflow Engine
- [ ] Sistema de workflows (backend)
- [ ] 3 workflows pré-configurados
- [ ] Trigger system (events)
- [ ] Action executor + testes
- **Duração**: 5 dias
- **Responsável**: Backend Dev

#### Marco 034: Google Calendar Integration
- [ ] OAuth flow Calendar
- [ ] Sync de eventos
- [ ] Criar eventos via CRM
- [ ] Reminders e notifications
- **Duração**: 3 dias
- **Responsável**: Backend Dev

#### Marco 035: Mobile Responsive
- [ ] Adaptar todas telas para mobile
- [ ] Touch gestures (swipe, drag)
- [ ] Mobile navigation
- [ ] PWA setup (service workers)
- **Duração**: 5 dias
- **Responsável**: Frontend Dev

#### Marco 036: Notifications System
- [ ] Push notifications (web)
- [ ] Email notifications
- [ ] Notification preferences
- [ ] Smart prioritization (IA)
- **Duração**: 4 dias
- **Responsável**: Backend + Frontend

#### Marco 037: User Settings & Preferences
- [ ] Profile settings
- [ ] Integration settings
- [ ] Notification preferences
- [ ] API keys management
- **Duração**: 3 dias
- **Responsável**: Frontend Dev

---

### 🔷 FASE 5: Launch & Validation (Semana 12)

#### Marco 038: Performance Optimization
- [ ] Backend: query optimization, caching (Redis)
- [ ] Frontend: lazy loading, code splitting
- [ ] Image optimization e CDN
- [ ] Lighthouse score > 90
- **Duração**: 3 dias
- **Responsável**: Tech Lead

#### Marco 039: Error Handling & UX Polish
- [ ] Error pages (404, 500)
- [ ] Loading states consistentes
- [ ] Empty states com CTAs
- [ ] Success/error toasts e feedback
- **Duração**: 3 dias
- **Responsável**: Frontend Dev + Designer

#### Marco 040: Testing & QA Final
- [ ] Testes E2E completos (principais fluxos)
- [ ] Bug bash com todo time
- [ ] Cross-browser testing
- [ ] Load testing e performance
- **Duração**: 4 dias
- **Responsável**: Todo o time

#### Marco 041: Documentation & Onboarding
- [ ] User documentation (help center)
- [ ] API documentation
- [ ] Onboarding guides e tutorials
- [ ] Video walkthrough
- **Duração**: 3 dias
- **Responsável**: Product + Designer

#### Marco 042: Analytics & Monitoring
- [ ] Setup Mixpanel/Amplitude
- [ ] Event tracking (funnel, retention)
- [ ] Error monitoring (Sentry config final)
- [ ] Performance monitoring (APM)
- **Duração**: 2 dias
- **Responsável**: Backend Dev

#### Marco 043: Beta Launch
- [ ] Soft launch (10 empresas) - 3 dias
- [ ] Hotfixes críticos - 2 dias
- [ ] Beta launch público (50 empresas) - 2 dias
- [ ] Success metrics tracking e feedback
- **Duração**: 1 semana
- **Responsável**: Todo o time + CEO

---

## 📊 Métricas de Sucesso da Saga

### KPIs Técnicos
- [ ] MVP 100% funcional (todas features core)
- [ ] Test coverage > 70% (backend + frontend)
- [ ] Page load time < 2s
- [ ] API response time < 500ms
- [ ] Uptime > 99%
- [ ] Zero bugs críticos

### KPIs de Produto
- [ ] 50 empresas beta onboarded
- [ ] Time to first value < 5 minutos
- [ ] Feature adoption (IA) > 70%
- [ ] NPS > 40 (beta)
- [ ] Daily active rate > 60%

### KPIs de Negócio
- [ ] Product-Market Fit score > 40%
- [ ] 80%+ beta users convert to paid
- [ ] Churn beta < 15%
- [ ] 3+ testimonials positivos

---

## 🎯 Dependências Críticas

### Antes de Começar
1. ✅ Documentação de requisitos aprovada
2. ⬜ Budget aprovado (R$ 231k)
3. ⬜ Time contratado (4 pessoas)
4. ⬜ API keys obtidas (OpenAI, Clearbit, etc)
5. ⬜ Infraestrutura cloud configurada

### Durante Execução
- **Frameworks**: Conductor core estável
- **APIs**: Clearbit, OpenAI/Anthropic disponíveis
- **Design**: Protótipos high-fi disponíveis semana 2
- **Feedback**: Acesso a design partners desde semana 6
- **Testing**: Testes unitários contínuos, E2E a partir semana 8

---

## 🚨 Riscos e Mitigações

### Risco 1: IA não entrega qualidade esperada
**Mitigação**: Testar agentes desde semana 3, iterar rápido, ter fallback manual

### Risco 2: Atraso no desenvolvimento
**Mitigação**: Priorizar features core (Leads + Email + Deals), cortar secundárias

### Risco 3: Time incompleto ou turnover
**Mitigação**: Tech Lead assume múltiplos papéis, documentação contínua

### Risco 4: Beta users não engajam
**Mitigação**: Onboarding ativo (calls 1-on-1), coletar feedback semanal

### Risco 5: Integração Conductor complexa
**Mitigação**: Prototipar integração na semana 1, ter suporte do core team

---

## 📈 Milestones Principais

```
Semana 2:  ✅ Setup Completo (Docker + CI/CD + Testes)
Semana 4:  ✅ Lead Management Funcional (+ testes)
Semana 6:  ✅ Deal Pipeline Funcional (+ testes)
Semana 8:  ✅ Email AI Funcional (CORE DIFERENCIAL)
Semana 9:  ✅ Dashboard + IA Predictive
Semana 11: ✅ Integration + Mobile + Workflows
Semana 12: ✅ Beta Launch (50 empresas)
```

---

## 🔄 Próxima Saga

**SAGA 002: Growth & Scale** (planejada após validação MVP)
- Período: Meses 4-6
- Objetivo: 200 empresas, R$ 600k ARR
- Features: Call tracking, MeetingAssistant, WhatsApp, Analytics avançado

---

## 📝 Notas Importantes

### Sobre Testes
- **Testes unitários**: Contínuos desde semana 1 (cada feature)
- **Testes integração**: Durante desenvolvimento (backend ↔ frontend)
- **Testes E2E**: A partir semana 8 (fluxos críticos)
- **QA Final**: Semana 12 (bug bash completo)

### Sobre Docker/Containers
- **Setup**: Semana 1 (Marco 004)
- **Uso**: Durante todo desenvolvimento (dev local + CI/CD)
- **Otimização**: Semana 10 (se necessário)

### Sobre Performance
- **Pensar**: Desde o início (design de queries, caching strategy)
- **Monitorar**: Durante todo desenvolvimento (performance budget)
- **Otimizar**: Semana 10 (refinamento final)

---

## 📞 Contatos

**Tech Lead**: [Nome]
**Product Manager**: [Nome]
**CEO**: [Nome]

**Reuniões**:
- Daily standup: 9h30 (15 min)
- Sprint planning: Segunda 10h (2h)
- Sprint review: Sexta 15h (1h)
- Retrospectiva: Sexta 16h (1h)

---

**Status**: 🔵 Planejado
**Início Previsto**: [Data]
**Fim Previsto**: [Data + 12 semanas]
**Budget**: R$ 231.000
**Versão**: 2.0 (revisado)
**Última Atualização**: 2025-11-05
