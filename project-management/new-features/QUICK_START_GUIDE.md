# 🚀 Quick Start: Setup CRM Privado com Conductor Core Opensource

> Guia prático passo-a-passo para implementar a estratégia recomendada em 1 dia

---

## 📋 Pré-requisitos

- [ ] Git instalado
- [ ] Docker e Docker Compose instalados
- [ ] Node.js 20+ e Python 3.11+ instalados
- [ ] Acesso aos repositórios:
  - `github.com/primoia/conductor-community` (público)
  - Repositório privado criado para CRM

---

## ⚡ Setup Rápido (TL;DR)

```bash
# 1. Preparar core (uma vez)
cd conductor-community
git checkout -b feature/plugin-support
# [Adicionar sistema de plugins - ver Fase 1]
git commit -m "feat: add plugin system"
git push origin feature/plugin-support

# 2. Criar CRM privado
mkdir conductor-crm && cd conductor-crm
git init
git submodule add https://github.com/primoia/conductor-community.git core
git submodule update --init --recursive

# 3. Setup docker-compose
cp core/docker-compose.core.yml docker-compose.yml
# [Editar para adicionar serviços do CRM]

# 4. Desenvolver
docker-compose up -d
# Código do CRM em crm-backend/ e crm-frontend/
```

---

## 📚 Fase 1: Preparar Conductor Core (1-2 horas)

### 1.1 Adicionar Sistema de Plugins

**No repositório conductor-community:**

```bash
cd /path/to/conductor-community
git checkout -b feature/plugin-support
```

**Criar estrutura de plugins:**

```bash
# Criar diretório
mkdir -p plugins/example-plugin

# README do sistema de plugins
cat > plugins/README.md << 'EOF'
# Conductor Plugin System

## Overview

Plugins allow extending Conductor with custom agents, tools, and workflows without modifying core code.

## Structure

```
plugins/
└── your-plugin/
    ├── plugin.yaml          # Plugin metadata
    ├── agents/              # Custom agents
    │   └── my_agent.py
    ├── tools/               # Custom tools
    │   └── my_tool.py
    └── README.md
```

## Creating a Plugin

1. Create directory: `plugins/my-plugin/`
2. Add `plugin.yaml`:

```yaml
name: my-plugin
version: 1.0.0
description: My custom plugin
agents:
  - MyAgent
tools:
  - MyTool
```

3. Implement agents in `agents/`
4. Mount plugin directory in docker-compose

## Example

See `example-plugin/` for a complete example.
EOF
```

**Criar plugin de exemplo:**

```bash
cat > plugins/example-plugin/plugin.yaml << 'EOF'
name: example-plugin
version: 1.0.0
description: Example plugin demonstrating the plugin system
author: Conductor Team

agents:
  - GreetingAgent

tools:
  - GreetingTool
EOF
```

```bash
mkdir -p plugins/example-plugin/agents
cat > plugins/example-plugin/agents/greeting_agent.py << 'EOF'
"""
Example agent for the plugin system
"""

class GreetingAgent:
    """Simple greeting agent"""

    agent_id = "GreetingAgent"
    description = "Greets users in different languages"

    def execute(self, input_data: dict) -> dict:
        name = input_data.get("name", "World")
        language = input_data.get("language", "en")

        greetings = {
            "en": f"Hello, {name}!",
            "pt": f"Olá, {name}!",
            "es": f"¡Hola, {name}!"
        }

        return {
            "greeting": greetings.get(language, greetings["en"]),
            "agent": self.agent_id
        }
EOF
```

**Atualizar docker-compose para suportar plugins:**

```bash
cat > docker-compose.core.yml << 'EOF'
version: '3.8'

services:
  mongodb:
    image: mongo:7
    container_name: conductor-mongodb
    ports:
      - "27017:27017"
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=conductor123
    volumes:
      - mongodb_data:/data/db

  conductor-api:
    build: ./src/conductor
    container_name: conductor-api
    ports:
      - "3000:3000"
    environment:
      - MONGODB_URI=mongodb://admin:conductor123@mongodb:27017/conductor?authSource=admin
      - CONDUCTOR_PLUGIN_PATH=/plugins
    volumes:
      - ${PLUGINS_PATH:-./plugins}:/plugins:ro
    depends_on:
      - mongodb

  conductor-gateway:
    build: ./src/conductor-gateway
    container_name: conductor-gateway
    ports:
      - "5006:5006"
      - "8006:8006"
    environment:
      - CONDUCTOR_API_URL=http://conductor-api:3000
      - HOST=0.0.0.0
      - PORT=5006
      - MCP_PORT=8006
    depends_on:
      - conductor-api

  conductor-web:
    build: ./src/conductor-web
    container_name: conductor-web
    ports:
      - "8080:80"
    environment:
      - API_URL=http://conductor-gateway:5006
    depends_on:
      - conductor-gateway

volumes:
  mongodb_data:
EOF
```

