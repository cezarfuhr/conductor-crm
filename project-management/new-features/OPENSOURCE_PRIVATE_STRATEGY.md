# 🔓🔒 Estratégia: Opensource Core + Projetos Privados

> Como construir produtos comerciais em cima de um core opensource mantendo a contribuição bidirecional saudável

---

## 🎯 Problemática

### Situação Atual
```
conductor-community (opensource, MIT)
├── src/conductor          → submodule (github.com/primoia/conductor)
├── src/conductor-gateway  → submodule (github.com/primoia/conductor-gateway)
└── src/conductor-web      → submodule (github.com/primoia/conductor-web)
```

### Desafios
1. **🔓 Opensource Core**: Motor de IA deve permanecer público e com contribuições da comunidade
2. **🔒 Produto Privado**: CRM é comercial, contém lógica de negócio proprietária
3. **🔄 Contribuição Bidirecional**: Melhorias do CRM devem voltar pro core (quando genéricas)
4. **📦 Versionamento**: Updates do core não podem quebrar CRM em produção
5. **🚀 Deploy**: CRM em produção precisa do core funcionando
6. **👥 Time**: Desenvolvedores trabalham em ambos (opensource e privado)

---

## 🏗️ Abordagens Analisadas

### Abordagem 1: Plugin Architecture (Recomendada)

```
primoia-ecosystem/

📂 conductor-community/ (opensource, público)
├── src/conductor
├── src/conductor-gateway
├── src/conductor-web
├── docker-compose.core.yml     # Serviços core
├── docker-compose.dev.yml      # Dev com hot-reload
└── plugins/
    ├── README.md               # Como criar plugins
    └── example-plugin/         # Plugin exemplo

📂 conductor-crm/ (privado, GitLab/GitHub private)
├── docker-compose.yml          # Referencia conductor-community
├── plugins/
│   ├── crm-backend/
│   ├── crm-frontend/
│   └── crm-agents/
├── .git/
└── .env (privado)
```

#### Como Funciona

**1. Core Opensource (conductor-community)**
```yaml
# docker-compose.core.yml
services:
  conductor-api:
    image: primoia/conductor:latest
    volumes:
      - ./plugins:/plugins:ro  # Monta plugins externos

  conductor-gateway:
    image: primoia/conductor-gateway:latest
    environment:
      - PLUGIN_PATH=/plugins

  conductor-web:
    image: primoia/conductor-web:latest
```

**2. Plugin Privado (conductor-crm)**
```yaml
# conductor-crm/docker-compose.yml
version: '3.8'

services:
  # Inclui serviços core
  conductor-api:
    extends:
      file: ../conductor-community/docker-compose.core.yml
      service: conductor-api
    volumes:
      - ./plugins/crm-agents:/plugins/crm:ro

  conductor-gateway:
    extends:
      file: ../conductor-community/docker-compose.core.yml
      service: conductor-gateway

  # Serviços privados
  crm-backend:
    build: ./plugins/crm-backend
    ports: ["5007:5007"]
    environment:
      - CONDUCTOR_GATEWAY=http://conductor-gateway:5006
    depends_on: [conductor-gateway]

  crm-frontend:
    build: ./plugins/crm-frontend
    ports: ["4200:80"]
    environment:
      - CRM_API=http://crm-backend:5007
```

#### Estrutura de Plugin

```python
# conductor-crm/plugins/crm-agents/lead_qualifier.py
from conductor.plugin import AgentPlugin

class LeadQualifierPlugin(AgentPlugin):
    """
    Plugin privado para CRM
    """
    name = "crm"
    version = "1.0.0"
    agents = ["LeadQualifier_Agent", "EmailAssistant_Agent"]

    def register(self, conductor):
        conductor.register_agent(self.LeadQualifierAgent)
        conductor.register_agent(self.EmailAssistantAgent)
```

#### Vantagens ✅
- ✅ **Separação clara**: Core opensource, plugins privados
- ✅ **Fácil contribuição**: Features genéricas viram plugins opensource
- ✅ **Versionamento**: Core e plugins têm ciclos independentes
- ✅ **Deploy simples**: `docker-compose up` funciona
- ✅ **Segurança**: Código privado nunca entra no repo público

