# Conductor CRM

> AI-First CRM powered by Conductor - Private commercial project using opensource core

[![License](https://img.shields.io/badge/license-Proprietary-red.svg)]()
[![Conductor](https://img.shields.io/badge/conductor-v2.0.0-blue.svg)](https://github.com/primoia/conductor)

---

## 📋 Overview

Conductor CRM is a **private commercial CRM** built on top of the **opensource Conductor AI framework**. This project demonstrates the hybrid architecture strategy: using opensource AI core while maintaining proprietary business logic.

### Key Features

- 🤖 **AI-Powered Lead Qualification**: Automatic lead scoring and classification
- ✍️ **Email Assistant**: Generate personalized emails with context awareness
- 📊 **Deal Prediction**: Forecast deal outcomes using historical data
- 🔄 **Automated Workflows**: AI-driven nurturing and follow-ups
- 🌐 **Modern Stack**: FastAPI backend + Angular frontend

---

## 🏗️ Architecture

### Port Strategy: Shared MongoDB + Isolated Cores

This project uses a **hybrid architecture** to allow running both `conductor-community` and `conductor-crm` simultaneously:

```
MongoDB (localhost:27017)
├── Database: conductor         ← Community
├── Database: conductor_state   ← Community gateway
├── Database: conductor_crm     ← CRM core
├── Database: conductor_crm_state ← CRM gateway
└── Database: crm               ← CRM backend

conductor-community:
├── Conductor API: 3000
├── Gateway: 5006
└── Web: 8080

conductor-crm:
├── Conductor API: 3001   ← Different port
├── Gateway: 5008         ← Different port
├── Web: 8081             ← Different port
├── CRM Backend: 5007
└── CRM Frontend: 4200
```

**Benefits:**
- ✅ Single MongoDB instance (resource efficient)
- ✅ Separate databases (no interference)
- ✅ Run both projects simultaneously
- ✅ Independent core versions

---

## 🏗️ Components

```
┌─────────────────────────────────────────────────────┐
│                  conductor-crm                      │
│              (Private Repository)                    │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────────┐    ┌──────────────────┐     │
│  │  CRM Backend     │    │  CRM Frontend    │     │
│  │  (Proprietary)   │    │  (Proprietary)   │     │
│  └────────┬─────────┘    └──────────────────┘     │
│           │                                         │
│  ┌────────▼─────────────────────────────────┐     │
│  │      Conductor Gateway (Opensource)      │     │
│  └────────┬─────────────────────────────────┘     │
│           │                                         │
│  ┌────────▼─────────────────────────────────┐     │
│  │      Conductor Core (Opensource)         │     │
│  └──────────────────────────────────────────┘     │
│                                                      │
│  ┌──────────────────────────────────────────┐     │
│  │         CRM Plugins (Private)             │     │
│  │  - LeadQualifier Agent                    │     │
│  │  - EmailAssistant Agent                   │     │
│  │  - DealPredictor Agent                    │     │
│  └──────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────┘
```

### Architecture Similarity with conductor-community

This project **mirrors** the structure of `conductor-community` with clear separation:

| Component | Location | Type |
|-----------|----------|------|
| Conductor Core | `conductor/conductor` | 🔓 Git submodule (opensource) |
| Conductor Gateway | `conductor/conductor-gateway` | 🔓 Git submodule (opensource) |
| Conductor Web | `conductor/conductor-web` | 🔓 Git submodule (opensource) |
| CRM Backend | `src/backend` | 🔒 Private code |
| CRM Frontend | `src/frontend` | 🔒 Private code |
| CRM Plugins | `plugins/crm` | 🔒 Private agents & tools |
| Configuration | `config/` | ⚙️ Same structure |
| Docker Compose | `docker-compose.yml` | 🐳 Extended |

---

## 📁 Project Structure

```
conductor-crm/
├── conductor/              # 🔓 OPENSOURCE CORE (Git submodules)
│   ├── conductor/          # Git submodule → github.com/primoia/conductor
│   ├── conductor-gateway/  # Git submodule → github.com/primoia/conductor-gateway
│   └── conductor-web/      # Git submodule → github.com/primoia/conductor-web
├── src/                    # 🔒 PRIVATE CRM CODE
│   ├── backend/            # CRM backend (FastAPI)
│   └── frontend/           # CRM frontend (Angular)
├── config/                 # ⚙️ CONFIGURATION
│   ├── conductor/
│   │   ├── .env.example
│   │   └── config.yaml
│   ├── gateway/
│   │   ├── .env.example
│   │   └── config.yaml
│   └── crm/
│       └── .env.example
├── plugins/                # 🔌 PRIVATE PLUGINS
│   └── crm/
│       ├── plugin.yaml
│       ├── agents/         # AI agents (LeadQualifier, EmailAssistant, etc)
│       └── tools/          # Custom tools (Database, Enrichment, etc)
├── project-management/     # 📚 DOCUMENTATION
│   └── new-features/
│       ├── README.md
│       ├── QUICK_START_GUIDE.md
│       ├── OPENSOURCE_PRIVATE_STRATEGY.md
│       └── CRM_IMPLEMENTATION_EXAMPLES.md
├── data/                   # 💾 Runtime data (gitignored)
├── logs/                   # 📝 Application logs (gitignored)
├── docker-compose.yml      # 🐳 Production deployment
├── docker-compose.dev.yml  # 🐳 Development with hot-reload
├── .env.example
├── .gitignore
├── .gitmodules             # Git submodules configuration
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Git
- OpenAI API key or Anthropic Claude API key
- **MongoDB running on localhost:27017** (can be shared with conductor-community)
  - Or run `conductor-community` first (which includes MongoDB)
  - Or install MongoDB locally: `brew install mongodb-community` (Mac) or `sudo apt install mongodb` (Linux)

### 1. Clone and Setup

```bash
# Clone repository (replace with your private repo URL)
git clone git@github.com:yourcompany/conductor-crm.git
cd conductor-crm

# Copy environment files
cp .env.example .env
cp config/conductor/.env.example config/conductor/.env
cp config/gateway/.env.example config/gateway/.env
cp config/crm/.env.example config/crm/.env

# Edit .env files with your API keys
nano .env
```

### 2. Configure API Keys

Edit `config/conductor/.env`:

```bash
OPENAI_API_KEY=sk-your-actual-key-here
ANTHROPIC_API_KEY=sk-ant-your-actual-key-here
```

### 3. Start Services

**Quick Start (Recommended):**

```bash
# Start everything in development mode
./run-start-all-dev.sh

# Check status
./run-status.sh

# View logs
./run-logs.sh

# Stop everything
./run-stop-all-dev.sh
```

**Manual Start:**

Production:
```bash
docker-compose up -d
```

Development (with hot-reload):
```bash
docker-compose -f docker-compose.dev.yml up --build
```

### 4. Access Services

**CRM Services (Private):**
| Service | URL | Description |
|---------|-----|-------------|
| CRM Frontend | http://localhost:4200 | Main CRM UI |
| CRM Backend | http://localhost:5007 | CRM API |

**Conductor Core (Opensource):**
| Service | URL | Description |
|---------|-----|-------------|
| Conductor Web | http://localhost:8081 | Conductor UI |
| Conductor Gateway | http://localhost:5008 | Gateway API |
| Conductor API | http://localhost:3001 | Core API |

**Shared Infrastructure:**
| Service | URL | Description |
|---------|-----|-------------|
| MongoDB | localhost:27017 | Shared with conductor-community |

> **Note:** Different ports are used to avoid conflicts when running both `conductor-community` and `conductor-crm` simultaneously.

### 5. Test Installation

```bash
# Health check
curl http://localhost:5007/health

# Test AI qualification (example)
curl -X POST http://localhost:5007/api/v1/ai/qualify-lead?lead_id=123
```

---

## 🛠️ Helper Scripts

The project includes convenient scripts adapted from `conductor-community`:

### Available Scripts

| Script | Description | Usage |
|--------|-------------|-------|
| `run-start-all-dev.sh` | Start all services in dev mode | `./run-start-all-dev.sh` |
| `run-stop-all-dev.sh` | Stop all services | `./run-stop-all-dev.sh` |
| `run-status.sh` | Show status of all services | `./run-status.sh` |
| `run-logs.sh` | View logs (all or specific services) | `./run-logs.sh [service]` |
| `run-restart.sh` | Restart services | `./run-restart.sh [service]` |

### Examples

```bash
# Start everything
./run-start-all-dev.sh

# View all logs
./run-logs.sh

# View only backend logs
./run-logs.sh backend

# View CRM services logs
./run-logs.sh crm

# View core services logs
./run-logs.sh core

# Restart backend
./run-restart.sh backend

# Restart all CRM services
./run-restart.sh crm

# Check status
./run-status.sh

# Stop everything
./run-stop-all-dev.sh
```

### Service Aliases

The scripts support convenient aliases:

| Alias | Maps to |
|-------|---------|
| `backend` | crm-backend |
| `frontend` | crm-frontend |
| `crm` | crm-backend + crm-frontend |
| `api` or `conductor` | conductor-api |
| `gateway` | gateway |
| `web` | web |
| `core` | conductor-api + gateway + web |
| `mongo` or `mongodb` | mongodb |

---

## 🔧 Development

### Git Submodules

The opensource Conductor modules are already added as submodules in `conductor/`:

```bash
# Update submodules (if you just cloned the repo)
git submodule update --init --recursive

# Update to latest version
cd conductor/conductor
git pull origin main

# Or pin to specific version
git checkout v2.0.0
cd ../..
git add conductor/
git commit -m "chore: update conductor to v2.0.0"
```

### Development Workflow

1. **Working on CRM features (private code):**

```bash
# Edit backend or frontend
cd src/backend
# Make changes...
git add .
git commit -m "feat: add new CRM feature"
git push origin feature/your-feature
```

2. **Contributing to opensource core:**

```bash
# Work inside submodule
cd conductor/conductor
git checkout -b feature/generic-improvement

# Make changes to core...
git commit -m "feat: improve agent registry"

# Push to your fork
git push fork feature/generic-improvement

# Open PR to upstream
gh pr create --repo primoia/conductor --title "feat: improve agent registry"
```

3. **Updating core version:**

```bash
# Pull latest from upstream
cd conductor/conductor
git fetch origin
git checkout v2.1.0

# Update reference in main repo
cd ../..
git add conductor/
git commit -m "chore: update conductor to v2.1.0"
```

### Hot Reload Development

The `docker-compose.dev.yml` enables hot-reload for both backend and frontend:

```bash
# Start with hot-reload
docker-compose -f docker-compose.dev.yml up

# Changes to src/backend/ → auto-reload
# Changes to src/frontend/ → auto-reload
```

---

## 🤖 AI Agents

### LeadQualifier_Agent

Automatically qualifies leads based on:
- Company size and sector
- Contact job title
- Behavior (pages visited, email engagement)
- Historical conversion data

**Usage:**

```bash
curl -X POST http://localhost:5007/api/v1/ai/qualify-lead \
  -H "Content-Type: application/json" \
  -d '{"lead_id": "123"}'
```

### EmailAssistant_Agent

Generates personalized emails using:
- Contact context
- Deal stage
- Interaction history
- Company information

### DealPredictor_Agent

Predicts deal outcomes and suggests actions based on:
- Similar historical deals
- Current engagement metrics
- Competitor presence
- Deal health score

---

## 📚 Documentation

- **[QUICK_START_GUIDE.md](./project-management/new-features/QUICK_START_GUIDE.md)**: Complete setup guide
- **[OPENSOURCE_PRIVATE_STRATEGY.md](./project-management/new-features/OPENSOURCE_PRIVATE_STRATEGY.md)**: Architecture strategy
- **[CRM_IMPLEMENTATION_EXAMPLES.md](./project-management/new-features/CRM_IMPLEMENTATION_EXAMPLES.md)**: Code examples

---

## 🛡️ Security

### Git Hooks

Install security hooks to prevent committing private code to opensource repos:

```bash
# Pre-commit hook to prevent submodule commits
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
if git diff --cached --name-only | grep -q "^src/conductor"; then
    echo "❌ ERROR: Attempting to commit in submodule!"
    echo "Use proper submodule workflow to contribute to core."
    exit 1
fi
EOF

chmod +x .git/hooks/pre-commit
```

### Environment Variables

Never commit:
- `.env` files
- Production configs
- API keys
- Customer data

Always use `.env.example` templates.

---

## 🚢 Deployment

### Production Deployment

```bash
# Build production images
docker-compose build

# Start services
docker-compose up -d

# Check logs
docker-compose logs -f

# Scale services
docker-compose up -d --scale crm-backend=3
```

### Environment Variables for Production

Edit `.env` and config files:

```bash
NODE_ENV=production
JWT_SECRET=<generate-secure-random-string>
MONGO_URI=<production-mongodb-uri>
```

---

## 🤝 Contributing

### Internal (CRM Private Code)

1. Create feature branch
2. Make changes
3. Run tests
4. Open PR to `main`

### Upstream (Conductor Core)

1. Work in submodule
2. Follow [Conductor contributing guidelines](https://github.com/primoia/conductor/blob/main/CONTRIBUTING.md)
3. Open PR to upstream repository

---

## 📄 License

- **Conductor Core**: MIT License (opensource)
- **Conductor CRM**: Proprietary License (private)

This project uses opensource Conductor components under MIT license while maintaining proprietary business logic.

---

## 🆘 Support

- **Documentation**: See `/project-management/new-features/`
- **Issues**: Internal issue tracker
- **Conductor Core Issues**: https://github.com/primoia/conductor/issues

---

## 🎯 Roadmap

- [x] Project structure setup
- [x] Docker Compose configuration
- [x] Plugin system architecture
- [ ] Add conductor submodules
- [ ] Implement CRM backend (FastAPI)
- [ ] Implement CRM frontend (Angular)
- [ ] LeadQualifier agent
- [ ] EmailAssistant agent
- [ ] DealPredictor agent
- [ ] Automated workflows
- [ ] Production deployment
- [ ] CI/CD pipeline

---

**Version**: 1.0.0
**Last Updated**: 2025-11-05
**Status**: 🟡 In Development
