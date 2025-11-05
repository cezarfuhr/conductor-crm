# Marco 039: Containerização (Docker/Compose)

**Fase:** 5 - Deploy, Testing & Launch
**Duração Estimada:** 3 dias
**Prioridade:** Alta
**Dependências:** Todas as fases anteriores (001-038)

---

## Objetivo

Containerizar toda a aplicação Conductor CRM usando Docker e Docker Compose, incluindo backend (FastAPI), frontend (Angular), MongoDB, Redis e Celery Worker. Criar configurações para ambientes de desenvolvimento e produção com imagens otimizadas e multi-stage builds.

---

## Contexto

A containerização permite:
- **Ambientes consistentes**: Dev, staging e produção idênticos
- **Fácil onboarding**: Desenvolvedores novos rodando em minutos
- **Deploy simplificado**: Push e deploy automático
- **Escalabilidade**: Fácil replicação de containers
- **Isolamento**: Dependências isoladas por serviço

---

## Implementação

### 1. Dockerfile - Backend (FastAPI)

**Arquivo:** `docker/backend/Dockerfile`

```dockerfile
# Multi-stage build para otimização

# Stage 1: Builder
FROM python:3.11-slim as builder

WORKDIR /app

# Instalar dependências de build
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements e instalar dependências
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Stage 2: Runtime
FROM python:3.11-slim

WORKDIR /app

# Copiar dependências do builder
COPY --from=builder /root/.local /root/.local

# Adicionar ao PATH
ENV PATH=/root/.local/bin:$PATH

# Copiar código da aplicação
COPY . .

# Criar usuário não-root
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Expor porta
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')"

# Comando de inicialização
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Otimizações:**
- Multi-stage build reduz imagem final em ~40%
- Layer caching para requirements (não rebuilda se não mudar)
- Usuário não-root para segurança
- Health check integrado

---

### 2. Dockerfile - Frontend (Angular)

**Arquivo:** `docker/frontend/Dockerfile`

```dockerfile
# Multi-stage build

# Stage 1: Build
FROM node:20-alpine as builder

WORKDIR /app

# Copiar package files
COPY package*.json ./
RUN npm ci --only=production

# Copiar código e buildar
COPY . .
RUN npm run build -- --configuration=production

# Stage 2: Nginx
FROM nginx:alpine

# Copiar configuração customizada do nginx
COPY docker/nginx/nginx.conf /etc/nginx/conf.d/default.conf

# Copiar arquivos buildados
COPY --from=builder /app/dist/conductor-crm /usr/share/nginx/html

# Expor porta
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
    CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

# Nginx já roda automaticamente
CMD ["nginx", "-g", "daemon off;"]
```

---

### 3. Nginx Configuration

**Arquivo:** `docker/nginx/nginx.conf`

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript
               application/x-javascript application/xml+rss
               application/javascript application/json;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy (opcional, se quiser usar mesma porta)
    location /api {
        proxy_pass http://backend:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket proxy
    location /ws {
        proxy_pass http://backend:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

---

### 4. Docker Compose - Development

**Arquivo:** `docker-compose.yml`

```yaml
version: '3.8'

