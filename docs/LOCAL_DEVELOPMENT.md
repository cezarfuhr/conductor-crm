# Local Development Setup Guide

## Prerequisites

### Required Software

- **Docker**: >= 24.0
- **Docker Compose**: >= 2.20
- **Python**: >= 3.11
- **Node.js**: >= 20.x
- **npm**: >= 10.x
- **Git**: >= 2.40

### Recommended Tools

- **VS Code** with extensions:
  - Python
  - Pylance
  - Angular Language Service
  - Docker
  - GitLens
- **Postman** or **Insomnia** (API testing)
- **MongoDB Compass** (database GUI)
- **Redis Insight** (Redis GUI)

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/your-org/conductor-crm.git
cd conductor-crm
```

### 2. Run Setup Script

```bash
./scripts/setup-dev.sh
```

This script will:
- Create `.env` from `.env.example`
- Initialize Conductor submodules
- Set up Python virtual environment
- Install npm dependencies
- Start Docker services (MongoDB, Redis)

### 3. Configure Environment

Edit `.env` with your actual API keys:

```bash
# Minimum required for basic functionality
CLAUDE_API_KEY=sk-ant-your-key-here
SECRET_KEY=$(openssl rand -hex 32)

# Optional for full functionality
CLEARBIT_API_KEY=your-clearbit-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 4. Start Services

#### Option A: Using Scripts

```bash
# Start all services
./run-start-all-dev.sh

# Check status
./run-status.sh

# View logs
./run-logs.sh

# Stop all
./run-stop-all-dev.sh
```

#### Option B: Manual Start

**Terminal 1 - Backend:**
```bash
cd src/backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd src/frontend
npm start
```

**Terminal 3 - Celery Worker:**
```bash
cd src/backend
source venv/bin/activate
celery -A app.celery_app worker --loglevel=info
```

**Terminal 4 - Celery Beat:**
```bash
cd src/backend
source venv/bin/activate
celery -A app.celery_app beat --loglevel=info
```

### 5. Access Application

- **Frontend**: http://localhost:4200
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **MongoDB**: localhost:27017
- **Redis**: localhost:6379

## Project Structure

```
conductor-crm/
├── .github/
│   └── workflows/          # CI/CD pipelines
├── conductor/              # Conductor framework submodules
│   ├── conductor/          # Core framework
│   ├── conductor-gateway/  # API gateway
│   └── conductor-web/      # Web UI
├── config/                 # Configuration files
├── docs/                   # Documentation
├── scripts/                # Utility scripts
├── src/
│   ├── backend/            # FastAPI backend
│   │   ├── app/
│   │   │   ├── agents/     # AI agents
│   │   │   ├── api/        # API routes
│   │   │   ├── core/       # Core config
│   │   │   ├── models/     # Data models
│   │   │   ├── services/   # Business logic
│   │   │   └── main.py     # FastAPI app
│   │   ├── tests/          # Backend tests
│   │   ├── requirements.txt
│   │   └── pyproject.toml
│   └── frontend/           # Angular frontend
│       ├── src/
│       │   ├── app/
│       │   │   ├── core/   # Core services
│       │   │   ├── pages/  # Page components
│       │   │   ├── shared/ # Shared components
│       │   │   └── store/  # NgRx state
│       │   └── environments/
│       ├── package.json
│       └── angular.json
├── .env.example            # Environment template
├── docker-compose.yml      # Production compose
├── docker-compose.dev.yml  # Development compose
└── README.md
```

## Development Workflow

### Backend Development

#### Install Dependencies

```bash
cd src/backend
source venv/bin/activate
pip install -r requirements.txt
pip install -r requirements-dev.txt
```

#### Run Tests

```bash
# All tests
pytest

# With coverage
pytest --cov=app --cov-report=html

# Specific test file
pytest tests/test_leads.py

# With verbose output
pytest -v
```

#### Linting & Formatting

```bash
# Lint
flake8 app/

# Format
black app/
isort app/

# Type checking
mypy app/
```

#### Database Operations

```bash
# Access MongoDB shell
docker compose -f docker-compose.dev.yml exec mongodb mongosh

# View databases
show dbs

# Use conductor_dev database
use conductor_dev

# View collections
show collections

# Query example
db.leads.find().pretty()
```

#### Redis Operations

```bash
# Access Redis CLI
docker compose -f docker-compose.dev.yml exec redis redis-cli

# View keys
KEYS *

# Get value
GET key_name

# Monitor commands
MONITOR
```

### Frontend Development

#### Install Dependencies

```bash
cd src/frontend
npm install
```

#### Development Server

```bash
# Start dev server
npm start

# Custom port
ng serve --port 4201

# Open browser automatically
ng serve --open
```

#### Build

```bash
# Development build
npm run build

# Production build
npm run build -- --configuration=production

# Build with source maps
npm run build -- --source-map
```

#### Tests

```bash
# Unit tests
npm test

# E2E tests
npm run e2e

# Test coverage
npm run test:coverage
```

#### Linting

```bash
# Lint
npm run lint

# Lint and fix
npm run lint:fix
```

#### Code Generation