**Commit e push:**

```bash
git add .
git commit -m "feat: add plugin system support

- Add plugins/ directory structure
- Create example plugin
- Update docker-compose.core.yml to mount plugins
- Add documentation"

git push origin feature/plugin-support

# Criar PR e merge
gh pr create --title "feat: add plugin system support"
# Depois de review, merge

git checkout main
git pull origin main
git tag v2.0.0 -m "Release v2.0.0 - Plugin System"
git push origin v2.0.0
```

---

## 📚 Fase 2: Criar Repositório CRM Privado (30 min)

### 2.1 Setup Inicial

```bash
# Criar diretório
mkdir conductor-crm
cd conductor-crm

# Inicializar git
git init
git remote add origin git@github.com:yourcompany/conductor-crm.git

# Adicionar .gitignore
cat > .gitignore << 'EOF'
# Environment
.env
.env.local
*.env

# Data
data/
logs/
backups/

# Dependencies
node_modules/
__pycache__/
*.pyc
.venv/
venv/

# IDE
.vscode/
.idea/
*.swp

# OS
.DS_Store
Thumbs.db

# Build
dist/
build/
*.egg-info/

# Never commit production configs
config/production.yml
config/secrets.yml
EOF
```

### 2.2 Adicionar Core como Submodule

```bash
# Adicionar submodule
git submodule add https://github.com/primoia/conductor-community.git core

# Inicializar submodules recursivos
git submodule update --init --recursive

# Pin na versão v2.0.0 (com plugin support)
cd core
git checkout v2.0.0
cd ..
git add core
git commit -m "chore: add conductor-community core v2.0.0"
```

### 2.3 Estrutura do Projeto CRM

```bash
# Criar estrutura
mkdir -p crm-backend/{src,tests}
mkdir -p crm-frontend/src
mkdir -p plugins/crm/{agents,tools}
mkdir -p config
mkdir -p docs

# Árvore resultante:
# conductor-crm/
# ├── core/                    (submodule)
# ├── crm-backend/
# │   ├── src/
# │   └── tests/
# ├── crm-frontend/
# │   └── src/
# ├── plugins/
# │   └── crm/
# │       ├── agents/
# │       └── tools/
# ├── config/
# ├── docs/
# ├── docker-compose.yml
# └── .gitignore
```

---

## 📚 Fase 3: Configurar Docker Compose (15 min)

### 3.1 Criar docker-compose.yml

```bash
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  # ==========================================
  # CORE SERVICES (do submodule)
  # ==========================================

  mongodb:
    extends:
      file: ./core/docker-compose.core.yml
      service: mongodb

  conductor-api:
    extends:
      file: ./core/docker-compose.core.yml
      service: conductor-api
    environment:
      - CONDUCTOR_PLUGIN_PATH=/plugins
    volumes:
      - ./plugins:/plugins:ro

  conductor-gateway:
    extends:
      file: ./core/docker-compose.core.yml
      service: conductor-gateway

  conductor-web:
    extends:
      file: ./core/docker-compose.core.yml
      service: conductor-web

  # ==========================================
  # CRM SERVICES (privado)
  # ==========================================

  crm-backend:
    build: ./crm-backend
    container_name: crm-backend
    ports:
      - "5007:5007"
    environment:
      - PORT=5007
      - CONDUCTOR_GATEWAY_URL=http://conductor-gateway:5006
      - MONGODB_URI=mongodb://admin:conductor123@mongodb:27017/crm?authSource=admin
      - PYTHONUNBUFFERED=1
    volumes:
      - ./crm-backend/src:/app/src:ro
    depends_on:
      - conductor-gateway
      - mongodb
    restart: unless-stopped

  crm-frontend:
    build: ./crm-frontend
    container_name: crm-frontend
    ports:
      - "4200:80"
    environment:
      - API_URL=http://crm-backend:5007
      - CONDUCTOR_WEB_URL=http://conductor-web:8080
    depends_on:
      - crm-backend
    restart: unless-stopped

# Volumes são herdados do core
volumes:
  mongodb_data:
EOF
```

### 3.2 Arquivo .env

