# 🔄 Arquitetura Corrigida - Submódulos como Parte da Solução

**Data:** 2025-11-06
**Status:** ✅ ARQUITETURA CORRIGIDA
**Versão:** 2.0 (Revisada)

---

## ❌ ERRO CONCEITUAL IDENTIFICADO E CORRIGIDO

### O que estava ERRADO na primeira versão:

Eu tratei os submódulos Conductor (`conductor/conductor`, `conductor/conductor-gateway`, `conductor/conductor-web`) como **serviços externos** que precisavam ser "integrados" ao CRM.

**Isso estava INCORRETO!**

### A Realidade CORRETA:

Os submódulos **SÃO PARTE INTEGRAL** da solução Conductor CRM. Eles não são serviços externos - são componentes que rodam JUNTOS na mesma stack Docker.

---

## ✅ ARQUITETURA REAL

```
┌──────────────────────────────────────────────────────────────────────┐
│                    CONDUCTOR CRM (Solução Única)                     │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌────────────────┐    ┌──────────────────┐   ┌─────────────────┐  │
│  │  CRM Backend   │───→│ Conductor        │──→│ Conductor       │  │
│  │  (FastAPI)     │    │ Gateway          │   │ API Engine      │  │
│  │                │    │ (Submódulo)      │   │ (Submódulo)     │  │
│  │  Port 8001     │    │ Ports 5006/8006  │   │ Port 8000       │  │
│  └────────────────┘    └──────────────────┘   └─────────────────┘  │
│         │                      │                       │             │
│         ↓                      ↓                       ↓             │
│  ┌────────────────┐    ┌──────────────────┐   ┌─────────────────┐  │
│  │  MongoDB       │    │ MongoDB          │   │ Agent           │  │
│  │  (CRM Data)    │    │ (Gateway Data)   │   │ Definitions     │  │
│  │  (Externo)     │    │ (Externo)        │   │ (Local)         │  │
│  └────────────────┘    └──────────────────┘   └─────────────────┘  │
│                                                                       │
│  ┌────────────────┐                                                  │
│  │  Redis         │                                                  │
│  │  (Cache/Jobs)  │                                                  │
│  │  Port 6379     │                                                  │
│  └────────────────┘                                                  │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
         TUDO roda na mesma rede Docker: conductor-crm-network
```

---

## 🏗️ Componentes da Solução

### 1. Conductor API Engine (Submódulo)
**Localização:** `conductor/conductor/`
**Dockerfile:** ✅ Já existe
**Porta:** 8000
**Função:** Motor de orquestração de IA
- Carrega agent definitions
- Constrói prompts com contexto
- Executa LLM providers (Claude, Gemini, etc.)
- Gerencia conversation history

### 2. Conductor Gateway (Submódulo)
**Localização:** `conductor/conductor-gateway/`
**Dockerfile:** ✅ Já existe
**Portas:** 5006 (HTTP API) + 8006 (MCP Server)
**Função:** Backend-for-Frontend
- REST API + SSE streaming
- Job queue para execução assíncrona
- Gerenciamento de screenplays e personas
- Proxy HTTP para Conductor API

### 3. CRM Backend (Aplicação Principal)
**Localização:** `src/backend/`
**Dockerfile:** Precisa ser criado
**Porta:** 8001
**Função:** Lógica de negócio do CRM
- CRUD de leads, deals, contacts
- Autenticação e autorização
- Notificações
- Orquestração de chamadas ao Gateway

### 4. Redis (Infraestrutura)
**Imagem:** `redis:7-alpine`
**Porta:** 6379
**Função:** Cache e fila de jobs

### 5. MongoDB (Externo - Não no compose)
**Localização:** Externa (conforme solicitado)
**Função:** Persistência de dados
- `conductor`: Dados do Conductor API
- `conductor_gateway`: Dados do Gateway
- `conductor_crm`: Dados do CRM

---

## 📁 Estrutura de Diretórios