```bash
# Generate component
ng generate component pages/leads/lead-list

# Generate service
ng generate service services/lead

# Generate module
ng generate module pages/dashboard
```

## Docker Services

### Start/Stop Services

```bash
# Start all
docker compose -f docker-compose.dev.yml up -d

# Start specific service
docker compose -f docker-compose.dev.yml up -d mongodb

# Stop all
docker compose -f docker-compose.dev.yml down

# Stop and remove volumes
docker compose -f docker-compose.dev.yml down -v
```

### View Logs

```bash
# All services
docker compose -f docker-compose.dev.yml logs -f

# Specific service
docker compose -f docker-compose.dev.yml logs -f mongodb

# Last 100 lines
docker compose -f docker-compose.dev.yml logs --tail=100
```

### Execute Commands

```bash
# MongoDB
docker compose -f docker-compose.dev.yml exec mongodb mongosh

# Redis
docker compose -f docker-compose.dev.yml exec redis redis-cli

# Backend shell
docker compose -f docker-compose.dev.yml exec backend bash
```

## Debugging

### Backend Debugging (VS Code)

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Python: FastAPI",
      "type": "python",
      "request": "launch",
      "module": "uvicorn",
      "args": [
        "app.main:app",
        "--reload",
        "--port",
        "8000"
      ],
      "jinja": true,
      "justMyCode": false,
      "cwd": "${workspaceFolder}/src/backend",
      "env": {
        "PYTHONPATH": "${workspaceFolder}/src/backend"
      }
    }
  ]
}
```

### Frontend Debugging (Chrome DevTools)

1. Open Chrome DevTools (F12)
2. Go to Sources tab
3. Use `debugger;` statement in code
4. Or set breakpoints directly in DevTools

### API Debugging (Postman)

Import OpenAPI spec from http://localhost:8000/openapi.json

## Common Tasks

### Create New API Endpoint

1. Define model in `src/backend/app/models/`
2. Create service in `src/backend/app/services/`
3. Create endpoint in `src/backend/app/api/v1/endpoints/`
4. Register router in `src/backend/app/api/v1/api.py`
5. Write tests in `src/backend/tests/`

### Create New Frontend Page

1. Generate component: `ng generate component pages/my-page`
2. Add route in `app-routing.module.ts`
3. Create service if needed: `ng generate service services/my-service`
4. Add NgRx actions/reducers if needed
5. Write tests

### Add New AI Agent

1. Create agent in `src/backend/app/agents/my_agent.py`
2. Define prompts and tools
3. Create endpoint to invoke agent
4. Add tests
5. Document in CONDUCTOR_INTEGRATION.md

## Environment Variables

### Required

```bash
# Security
SECRET_KEY=<generated-secret>
CLAUDE_API_KEY=<your-claude-key>

# Database
MONGO_URL=mongodb://admin:conductor123@localhost:27017/conductor_dev?authSource=admin
REDIS_URL=redis://localhost:6379/0
```

### Optional

```bash
# Backup LLM
OPENAI_API_KEY=<your-openai-key>

# Integrations
CLEARBIT_API_KEY=<your-key>
HUNTER_API_KEY=<your-key>
GOOGLE_CLIENT_ID=<your-id>
GOOGLE_CLIENT_SECRET=<your-secret>

# Monitoring
SENTRY_DSN=<your-dsn>
```

## Troubleshooting

### MongoDB Connection Failed

```bash
# Check if MongoDB is running
docker compose -f docker-compose.dev.yml ps mongodb

# Restart MongoDB
docker compose -f docker-compose.dev.yml restart mongodb

# Check logs
docker compose -f docker-compose.dev.yml logs mongodb
```

### Redis Connection Failed

```bash
# Check if Redis is running
docker compose -f docker-compose.dev.yml ps redis

# Restart Redis
docker compose -f docker-compose.dev.yml restart redis
```

### Port Already in Use

```bash
# Find process using port 8000
lsof -i :8000

# Kill process
kill -9 <PID>
```

### Frontend Build Errors

```bash
# Clear cache
rm -rf node_modules .angular
npm install

# Update Angular CLI
npm install -g @angular/cli@latest
```

### Python Import Errors

```bash
# Reinstall dependencies
cd src/backend
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Performance Tips

### Backend

- Use Redis caching for expensive operations
- Index MongoDB collections properly
- Use async operations where possible
- Implement pagination for list endpoints

### Frontend

- Use lazy loading for routes
- Implement virtual scrolling for long lists
- Use OnPush change detection strategy
- Optimize bundle size with code splitting

## Security Best Practices

- Never commit `.env` file
- Use environment variables for secrets
- Validate all user inputs
- Implement rate limiting
- Use HTTPS in production
- Keep dependencies updated

## Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Angular Documentation](https://angular.io/docs)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Redis Documentation](https://redis.io/docs/)
- [Conductor Integration](./CONDUCTOR_INTEGRATION.md)

## Getting Help

- Check existing documentation
- Search closed issues on GitHub
- Ask in team Slack channel
- Contact Tech Lead for complex issues

---

**Last Updated**: 2025-11-05
