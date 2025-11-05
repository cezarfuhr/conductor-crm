# Fase 3: Intelligence Layer
> Camada de inteligência com agentes de IA | Semanas 8-9 | 34 dias

---

## 🎯 Objetivo Geral da Fase

Implementar a **camada de inteligência** do CRM com agentes de IA especializados que automatizam tarefas, preveem resultados, e assistem vendedores em suas atividades diárias.

---

## 📋 Visão Geral

A Fase 3 transforma o CRM básico (Fase 2) em um **CRM inteligente e preditivo**, adicionando:

- **EmailAssistant_Agent**: Geração automática de emails personalizados
- **DealPredictor_Agent**: Previsão de win probability e close dates
- **AI Copilot Chat**: Assistente conversacional para queries e ações
- **Workflow Engine**: Automação de processos repetitivos
- **Dashboard Inteligente**: Insights e métricas em tempo real
- **Email Tracking**: Análise de engagement

---

## 🧩 Marcos da Fase 3

### **Marco 024: EmailAssistant_Agent v1** (5 dias)
Agente de IA que gera emails personalizados automaticamente.

**Key Features:**
- Geração de 3 variações de email
- Subject line suggestions
- Contexto de deal/contact/company
- Tone control (formal, casual, urgent)
- Integração com Conductor framework

**Tecnologias:** Python, Conductor, Claude 3.5 Sonnet

---

### **Marco 025: Email Composer UI** (4 dias)
Interface para compor emails com assistência de IA.

**Key Features:**
- Editor de email (WYSIWYG)
- Tabs com 3 variações geradas pela IA
- Edição manual das variações
- Preview antes de enviar
- Envio via Gmail API

**Tecnologias:** Angular, Angular Material, Quill.js (editor)

---

### **Marco 026: Email Tracking** (3 dias)
Sistema de tracking de opens, clicks e engagement.

**Key Features:**
- Pixel tracking para email opens
- Link tracking para clicks
- Webhooks para eventos
- Engagement score por contato
- Métricas na UI

**Tecnologias:** Python, FastAPI, Redis, Webhooks

---

### **Marco 027: DealPredictor_Agent v1** (5 dias)
Agente de IA que prevê probabilidade de fechamento de deals.

**Key Features:**
- Win probability (0-100%)
- Predicted close date
- Health score (0-100)
- Risk factors identification
- Recommended next actions

**Tecnologias:** Python, Conductor, Machine Learning (futuro)

---

### **Marco 028: Deal Intelligence UI** (3 dias)
Visualização de insights de IA sobre deals.

**Key Features:**
- Health score indicator (visual)
- Win probability gauge
- Risk alerts (cards)
- Recommended actions (checklist)
- Integration com Deal Detail Page

**Tecnologias:** Angular, Chart.js, Angular Material

---

### **Marco 029: Dashboard Principal** (4 dias)
Dashboard principal com métricas e insights.

**Key Features:**
- Key metrics cards (pipeline value, open deals, win rate)
- Pipeline chart (bar/funnel)
- Recent activities widget
- Top deals widget
- Quick actions

**Tecnologias:** Angular, Chart.js, NgRx

---

### **Marco 030: AI Copilot Chat** (5 dias)
Assistente conversacional para queries e ações rápidas.

**Key Features:**
- Chat widget (sidebar)
- Natural language queries ("Show me hot leads")
- Quick actions ("Create a deal for Acme Corp")
- Context-aware responses
- Multi-turn conversation

**Tecnologias:** Python, Conductor, Claude 3.5, WebSockets

---

### **Marco 031: Workflow Engine** (5 dias)
Sistema de automação de workflows.

**Key Features:**
- Trigger system (events: lead created, deal won, etc)
- Action executor (send email, create task, update field)
- 3 workflows pré-configurados
- Workflow builder UI (futuro)
- Execution history

**Tecnologias:** Python, Celery, MongoDB

---

## 🏗️ Arquitetura da Fase 3