```
conductor-crm/                       # ← Projeto principal
├── conductor/                       # ← Submódulos (parte da solução)
│   ├── conductor/                   # Conductor API Engine
│   │   ├── Dockerfile              # ✅ Build da imagem API
│   │   ├── src/                     # Código Python
│   │   └── docker-compose.yml       # Compose standalone (referência)
│   │
│   ├── conductor-gateway/           # Conductor Gateway
│   │   ├── Dockerfile              # ✅ Build da imagem Gateway
│   │   ├── src/                     # Código Python
│   │   └── docker-compose.yml       # Compose standalone (referência)
│   │
│   └── conductor-web/               # Conductor Web (opcional)
│       ├── Dockerfile              # ✅ Build da imagem Web
│       └── src/                     # Código Angular
│
├── conductor-agents/                # Agent definitions (CRM-specific)
│   ├── EmailAssistant_CRM_Agent/
│   │   └── persona.md
│   ├── LeadQualifier_CRM_Agent/
│   │   └── persona.md
│   └── DealPredictor_CRM_Agent/
│       └── persona.md
│
├── src/
│   ├── backend/                     # CRM Backend
│   │   ├── app/
│   │   └── Dockerfile              # TODO: Criar
│   └── frontend/                    # CRM Frontend (Angular)
│
├── docker-compose.yml              # ❌ ANTIGO (incorreto)
├── docker-compose.revised.yml      # ✅ NOVO (correto)
└── .env                             # Variáveis de ambiente
```

---

## 🔧 Dockerfiles Existentes nos Submódulos

### Conductor API (`conductor/conductor/Dockerfile`)
```dockerfile
FROM python:3.11-slim
WORKDIR /app
EXPOSE 8000
# ... Poetry install
CMD ["python", "-m", "uvicorn", "src.server:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Conductor Gateway (`conductor/conductor-gateway/Dockerfile`)
```dockerfile
FROM python:3.11-slim
WORKDIR /app
EXPOSE 8080  # Porta padrão (sobrescrita por env var PORT=5006)
EXPOSE 8006  # MCP Server
# ... Poetry install
CMD ["uvicorn", "src.api.app:create_app", "--factory", "--host", "0.0.0.0", "--port", "8080"]
```

**IMPORTANTE:** O Gateway usa variável `PORT` para sobrescrever a porta 8080 para 5006 em produção.

---

## 🚀 Como Funciona a Stack Completa

### 1. Inicialização

```bash
# Pré-requisito: MongoDB rodando externamente
# Ex: mongodb://localhost:27017

# Start stack completa
docker-compose -f docker-compose.revised.yml up -d

# Ordem de inicialização (gerenciada por depends_on):
# 1. Redis (independente)
# 2. Conductor API (depende de MongoDB externo)
# 3. Conductor Gateway (depende de Conductor API)
# 4. CRM Backend (depende de Gateway + Redis)
```

### 2. Fluxo de Requisição AI

```
Usuário no Frontend
    ↓
    📱 HTTP Request: POST /api/v1/ai/email/generate
    ↓
CRM Backend (localhost:8001)
    ↓ Valida autenticação
    ↓ Busca lead no MongoDB (CRM)
    ↓
    📤 HTTP Request: POST http://conductor-gateway:5006/api/execute
    ↓
Conductor Gateway (internal network)
    ↓ Cria job
    ↓ Salva metadata no MongoDB (Gateway)
    ↓
    📤 HTTP Request: POST http://conductor-api:8000/conductor/execute
    ↓
Conductor API (internal network)
    ↓ Carrega agent definition de /app/agents/EmailAssistant_CRM_Agent
    ↓ Carrega persona.md
    ↓ Carrega conversation history
    ↓ Constrói prompt completo
    ↓
    📤 API Call: Claude API
    ↓
Claude responde com 3 variações de email
    ↓
    ⬅️ Retorna para Conductor API
    ↓ Salva em conversation history
    ↓
    ⬅️ Retorna para Gateway
    ↓ Salva resultado no MongoDB (Gateway)
    ↓
    ⬅️ Retorna para CRM Backend
    ↓ Pode salvar no MongoDB (CRM) se necessário
    ↓
    ⬅️ Retorna para Frontend
    ↓
Usuário vê 3 variações de email 🎉
```

### 3. Comunicação entre Containers

Todos os containers estão na **mesma rede Docker** (`conductor-crm-network`):

```yaml
# CRM Backend pode acessar Gateway via:
http://conductor-gateway:5006

# Gateway pode acessar API via:
http://conductor-api:8000