```bash
cat > .env.example << 'EOF'
# Conductor Core
CONDUCTOR_VERSION=2.0.0
PLUGINS_PATH=./plugins

# CRM Backend
CRM_BACKEND_PORT=5007
CRM_SECRET_KEY=change-me-in-production

# Database
MONGODB_HOST=mongodb
MONGODB_PORT=27017
MONGODB_USER=admin
MONGODB_PASSWORD=conductor123

# AI Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Environment
NODE_ENV=development
PYTHON_ENV=development
EOF

cp .env.example .env
```

---

## 📚 Fase 4: Implementar CRM Backend (1-2 horas)

### 4.1 Setup Backend Python

```bash
cd crm-backend

cat > Dockerfile << 'EOF'
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY src/ ./src/

EXPOSE 5007

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "5007", "--reload"]
EOF
```

```bash
cat > requirements.txt << 'EOF'
fastapi==0.104.1
uvicorn[standard]==0.24.0
motor==3.3.2
pydantic==2.5.0
httpx==0.25.1
python-dotenv==1.0.0
EOF
```

### 4.2 Implementar API

```bash
mkdir -p src/api/routes
mkdir -p src/models
mkdir -p src/services

# Main app
cat > src/main.py << 'EOF'
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.api.routes import leads, ai_assistant

app = FastAPI(
    title="Conductor CRM",
    description="CRM AI-First powered by Conductor",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(leads.router, prefix="/api/v1")
app.include_router(ai_assistant.router, prefix="/api/v1")

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "crm-backend"}
EOF
```

```bash
# Lead model
cat > src/models/lead.py << 'EOF'
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class Lead(BaseModel):
    id: Optional[str] = None
    name: str
    email: EmailStr
    company: str
    phone: Optional[str] = None
    source: str
    status: str = "new"
    qualification_score: Optional[int] = None
    classification: Optional[str] = None
    created_at: datetime = datetime.now()
    updated_at: datetime = datetime.now()
EOF
```

```bash
# Leads routes
cat > src/api/routes/leads.py << 'EOF'
from fastapi import APIRouter, HTTPException
from src.models.lead import Lead
from typing import List

router = APIRouter(prefix="/leads", tags=["Leads"])

# Mock database (em produção, usar MongoDB)
leads_db = []

@router.get("/", response_model=List[Lead])
async def list_leads():
    return leads_db

@router.post("/", response_model=Lead)
async def create_lead(lead: Lead):
    leads_db.append(lead)
    return lead

@router.get("/{lead_id}", response_model=Lead)
async def get_lead(lead_id: str):
    for lead in leads_db:
        if lead.id == lead_id:
            return lead
    raise HTTPException(404, "Lead not found")
EOF
```

```bash
# AI Assistant routes
cat > src/api/routes/ai_assistant.py << 'EOF'
from fastapi import APIRouter, HTTPException
import httpx
import os

router = APIRouter(prefix="/ai", tags=["AI Assistant"])

CONDUCTOR_GATEWAY = os.getenv("CONDUCTOR_GATEWAY_URL", "http://conductor-gateway:5006")

@router.post("/qualify-lead")
async def qualify_lead(lead_id: str):
    """Qualifica um lead usando IA"""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{CONDUCTOR_GATEWAY}/api/v1/execute",
                json={
                    "agent": "LeadQualifier_Agent",
                    "input": {"lead_id": lead_id}
                },
                timeout=30.0
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            raise HTTPException(500, f"Error calling Conductor: {str(e)}")
EOF
```

---

## 📚 Fase 5: Criar Primeiro Plugin CRM (30 min)

```bash
cd ../plugins/crm

cat > plugin.yaml << 'EOF'
name: conductor-crm
version: 1.0.0
description: CRM agents and tools
author: PrimoIA

agents:
  - LeadQualifier_Agent
  - EmailAssistant_Agent

tools:
  - CRMDatabaseTool
  - EnrichmentTool
EOF
```

```bash
mkdir -p agents
cat > agents/lead_qualifier.py << 'EOF'
"""
Lead Qualification Agent for CRM
"""

class LeadQualifierAgent:
    agent_id = "LeadQualifier_Agent"
    description = "Qualifies leads automatically using AI"

    prompt = """
    You are a B2B lead qualification expert.

    Analyze this lead and return:
    1. Score (0-100)
    2. Classification (Hot/Warm/Cold)
    3. Reasons for classification
    4. Recommended next actions

    Lead data:
    {lead_data}

    Return JSON format.
    """

    def execute(self, input_data: dict) -> dict:
        # Implementação simplificada para demo
        lead_id = input_data.get("lead_id")

        # Em produção, buscar do banco e chamar LLM
        return {
            "lead_id": lead_id,
            "score": 75,
            "classification": "Warm",
            "reasons": [
                "Company size matches ICP",
                "Decision maker engaged",
                "Budget likely available"
            ],
            "next_actions": [
                "Schedule demo call",
                "Send case study",
                "Connect on LinkedIn"
            ]
        }
EOF
```