#### Desvantagens ❌
- ❌ Requer sistema de plugins bem desenhado no core
- ❌ Overhead de manutenção da API de plugins

---

### Abordagem 2: Git Submodules Nested

```
📂 conductor-crm/ (privado)
├── .git/
├── core/                       # Git submodule → conductor-community
│   ├── src/conductor
│   ├── src/conductor-gateway
│   └── src/conductor-web
├── crm-backend/
├── crm-frontend/
└── docker-compose.yml
```

#### Como Funciona

```bash
# Setup inicial
git clone git@github.com:yourcompany/conductor-crm.git
cd conductor-crm
git submodule add https://github.com/primoia/conductor-community.git core
git submodule update --init --recursive

# Atualizar core opensource
cd core
git pull origin main
cd ..
git add core
git commit -m "chore: update core to v2.1.0"
```

```yaml
# docker-compose.yml
services:
  # Core (do submodule)
  conductor-api:
    build: ./core/src/conductor

  # CRM (privado)
  crm-backend:
    build: ./crm-backend
    depends_on: [conductor-api]
```

#### Fluxo de Contribuição

```bash
# Desenvolvendo feature genérica no CRM
cd core/src/conductor
git checkout -b feature/better-streaming

# Faz mudanças no core
git commit -m "feat: improve SSE streaming performance"

# Push para FORK do conductor
git push origin feature/better-streaming

# Abre PR no upstream (conductor original)
gh pr create --repo primoia/conductor --title "feat: improve SSE streaming"

# Depois que merge no upstream, atualiza submodule
git pull upstream main
```

#### Vantagens ✅
- ✅ **Setup familiar**: Git submodules é padrão
- ✅ **Controle de versão**: Pin exato do core usado
- ✅ **Contribuição natural**: Trabalha direto no submodule
- ✅ **Simples**: Não requer infraestrutura especial

#### Desvantagens ❌
- ❌ Risco de commitar código privado no submodule por engano
- ❌ Gerenciamento de submodules pode ser confuso
- ❌ CI/CD precisa lidar com submodules

---

### Abordagem 3: Microservices com Docker Registry

```
# Core Opensource
docker.io/primoia/conductor:latest
docker.io/primoia/conductor-gateway:latest
docker.io/primoia/conductor-web:latest

# CRM Privado
registry.yourcompany.com/crm-backend:latest
registry.yourcompany.com/crm-frontend:latest
```

```yaml
# conductor-crm/docker-compose.yml
services:
  # Consome imagens públicas do core
  conductor-api:
    image: primoia/conductor:2.1.0  # Pin de versão
    environment:
      - AGENTS_PATH=/custom-agents
    volumes:
      - ./custom-agents:/custom-agents

  conductor-gateway:
    image: primoia/conductor-gateway:2.1.0

  # Imagens privadas
  crm-backend:
    image: registry.yourcompany.com/crm-backend:1.0.0
    environment:
      - CONDUCTOR_API=http://conductor-api:3000
```

#### Fluxo de Desenvolvimento

```bash
# Desenvolvimento local: usa código local do core
docker-compose -f docker-compose.dev.yml up

# Produção: usa imagens do registry
docker-compose -f docker-compose.prod.yml up
```

#### Vantagens ✅
- ✅ **Total separação**: Core e CRM são totalmente independentes
- ✅ **Produção ready**: Usa imagens imutáveis
- ✅ **Escalabilidade**: Fácil escalar cada serviço
- ✅ **Segurança**: Zero chance de vazar código privado

#### Desvantagens ❌
- ❌ Desenvolvimento mais complexo (precisa rebuild imagens)
- ❌ Contribuir pro core requer workflow separado
- ❌ Latência de rede entre serviços

---

### Abordagem 4: Monorepo com Workspaces