# CRM Backend pode acessar Redis via:
redis://redis:6379/0
```

**DNS interno do Docker** resolve os nomes dos containers automaticamente.

---

## 🔑 Variáveis de Ambiente Necessárias

### .env (na raiz do projeto)

```bash
# ===========================================================================
# MongoDB (Externo - compartilhado por todos)
# ===========================================================================
MONGODB_URI=mongodb://localhost:27017

# Databases usados:
# - conductor              (Conductor API data)
# - conductor_gateway      (Gateway data)
# - conductor_crm          (CRM data)

# ===========================================================================
# AI Providers
# ===========================================================================
CLAUDE_API_KEY=sk-ant-your-api-key-here
OPENAI_API_KEY=sk-your-openai-key  # Opcional

# ===========================================================================
# CRM Backend
# ===========================================================================
SECRET_KEY=your-secret-key-min-32-characters
MONGO_URL=mongodb://localhost:27017/conductor_crm

# ===========================================================================
# External Integrations
# ===========================================================================
CLEARBIT_API_KEY=your-clearbit-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
SENDGRID_API_KEY=your-sendgrid-key

# ===========================================================================
# CORS & URLs
# ===========================================================================
CORS_ORIGINS=http://localhost:4200,http://localhost:8001
FRONTEND_URL=http://localhost:4200

# ===========================================================================
# Logging
# ===========================================================================
LOG_LEVEL=INFO
ENVIRONMENT=development
DEBUG=true
```

---

## 📋 Tarefas Pendentes

### Para o Usuário Fazer:

1. **Criar agent definitions no Conductor**
   - As personas estão prontas em `conductor-agents/`
   - Precisa criar os agentes usando Conductor CLI ou API
   - Copiar arquivos para `.conductor_workspace/agents/`

2. **Configurar MongoDB externo**
   - Criar 3 databases: `conductor`, `conductor_gateway`, `conductor_crm`
   - Ou usar um MongoDB Atlas (recomendado)

3. **Configurar .env**
   - Copiar `.env.example` para `.env`
   - Preencher todas as chaves de API

### Para o Desenvolvedor Fazer:

1. **Criar Dockerfile para CRM Backend**
   - `src/backend/Dockerfile`
   - Build da imagem FastAPI

2. **Implementar AIOrchestrator**
   - `src/backend/app/services/ai_orchestrator.py`
   - Ponte entre CRM e Gateway

3. **Habilitar endpoints AI**
   - Remover HTTP 503
   - Integrar com AIOrchestrator

4. **Testes end-to-end**
   - Testar fluxo completo
   - Validar comunicação entre containers

---

## ✅ Diferenças: Versão Antiga vs Nova

| Aspecto | Versão 1.0 (ERRADA) | Versão 2.0 (CORRETA) |
|---------|---------------------|----------------------|
| **Conceito** | Submódulos como serviços externos | Submódulos como PARTE da solução |
| **Dockerfiles** | Referenciados mas não aproveitados | Usa Dockerfiles existentes dos submódulos |
| **Network** | Não clara | Todos na mesma rede `conductor-crm-net` |
| **Comunicação** | URLs públicas (localhost) | DNS interno Docker (service names) |
| **Orquestração** | "Integração" | Orquestração unificada |
| **MongoDB** | Confuso | Claro: 3 databases, externo |
| **Build** | Contextos confusos | Build contexts corretos (submódulos) |

---

## 🎯 Próximos Passos

1. ✅ Arquitetura corrigida e documentada
2. ✅ docker-compose.revised.yml criado
3. ⬜ Criar Dockerfile para CRM Backend
4. ⬜ Testar build de todas as imagens
5. ⬜ Configurar MongoDB externo
6. ⬜ Criar agent definitions no Conductor
7. ⬜ Implementar AIOrchestrator
8. ⬜ Testes end-to-end

---

## 🙏 Agradecimento ao Feedback

**Obrigado por identificar esse erro conceitual!**

A primeira versão tratava os submódulos como "serviços que precisavam ser integrados", quando na verdade eles **SÃO a solução de IA** do CRM.

Esta versão corrigida reflete a arquitetura real onde tudo roda junto como uma stack unificada.

---

**Versão:** 2.0 (Corrigida)
**Data:** 2025-11-06
**Status:** Documentação atualizada
**Arquivo:** `docs/ARQUITETURA_CORRIGIDA.md`