```
┌────────────────────────────────────────────────────────────┐
│                      FRONTEND (Angular)                     │
├────────────────────────────────────────────────────────────┤
│  Dashboard  │  Email Composer  │  Deal Intelligence  │ Chat│
│             │  (with AI tabs)  │  (AI insights)      │     │
└─────┬───────┴──────┬───────────┴──────┬──────────────┴─────┘
      │              │                  │
      ↓              ↓                  ↓
┌────────────────────────────────────────────────────────────┐
│                    BACKEND (FastAPI)                        │
├────────────────────────────────────────────────────────────┤
│  Email Tracking  │  Dashboard API  │  Workflow Engine      │
│  (webhooks)      │  (aggregations) │  (trigger + actions)  │
└─────┬────────────┴──────┬──────────┴──────┬────────────────┘
      │                   │                 │
      ↓                   ↓                 ↓
┌────────────────────────────────────────────────────────────┐
│                   AI LAYER (Conductor)                      │
├────────────────────────────────────────────────────────────┤
│  EmailAssistant   │  DealPredictor  │  Copilot Chat        │
│  (email gen)      │  (predictions)  │  (conversational)    │
└─────┬─────────────┴──────┬──────────┴──────┬───────────────┘
      │                    │                 │
      ↓                    ↓                 ↓
┌────────────────────────────────────────────────────────────┐
│                       LLM PROVIDERS                         │
│          Claude 3.5 Sonnet  │  GPT-4 (backup)              │
└────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Novas Collections MongoDB

### Collection: email_tracking_events

```javascript
{
  _id: ObjectId,
  activity_id: ObjectId,  // Reference to activities (type: email)
  event_type: String,  // 'sent', 'delivered', 'opened', 'clicked', 'bounced'
  recipient_email: String,

  // Open tracking
  open_count: Number,
  first_opened_at: Date,
  last_opened_at: Date,

  // Click tracking
  clicks: [{
    url: String,
    clicked_at: Date,
    ip_address: String,
    user_agent: String
  }],

  // Metadata
  created_at: Date,
  metadata: Map  // Device, location, etc
}

// Indexes
db.email_tracking_events.createIndex({ activity_id: 1 })
db.email_tracking_events.createIndex({ recipient_email: 1, event_type: 1 })
```

### Collection: workflows

```javascript
{
  _id: ObjectId,
  name: String,  // "Auto-qualify new leads"
  description: String,

  // Trigger
  trigger: {
    type: String,  // 'entity_created', 'field_updated', 'scheduled'
    entity_type: String,  // 'lead', 'deal', etc
    conditions: Map  // Filters: {"status": "new", "source": "website"}
  },

  // Actions (sequential)
  actions: [{
    type: String,  // 'qualify_lead', 'send_email', 'create_task', 'update_field'
    config: Map,  // Action-specific config
    delay: Number  // Delay in seconds before executing
  }],

  // Status
  status: String,  // 'active', 'paused', 'archived'

  // Statistics
  execution_count: Number,
  last_executed_at: Date,
  success_count: Number,
  failure_count: Number,

  // Metadata
  created_at: Date,
  created_by: ObjectId,
  updated_at: Date
}

// Indexes
db.workflows.createIndex({ status: 1, "trigger.entity_type": 1 })
```

### Collection: workflow_executions

```javascript
{
  _id: ObjectId,
  workflow_id: ObjectId,

  // Trigger info
  triggered_by_entity_type: String,
  triggered_by_entity_id: ObjectId,
  triggered_at: Date,

  // Execution
  status: String,  // 'pending', 'running', 'completed', 'failed'
  started_at: Date,
  completed_at: Date,

  // Actions executed
  actions_executed: [{
    action_type: String,
    status: String,  // 'success', 'failed'
    result: Map,
    executed_at: Date,
    error: String
  }],

  // Error tracking
  error_message: String
}

// Indexes
db.workflow_executions.createIndex({ workflow_id: 1, triggered_at: -1 })
db.workflow_executions.createIndex({ status: 1 })
```

### Collection: ai_chat_conversations

```javascript
{
  _id: ObjectId,
  user_id: ObjectId,

  // Conversation
  messages: [{
    role: String,  // 'user', 'assistant'
    content: String,
    timestamp: Date,

    // If action was taken
    action_taken: {
      type: String,  // 'query', 'create_lead', 'update_deal'
      result: Map
    }
  }],

  // Context
  context: {
    current_page: String,  // '/deals/123'
    entity_type: String,
    entity_id: ObjectId
  },

  // Metadata
  started_at: Date,
  last_message_at: Date
}

// Indexes
db.ai_chat_conversations.createIndex({ user_id: 1, last_message_at: -1 })
```

---

## 📊 APIs da Fase 3

### EmailAssistant API

```
POST /api/v1/ai/email/generate
  - Generate email variations
  Request: {entity_type, entity_id, context, tone}
  Response: {variations: [email1, email2, email3]}

POST /api/v1/ai/email/improve
  - Improve existing email draft
  Request: {draft, instructions}
  Response: {improved_email}
```

### DealPredictor API

```
POST /api/v1/ai/deal/{deal_id}/predict
  - Predict deal outcome
  Response: {win_probability, predicted_close_date, health_score, risk_factors, actions}