```
📂 primoia-platform/ (privado, mas com partes opensource)
├── .git/
├── opensource/              # Código público (synced com GitHub)
│   ├── conductor/
│   ├── conductor-gateway/
│   └── conductor-web/
├── private/                 # Código privado
│   ├── crm/
│   ├── erp/
│   └── shared/
└── .gitignore              # Ignora private/
```

Com GitHub Actions:
```yaml
# .github/workflows/sync-opensource.yml
on:
  push:
    paths:
      - 'opensource/**'

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Sync to public repos
        run: |
          # Copia opensource/conductor → github.com/primoia/conductor
          # Copia opensource/conductor-gateway → github.com/primoia/conductor-gateway
```

#### Vantagens ✅
- ✅ **DX incrível**: Tudo em um repo, IDE unificado
- ✅ **Refactoring fácil**: Mover código entre opensource/private
- ✅ **Shared code**: Fácil compartilhar utilities

#### Desvantagens ❌
- ❌ **Complexo**: Requer automação robusta de sync
- ❌ **Risco de leak**: Acidentalmente commitar privado no público
- ❌ **Git history**: Difícil manter histories separadas

---

## 🎯 Recomendação: Híbrido (1 + 2)

### Estratégia Proposta

```
📂 conductor-community (opensource, GitHub)
├── src/conductor
├── src/conductor-gateway
├── src/conductor-web
├── docker-compose.core.yml
├── plugins/
│   ├── api.md              # Plugin API docs
│   └── example/
└── LICENSE (MIT)

📂 conductor-crm (privado, GitHub/GitLab private)
├── .git/
├── core/                   # Git submodule → conductor-community
├── docker-compose.yml      # Extends core/docker-compose.core.yml
├── crm-backend/
├── crm-frontend/
├── custom-agents/          # Agentes privados
└── LICENSE (Proprietária)
```

### Por que Híbrido?

1. **Submodule**: Para gerenciar versão do core
2. **Plugin System**: Para extensões privadas sem modificar core
3. **Docker Compose Extends**: Para orquestração

---

## 🔄 Fluxos de Trabalho

### Fluxo 1: Desenvolvendo Feature no CRM (Privado)

```bash
# 1. Clone do CRM
git clone git@github.com:yourcompany/conductor-crm.git
cd conductor-crm
git submodule update --init --recursive

# 2. Desenvolvimento
cd crm-backend
# Faz mudanças...
git add .
git commit -m "feat: add deal prediction"
git push origin feature/deal-prediction

# 3. Deploy
docker-compose up -d
```

### Fluxo 2: Feature Genérica que Deve Ir pro Opensource

```bash
# Desenvolvendo no CRM, percebe que feature é genérica

# 1. Trabalha no submodule
cd core/src/conductor
git checkout -b feature/improved-agent-registry

# 2. Implementa feature genérica no core
# (sem lógica de negócio do CRM)
git commit -m "feat: add agent registry with tagging"

# 3. Testa no contexto do CRM
cd ../../..  # volta para conductor-crm
docker-compose up  # Usa core local

# 4. Push para fork do conductor
cd core/src/conductor
git remote add fork git@github.com:youruser/conductor.git
git push fork feature/improved-agent-registry

# 5. Abre PR no conductor original
gh pr create --repo primoia/conductor \
  --title "feat: add agent registry with tagging" \
  --body "Allows plugins to register agents with metadata tags"

# 6. Depois do merge, atualiza submodule no CRM
git checkout main
git pull upstream main
cd ../../../
git add core
git commit -m "chore: update core to v2.2.0 (agent tagging)"
```

### Fluxo 3: Pulling Updates do Opensource

```bash
# Core opensource lançou v2.3.0 com bugfixes

# 1. No repo do CRM
cd conductor-crm/core
git fetch origin
git checkout v2.3.0

# 2. Testa compatibilidade
cd ..
docker-compose up
npm run test:integration

# 3. Se tudo OK, commit
git add core
git commit -m "chore: upgrade core to v2.3.0"
git push origin main

# 4. Deploy
# CI/CD pega novo commit e faz deploy automaticamente
```

### Fluxo 4: Contribuindo Bugfix Urgente