services:
  # MongoDB
  mongodb:
    image: mongo:7.0
    container_name: conductor-mongodb
    restart: unless-stopped
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: admin123
      MONGO_INITDB_DATABASE: conductor_dev
    volumes:
      - mongodb_data:/data/db
      - ./scripts/mongo-init.js:/docker-entrypoint-initdb.d/mongo-init.js:ro
    networks:
      - conductor-network
    healthcheck:
      test: echo 'db.runCommand("ping").ok' | mongosh localhost:27017/test --quiet
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis
  redis:
    image: redis:7-alpine
    container_name: conductor-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - conductor-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  # Backend (FastAPI)
  backend:
    build:
      context: ./backend
      dockerfile: ../docker/backend/Dockerfile
    container_name: conductor-backend
    restart: unless-stopped
    ports:
      - "8000:8000"
    environment:
      - ENVIRONMENT=development
      - DEBUG=true
      - MONGO_URL=mongodb://admin:admin123@mongodb:27017/conductor_dev?authSource=admin
      - REDIS_URL=redis://redis:6379/0
      - SECRET_KEY=dev-secret-key-change-in-production
      - CLAUDE_API_KEY=${CLAUDE_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
      - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
    volumes:
      - ./backend:/app
      - backend_logs:/app/logs
    depends_on:
      mongodb:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - conductor-network
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

  # Celery Worker
  celery-worker:
    build:
      context: ./backend
      dockerfile: ../docker/backend/Dockerfile
    container_name: conductor-celery
    restart: unless-stopped
    environment:
      - ENVIRONMENT=development
      - MONGO_URL=mongodb://admin:admin123@mongodb:27017/conductor_dev?authSource=admin
      - REDIS_URL=redis://redis:6379/0
      - CLAUDE_API_KEY=${CLAUDE_API_KEY}
    volumes:
      - ./backend:/app
    depends_on:
      - mongodb
      - redis
    networks:
      - conductor-network
    command: celery -A app.celery_app worker --loglevel=info --concurrency=4

  # Celery Beat (scheduled tasks)
  celery-beat:
    build:
      context: ./backend
      dockerfile: ../docker/backend/Dockerfile
    container_name: conductor-celery-beat
    restart: unless-stopped
    environment:
      - ENVIRONMENT=development
      - MONGO_URL=mongodb://admin:admin123@mongodb:27017/conductor_dev?authSource=admin
      - REDIS_URL=redis://redis:6379/0
    volumes:
      - ./backend:/app
    depends_on:
      - mongodb
      - redis
    networks:
      - conductor-network
    command: celery -A app.celery_app beat --loglevel=info

  # Frontend (Angular)
  frontend:
    build:
      context: ./frontend
      dockerfile: ../docker/frontend/Dockerfile
      target: builder  # Usa stage de desenvolvimento
    container_name: conductor-frontend
    restart: unless-stopped
    ports:
      - "4200:4200"
    environment:
      - NODE_ENV=development
    volumes:
      - ./frontend:/app
      - /app/node_modules
    networks:
      - conductor-network
    command: npm start -- --host 0.0.0.0 --port 4200

networks:
  conductor-network:
    driver: bridge

volumes:
  mongodb_data:
  redis_data:
  backend_logs:
```

---

### 5. Docker Compose - Production

**Arquivo:** `docker-compose.prod.yml`

```yaml
version: '3.8'

services:
  # Backend (FastAPI)
  backend:
    build:
      context: ./backend
      dockerfile: ../docker/backend/Dockerfile
    container_name: conductor-backend-prod
    restart: always
    ports:
      - "8000:8000"
    environment:
      - ENVIRONMENT=production
      - DEBUG=false
      - MONGO_URL=${MONGO_URL}
      - REDIS_URL=${REDIS_URL}
      - SECRET_KEY=${SECRET_KEY}
      - CLAUDE_API_KEY=${CLAUDE_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
      - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
      - SENTRY_DSN=${SENTRY_DSN}
      - FRONTEND_URL=${FRONTEND_URL}
    networks:
      - conductor-network
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M

  # Celery Worker
  celery-worker:
    build:
      context: ./backend
      dockerfile: ../docker/backend/Dockerfile
    container_name: conductor-celery-prod
    restart: always
    environment:
      - ENVIRONMENT=production
      - MONGO_URL=${MONGO_URL}
      - REDIS_URL=${REDIS_URL}
      - CLAUDE_API_KEY=${CLAUDE_API_KEY}
      - SENTRY_DSN=${SENTRY_DSN}
    networks:
      - conductor-network
    command: celery -A app.celery_app worker --loglevel=warning --concurrency=8
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G

  # Celery Beat
  celery-beat:
    build:
      context: ./backend
      dockerfile: ../docker/backend/Dockerfile
    container_name: conductor-celery-beat-prod
    restart: always
    environment:
      - ENVIRONMENT=production
      - MONGO_URL=${MONGO_URL}
      - REDIS_URL=${REDIS_URL}
    networks:
      - conductor-network
    command: celery -A app.celery_app beat --loglevel=warning

  # Frontend (Angular + Nginx)
  frontend:
    build:
      context: ./frontend
      dockerfile: ../docker/frontend/Dockerfile
    container_name: conductor-frontend-prod
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./ssl:/etc/nginx/ssl:ro  # SSL certificates
    networks:
      - conductor-network
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M

networks:
  conductor-network:
    driver: bridge
```

---

### 6. Scripts de Gerenciamento

**Arquivo:** `scripts/docker-dev.sh`

```bash
#!/bin/bash

# Script para gerenciar ambiente de desenvolvimento

set -e

case "$1" in
  start)
    echo "🚀 Iniciando ambiente de desenvolvimento..."
    docker-compose up -d
    echo "✅ Ambiente iniciado!"
    echo "📱 Frontend: http://localhost:4200"
    echo "🔌 Backend: http://localhost:8000"
    echo "📚 API Docs: http://localhost:8000/docs"
    ;;

  stop)
    echo "🛑 Parando ambiente..."
    docker-compose down
    echo "✅ Ambiente parado!"
    ;;

  restart)
    echo "🔄 Reiniciando ambiente..."
    docker-compose restart
    echo "✅ Ambiente reiniciado!"
    ;;

  logs)
    docker-compose logs -f ${2:-}
    ;;

  clean)
    echo "🧹 Limpando containers, volumes e imagens..."
    docker-compose down -v
    docker system prune -f
    echo "✅ Limpeza completa!"
    ;;

  rebuild)
    echo "🔨 Rebuilding containers..."
    docker-compose build --no-cache
    docker-compose up -d
    echo "✅ Rebuild completo!"
    ;;

  shell)
    docker-compose exec ${2:-backend} /bin/bash
    ;;

  *)
    echo "Uso: $0 {start|stop|restart|logs|clean|rebuild|shell}"
    exit 1
    ;;