GET /api/v1/ai/deal/{deal_id}/insights
  - Get all AI insights for deal
```

### Email Tracking API

```
GET /api/v1/tracking/pixel/{tracking_id}.png
  - Tracking pixel (1x1 transparent)

GET /api/v1/tracking/click/{link_id}
  - Track click and redirect

GET /api/v1/tracking/events/{activity_id}
  - Get tracking events for email

POST /api/v1/tracking/webhook
  - Receive events from email providers
```

### Dashboard API

```
GET /api/v1/dashboard/metrics
  - Key metrics summary
  Response: {pipeline_value, open_deals, win_rate, avg_deal_size, ...}

GET /api/v1/dashboard/pipeline-chart
  - Pipeline data for chart
  Response: {stages: [{stage, count, value}]}

GET /api/v1/dashboard/recent-activities
  - Recent activities across all entities
```

### AI Copilot API

```
POST /api/v1/ai/copilot/chat
  - Send message to copilot
  Request: {message, conversation_id, context}
  Response: {response, action_taken}

GET /api/v1/ai/copilot/suggestions
  - Get contextual suggestions
  Request: {current_page, entity_type, entity_id}
  Response: {suggestions: ["Create follow-up task", "Send email", ...]}
```

### Workflow API

```
GET /api/v1/workflows
  - List all workflows

POST /api/v1/workflows
  - Create workflow

PUT /api/v1/workflows/{id}
  - Update workflow

POST /api/v1/workflows/{id}/activate
  - Activate workflow

POST /api/v1/workflows/{id}/pause
  - Pause workflow

GET /api/v1/workflows/{id}/executions
  - Get execution history
```

---

## 🎨 UX/UI Specifications

### Email Composer

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ To: [contact@company.com]                       │
│ Subject: [AI-generated subject]                 │
├─────────────────────────────────────────────────┤
│ [Tab 1: Formal] [Tab 2: Casual] [Tab 3: Direct]│
├─────────────────────────────────────────────────┤
│                                                  │
│  [WYSIWYG Email Editor]                         │
│                                                  │
│  Hi {{name}},                                   │
│                                                  │
│  [AI-generated content...]                      │
│                                                  │
│  Best regards,                                  │
│  {{user.name}}                                  │
│                                                  │
├─────────────────────────────────────────────────┤
│ ✨ Regenerate with different tone               │
│ [Send]  [Schedule]  [Save Draft]               │
└─────────────────────────────────────────────────┘
```