```bash
# Bug crítico encontrado no core enquanto usa CRM

# 1. Fix direto no submodule
cd core/src/conductor-gateway
git checkout -b hotfix/sse-memory-leak

# 2. Fix rápido
git commit -m "fix: prevent memory leak in SSE connections"

# 3. Push e PR urgente
git push fork hotfix/sse-memory-leak
gh pr create --repo primoia/conductor-gateway \
  --title "fix: prevent memory leak in SSE" \
  --label "priority:critical"

# 4. Enquanto espera merge, usa fix local no CRM
cd ../../../
docker-compose up  # Usa código local com fix
```

---

## 🛡️ Segurança e Governança

### Prevenção de Leaks

**1. Git Hooks no CRM**
```bash
# conductor-crm/.git/hooks/pre-commit
#!/bin/bash

# Previne commit de código privado no submodule core
if git diff --cached --name-only | grep -q "^core/"; then
  echo "❌ ERRO: Você está tentando commitar no submodule 'core'"
  echo "Para contribuir no core, use o workflow adequado"
  exit 1
fi
```

**2. .gitignore Robusto**
```gitignore
# conductor-crm/.gitignore

# Nunca commitar .env
.env
.env.local
*.env

# Nunca commitar dados de clientes
/data/*
/backups/*
/logs/*

# Configurações privadas
config/production.yml
```

**3. CI/CD Checks**
```yaml
# .github/workflows/security-check.yml
name: Security Check

on: [push, pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - name: Check for secrets
        uses: trufflesecurity/trufflehog@main

      - name: Verify no private code in public PRs
        run: |
          # Se PR é para repo público, verificar conteúdo
          if [ "${{ github.repository }}" == "primoia/conductor" ]; then
            # Checks...
          fi
```

### Licenciamento

```
conductor (opensource)
├── LICENSE → MIT
└── CONTRIBUTING.md → "Ao contribuir, você concorda com MIT"

conductor-crm (privado)
├── LICENSE → Proprietária
└── NOTICE → "Usa conductor (MIT) como dependência"
```

---

## 📊 Comparação de Abordagens

| Critério | Plugin | Submodule | Microservices | Monorepo |
|----------|--------|-----------|---------------|----------|
| **Separação opensource/privado** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| **Facilidade contribuição** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ |
| **Developer Experience** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Segurança (anti-leak)** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| **Deploy simplicity** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| **Manutenção** | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| **RECOMENDADO** | ✅ Sim | ✅ Sim | Produção | Não |

---

## 🚀 Setup Inicial Recomendado

### Passo 1: Preparar Core (conductor-community)

```bash
cd conductor-community

# 1. Adicionar suporte a plugins
mkdir -p plugins/example
cat > plugins/README.md << 'EOF'
# Plugin System

Conductor supports external plugins for agents, tools, and workflows.

## Creating a Plugin

See `example/` for a template.
EOF

# 2. Atualizar docker-compose
cat > docker-compose.core.yml << 'EOF'
version: '3.8'
services:
  conductor-api:
    build: ./src/conductor
    volumes:
      - ${PLUGIN_PATH:-./plugins}:/plugins:ro
    environment:
      - CONDUCTOR_PLUGIN_PATH=/plugins

  conductor-gateway:
    build: ./src/conductor-gateway
    ports: ["5006:5006"]

  conductor-web:
    build: ./src/conductor-web
    ports: ["8080:80"]

  mongodb:
    image: mongo:7
    ports: ["27017:27017"]
EOF

# 3. Commit e push
git add .
git commit -m "feat: add plugin system support"
git push origin main

# 4. Tag release
git tag v2.0.0
git push origin v2.0.0
```

### Passo 2: Criar Repo Privado (conductor-crm)