esac
```

**Arquivo:** `scripts/docker-prod.sh`

```bash
#!/bin/bash

# Script para gerenciar ambiente de produção

set -e

case "$1" in
  deploy)
    echo "🚀 Deploying to production..."

    # Pull latest changes
    git pull origin main

    # Build images
    docker-compose -f docker-compose.prod.yml build

    # Start with zero downtime
    docker-compose -f docker-compose.prod.yml up -d

    # Wait for health checks
    echo "⏳ Waiting for services to be healthy..."
    sleep 10

    # Check health
    if curl -f http://localhost:8000/health; then
      echo "✅ Backend healthy!"
    else
      echo "❌ Backend unhealthy! Rolling back..."
      docker-compose -f docker-compose.prod.yml down
      exit 1
    fi

    echo "✅ Deploy successful!"
    ;;

  rollback)
    echo "⏪ Rolling back to previous version..."
    git reset --hard HEAD~1
    docker-compose -f docker-compose.prod.yml up -d --force-recreate
    echo "✅ Rollback complete!"
    ;;

  logs)
    docker-compose -f docker-compose.prod.yml logs -f ${2:-}
    ;;

  status)
    docker-compose -f docker-compose.prod.yml ps
    ;;

  *)
    echo "Uso: $0 {deploy|rollback|logs|status}"
    exit 1
    ;;
esac
```

---

### 7. Arquivo .dockerignore

**Arquivo:** `backend/.dockerignore`

```
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
env/
venv/
.venv/
*.egg-info/
dist/
build/

# Testing
.pytest_cache/
.coverage
htmlcov/

# IDE
.vscode/
.idea/
*.swp
*.swo

# Environment
.env
.env.local

# Logs
logs/
*.log

# OS
.DS_Store
Thumbs.db

# Git
.git/
.gitignore
```

**Arquivo:** `frontend/.dockerignore`

```
# Dependencies
node_modules/
npm-debug.log
yarn-error.log

# Build
dist/
.angular/

# Testing
coverage/

# IDE
.vscode/
.idea/
*.swp

# Environment
.env
.env.local

# OS
.DS_Store
Thumbs.db

# Git
.git/
.gitignore
```

---

### 8. Inicialização do MongoDB

**Arquivo:** `scripts/mongo-init.js`

```javascript
// Script de inicialização do MongoDB

db = db.getSiblingDB('conductor_dev');

// Criar coleções
db.createCollection('users');
db.createCollection('leads');
db.createCollection('deals');
db.createCollection('companies');
db.createCollection('activities');
db.createCollection('email_tracking_events');
db.createCollection('workflows');
db.createCollection('workflow_executions');
db.createCollection('ai_chat_conversations');
db.createCollection('calendar_events');
db.createCollection('notifications');
db.createCollection('user_preferences');

// Criar índices essenciais
db.users.createIndex({ email: 1 }, { unique: true });
db.leads.createIndex({ email: 1 });
db.leads.createIndex({ owner_id: 1 });
db.deals.createIndex({ owner_id: 1 });
db.deals.createIndex({ lead_id: 1 });
db.companies.createIndex({ domain: 1 }, { unique: true });