---

## 📚 Fase 6: Testar Tudo (15 min)

### 6.1 Iniciar Stack

```bash
cd conductor-crm

# Build e start
docker-compose up --build -d

# Ver logs
docker-compose logs -f
```

### 6.2 Testar Endpoints

```bash
# Health check
curl http://localhost:5007/health

# Criar lead
curl -X POST http://localhost:5007/api/v1/leads \
  -H "Content-Type: application/json" \
  -d '{
    "name": "João Silva",
    "email": "joao@example.com",
    "company": "TechCorp",
    "source": "website"
  }'

# Qualificar lead com IA
curl -X POST http://localhost:5007/api/v1/ai/qualify-lead?lead_id=123

# Acessar UI
open http://localhost:4200
```

---

## 📚 Fase 7: Git Hooks de Segurança (10 min)

```bash
# Prevenir commits no submodule
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash

# Check if trying to commit in submodule
if git diff --cached --name-only | grep -q "^core/"; then
    echo ""
    echo "❌ ERROR: You are trying to commit changes in the 'core' submodule!"
    echo ""
    echo "To contribute to the core:"
    echo "  1. cd core/src/conductor"
    echo "  2. git checkout -b feature/your-feature"
    echo "  3. Make your changes"
    echo "  4. git commit -m 'feat: your feature'"
    echo "  5. git push fork feature/your-feature"
    echo "  6. Open PR to upstream"
    echo ""
    exit 1
fi

# Check for secrets
if git diff --cached | grep -i "api_key\|secret\|password" | grep -v "example"; then
    echo ""
    echo "⚠️  WARNING: Possible secret detected in commit!"
    echo "Review your changes carefully."
    echo ""
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi
EOF

chmod +x .git/hooks/pre-commit
```

---

## 📚 Fase 8: Commit Inicial (5 min)

```bash
cd conductor-crm

git add .
git commit -m "chore: initial CRM setup with conductor core

- Add conductor-community as submodule (v2.0.0)
- Setup docker-compose with core extends
- Implement basic CRM backend (FastAPI)
- Create LeadQualifier plugin
- Add security git hooks"

git push -u origin main
```

---

## ✅ Checklist Final

- [ ] Core tem sistema de plugins funcionando
- [ ] CRM privado criado com submodule
- [ ] Docker Compose funciona (`docker-compose up`)
- [ ] Backend responde em http://localhost:5007
- [ ] Frontend responde em http://localhost:4200
- [ ] Plugin LeadQualifier carrega corretamente
- [ ] Git hooks de segurança instalados
- [ ] Documentação criada em docs/

---

## 🎯 Próximos Passos

### Semana 1-2: Features Básicas
- [ ] Implementar MongoDB real (não mock)
- [ ] CRUD completo de leads
- [ ] Frontend Angular básico
- [ ] Integração real com Conductor Gateway

### Semana 3-4: IA Avançada
- [ ] Implementar EmailAssistant_Agent
- [ ] SSE streaming no frontend
- [ ] DealPredictor_Agent
- [ ] Dashboard de analytics

### Semana 5+: Produção
- [ ] Autenticação e autorização
- [ ] Deploy em cloud
- [ ] CI/CD pipeline
- [ ] Testes automatizados

---

## 🐛 Troubleshooting

### Problema: Submodule vazio

```bash
git submodule update --init --recursive
```

### Problema: Docker build falha

```bash
# Limpar cache
docker-compose down -v
docker system prune -a
docker-compose up --build
```

### Problema: Plugin não carrega

```bash
# Verificar logs
docker logs conductor-api

# Verificar plugins montados
docker exec conductor-api ls -la /plugins
```

### Problema: Conflito de portas

```bash
# Mudar portas no docker-compose.yml
# Exemplo: 5007 → 5008
```

---

## 📚 Recursos Adicionais

- **OPENSOURCE_PRIVATE_STRATEGY.md**: Estratégia completa
- **DECISION_FRAMEWORK.md**: Framework de decisão
- **CRM_IMPLEMENTATION_EXAMPLES.md**: Exemplos de código

---

**Tempo Total Estimado**: 4-6 horas para setup completo funcional

**Status**: ✅ Pronto para uso
**Versão**: 1.0
**Última Atualização**: 2025-11-04