```bash
# 1. Criar repo privado
mkdir conductor-crm
cd conductor-crm
git init
git remote add origin git@github.com:yourcompany/conductor-crm.git

# 2. Adicionar core como submodule
git submodule add https://github.com/primoia/conductor-community.git core
git submodule update --init --recursive

# 3. Criar estrutura
mkdir -p crm-backend crm-frontend custom-agents

# 4. Docker Compose que usa o core
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  # Core services (extends)
  conductor-api:
    extends:
      file: ./core/docker-compose.core.yml
      service: conductor-api
    environment:
      - PLUGIN_PATH=/plugins
    volumes:
      - ./custom-agents:/plugins/crm:ro

  conductor-gateway:
    extends:
      file: ./core/docker-compose.core.yml
      service: conductor-gateway

  mongodb:
    extends:
      file: ./core/docker-compose.core.yml
      service: mongodb

  # CRM services
  crm-backend:
    build: ./crm-backend
    ports: ["5007:5007"]
    environment:
      - CONDUCTOR_GATEWAY=http://conductor-gateway:5006
      - MONGO_URI=mongodb://mongodb:27017/crm
    depends_on: [conductor-gateway, mongodb]

  crm-frontend:
    build: ./crm-frontend
    ports: ["4200:80"]
    environment:
      - CRM_API=http://crm-backend:5007
    depends_on: [crm-backend]
EOF

# 5. Git hooks de segurança
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
if git diff --cached --name-only | grep -q "^core/"; then
  echo "❌ ERRO: Tentativa de commit no submodule core"
  exit 1
fi
EOF
chmod +x .git/hooks/pre-commit

# 6. Commit inicial
git add .
git commit -m "chore: initial CRM setup with conductor core"
git push -u origin main
```

### Passo 3: Primeiro Desenvolvimento

```bash
# No conductor-crm
cd conductor-crm

# Desenvolver agente privado
cat > custom-agents/lead_qualifier.py << 'EOF'
from conductor.plugin import AgentPlugin

class CRMPlugin(AgentPlugin):
    name = "crm"

    class LeadQualifierAgent:
        # Implementação privada
        pass
EOF

# Testar localmente
docker-compose up -d
docker-compose logs -f

# Commit
git add custom-agents/
git commit -m "feat: add LeadQualifier agent"
git push
```

---

## 📚 Documentação Necessária

### No Core (Opensource)

1. **PLUGIN_API.md**: Como criar plugins
2. **CONTRIBUTING.md**: Como contribuir pro core
3. **CHANGELOG.md**: Versionamento semântico
4. **MIGRATION_GUIDES/**: Guias de migração entre versões

### No CRM (Privado)

1. **DEVELOPMENT.md**: Setup local com submodule
2. **UPSTREAM_CONTRIBUTION.md**: Como contribuir pro core
3. **DEPLOYMENT.md**: Como fazer deploy
4. **SECURITY.md**: Políticas de segurança

---

## ✅ Checklist de Implementação

### Core (conductor-community)
- [ ] Implementar sistema de plugins
- [ ] Criar `docker-compose.core.yml`
- [ ] Adicionar documentação de plugins
- [ ] Versionar com tags semânticas
- [ ] Publicar imagens Docker no Docker Hub

### CRM (conductor-crm)
- [ ] Criar repo privado
- [ ] Adicionar core como submodule
- [ ] Setup docker-compose com extends
- [ ] Implementar git hooks de segurança
- [ ] Criar primeiro agente privado
- [ ] Setup CI/CD pipeline
- [ ] Documentar workflows

---

## 🎯 Próximos Passos

1. **Validar Estratégia** (esta semana)
   - Revisar este documento
   - Decidir: Submodule puro vs Híbrido Plugin+Submodule

2. **PoC Técnico** (próxima semana)
   - Setup conductor-crm com submodule
   - Testar workflow de contribuição
   - Validar git hooks de segurança

3. **Documentação** (semana 3)
   - Escrever guias completos
   - Criar diagramas de fluxo
   - Treinar time

4. **Implementação Real** (semana 4+)
   - Desenvolver primeiro agente CRM
   - Contribuir primeira feature pro core
   - Estabelecer processo de review

---

**Status**: 📋 Proposta para Discussão
**Decisão Necessária**: Escolher entre Abordagem Híbrida vs Submodule Puro
**Próximo Revisor**: @yourteam/architects