### Deal Intelligence Card

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ 🤖 AI Insights                                  │
├─────────────────────────────────────────────────┤
│ Health Score: ████████░░ 85%  [Healthy]        │
│ Win Probability: 73%                            │
│ Predicted Close: Mar 15, 2025                   │
├─────────────────────────────────────────────────┤
│ ⚠️ Risk Factors:                                │
│  • No activity in 7 days                        │
│  • Competitor mentioned                         │
├─────────────────────────────────────────────────┤
│ ✅ Recommended Actions:                         │
│  1. [HIGH] Schedule follow-up call              │
│  2. [MED] Send pricing proposal                 │
│  3. [LOW] Connect on LinkedIn                   │
└─────────────────────────────────────────────────┘
```

### Dashboard

**Layout:**
```
┌──────────────────────────────────────────────────────────┐
│ Dashboard                                [Date Range ▼]  │
├──────────────────────────────────────────────────────────┤
│ ┌────────────┐ ┌────────────┐ ┌────────────┐           │
│ │Pipeline Val│ │Open Deals  │ │Win Rate    │           │
│ │R$ 1.2M     │ │47          │ │68%         │           │
│ │+12% ↗      │ │+5 this week│ │+3% ↗       │           │
│ └────────────┘ └────────────┘ └────────────┘           │
├──────────────────────────────────────────────────────────┤
│ Pipeline by Stage                                        │
│ ┌────────────────────────────────────────────┐          │
│ │ [====] Qualification (12)                  │          │
│ │ [========] Proposal (18)                   │          │
│ │ [======] Negotiation (10)                  │          │
│ │ [===] Closed Won (7)                       │          │
│ └────────────────────────────────────────────┘          │
├──────────────────────────────────────────────────────────┤
│ Recent Activities            │ Top Deals                │
│ • Email sent to Acme Corp    │ • Acme Deal - R$ 150k   │
│ • Deal moved to Negotiation  │ • TechCo - R$ 120k      │
│ • New lead created           │ • Startup - R$ 80k      │
└──────────────────────────────────────────────────────────┘
```

### AI Copilot Chat

**Layout:**
```
┌─────────────────────────────────────┐
│ 🤖 AI Copilot              [✕]      │
├─────────────────────────────────────┤
│                                      │
│ 👤 Show me hot leads                │
│                                      │
│ 🤖 I found 12 hot leads:             │
│    • Acme Corp (95 score)            │
│    • TechCo (88 score)               │
│    • Startup Inc (82 score)          │
│    [View All]                        │
│                                      │
│ 👤 Create a deal for Acme Corp      │
│                                      │
│ 🤖 Deal created! "Acme Corp Deal"   │
│    Value: R$ 150,000                 │
│    Stage: Qualification              │
│    [Open Deal]                       │
│                                      │
├─────────────────────────────────────┤
│ Type a message...          [Send →] │
└─────────────────────────────────────┘
```

---

## ✅ Critérios de Sucesso da Fase 3

### Performance
- [ ] EmailAssistant gera variações em <10s
- [ ] DealPredictor calcula insights em <5s
- [ ] Copilot responde em <3s
- [ ] Dashboard carrega em <2s
- [ ] Workflow executions <1min cada

### Qualidade AI
- [ ] Email variations são relevantes (user satisfaction >70%)
- [ ] Deal predictions accuracy >65% (vs real outcomes)
- [ ] Copilot entende 80%+ das queries
- [ ] False positive rate <15%

### Adoption
- [ ] 50%+ dos emails usam AI assistance
- [ ] 80%+ dos deals têm AI predictions ativas
- [ ] 30%+ dos usuários usam Copilot diariamente
- [ ] 3+ workflows ativos em produção

### Negócio
- [ ] Redução de 40% no tempo de composição de emails
- [ ] Aumento de 15% em email response rates
- [ ] Melhoria de 10% em win rate (graças a insights)
- [ ] Economia de 20 horas/semana em tarefas manuais

---

## 🚨 Riscos da Fase 3

### Risco 1: LLMs muito lentos
**Impact**: UX ruim se demorar >10s
**Mitigation**:
- Usar streaming responses
- Loading states bem desenhados
- Fallback para modelos mais rápidos (Claude Haiku)

### Risco 2: AI hallucinations
**Impact**: Emails incorretos, previsões erradas
**Mitigation**:
- Validação de outputs
- User sempre revisa antes de enviar
- Disclaimers ("AI-generated, please review")

### Risco 3: Custos de API altos
**Impact**: Budget estoura
**Mitigation**:
- Rate limiting (10 requests/min/user)
- Cache de respostas similares
- Monitoramento de custos em tempo real

### Risco 4: Workflows bugados
**Impact**: Ações executadas incorretamente
**Mitigation**:
- Dry-run mode para testar
- Logs detalhados de execuções
- Rollback capability
- User confirmation para ações críticas

---

## 📝 Dependências Técnicas

### Python Libraries
```
conductor-ai>=0.3.0
anthropic>=0.15.0
openai>=1.10.0
celery>=5.3.0
redis>=4.5.0
pandas>=2.0.0  # Para análises
```

### Frontend Libraries
```
@angular/cdk
chart.js
ng2-charts
quill  # WYSIWYG editor
socket.io-client  # Para chat real-time
```

### External Services
- Anthropic Claude API (primary LLM)
- OpenAI GPT-4 (backup)
- SendGrid (email tracking webhooks)
- Redis (cache + pub/sub)

---

## 📅 Timeline da Fase 3

**Semana 8:**
- Marco 024: EmailAssistant_Agent (dias 1-5)
- Marco 025: Email Composer UI (dias 1-4, paralelo)
- Marco 026: Email Tracking (dias 5-7)

**Semana 9:**
- Marco 027: DealPredictor_Agent (dias 1-5)
- Marco 028: Deal Intelligence UI (dias 1-3, paralelo)
- Marco 029: Dashboard (dias 4-7)

**Semana 10 (buffer):**
- Marco 030: AI Copilot Chat (dias 1-5)
- Marco 031: Workflow Engine (dias 1-5, paralelo)

---

## 🎯 Próximos Passos

Após a Fase 3:
- **Fase 4**: Integrations & Polish (Calendar, WhatsApp, Mobile)
- **Fase 5**: Deploy, Testing, Launch

---

**Status**: 🔵 Pronto para Especificação Detalhada
**Total Marcos**: 8
**Duração Estimada**: ~6 semanas (com paralelismo)
**Complexidade**: 🔥🔥🔥 Alta (AI-heavy)