print('✅ MongoDB inicializado com sucesso!');
```

---

## Documentação

### README para Desenvolvimento

**Arquivo:** `docs/DOCKER_SETUP.md`

```markdown
# Docker Setup - Conductor CRM

## Pré-requisitos

- Docker >= 24.0
- Docker Compose >= 2.20
- 4GB RAM disponível
- 10GB espaço em disco

## Quick Start

1. **Clonar repositório:**
```bash
git clone https://github.com/your-org/conductor-crm.git
cd conductor-crm
```

2. **Criar arquivo .env:**
```bash
cp .env.example .env
# Editar com suas API keys
```

3. **Iniciar ambiente:**
```bash
./scripts/docker-dev.sh start
```

4. **Acessar aplicação:**
- Frontend: http://localhost:4200
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Comandos Úteis

```bash
# Ver logs
./scripts/docker-dev.sh logs [service]

# Acessar shell do container
./scripts/docker-dev.sh shell backend

# Rebuild completo
./scripts/docker-dev.sh rebuild

# Limpar tudo
./scripts/docker-dev.sh clean
```

## Troubleshooting

### Porta em uso
```bash
# Verificar o que está usando a porta
lsof -i :4200
lsof -i :8000

# Matar processo
kill -9 <PID>
```

### Container não inicia
```bash
# Ver logs detalhados
docker-compose logs backend

# Rebuild sem cache
docker-compose build --no-cache backend
```

### MongoDB connection refused
```bash
# Verificar se está rodando
docker-compose ps mongodb

# Reiniciar MongoDB
docker-compose restart mongodb
```
```

---

## Testes

### Testar Build Local

```bash
# Backend
cd backend
docker build -f ../docker/backend/Dockerfile -t conductor-backend:test .

# Frontend
cd frontend
docker build -f ../docker/frontend/Dockerfile -t conductor-frontend:test .
```

### Testar Docker Compose

```bash
# Iniciar ambiente
docker-compose up -d

# Verificar health checks
docker-compose ps

# Todos devem estar "healthy"
```

---

## Critérios de Aceite

### Build e Inicialização
- [ ] Backend Dockerfile builda sem erros
- [ ] Frontend Dockerfile builda sem erros
- [ ] Imagens otimizadas (backend <500MB, frontend <100MB)
- [ ] Multi-stage builds funcionando
- [ ] docker-compose.yml válido
- [ ] docker-compose.prod.yml válido

### Funcionalidade
- [ ] Todos os serviços iniciam corretamente
- [ ] Health checks passando
- [ ] Backend responde em http://localhost:8000/health
- [ ] Frontend carrega em http://localhost:4200
- [ ] MongoDB conecta e aceita operações
- [ ] Redis conecta e aceita operações
- [ ] Celery worker processa tarefas
- [ ] Celery beat executa scheduled tasks

### Desenvolvimento
- [ ] Hot reload funciona (backend e frontend)
- [ ] Volumes montados corretamente
- [ ] Logs acessíveis via docker-compose logs
- [ ] Fácil acesso a shell dos containers
- [ ] Scripts de gerenciamento funcionando

### Produção
- [ ] Environment variables separadas
- [ ] Secrets não hardcoded
- [ ] Resource limits configurados
- [ ] Logging estruturado
- [ ] Rollback strategy documentada

### Documentação
- [ ] DOCKER_SETUP.md completo
- [ ] .dockerignore em todos os serviços
- [ ] Scripts executáveis (chmod +x)
- [ ] Troubleshooting guide

---

## Riscos

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| **Imagens muito grandes** | Médio | Multi-stage builds; .dockerignore completo |
| **Hot reload não funciona** | Baixo | Volumes montados corretamente; testar antes |
| **Conflito de portas** | Baixo | Documentar portas; verificar antes de iniciar |
| **Segredos expostos** | Alto | .env não commitado; secrets manager em prod |

---

## Dependências

- Marco 001-038: Todo código anterior precisa estar funcionando
- Docker e Docker Compose instalados
- API keys configuradas (.env)

---

## Próximos Passos

Após conclusão:
1. Marco 040: Implementar testes E2E e carga
2. Marco 041: Deploy em produção
3. Validar ambiente de staging

---

**Estimativa:** 3 dias
**Assignee:** DevOps Engineer
**Tags:** `infra`, `docker`, `deploy`
