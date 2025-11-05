# Marco 041: Deploy Production

**Fase:** 5 - Deploy, Testing & Launch
**Duração Estimada:** 3 dias
**Prioridade:** Crítica
**Dependências:** Marco 039 (Containerização), Marco 040 (Testes)

---

## Objetivo

Realizar deploy da aplicação Conductor CRM em ambiente de produção usando plataforma PaaS (Railway/Render/DigitalOcean), configurar domínio customizado com SSL, variáveis de ambiente seguras, backups automatizados do MongoDB, health checks e estratégia de rollback.

---

## Contexto

Deploy em produção requer:
- **Infraestrutura confiável**: Uptime >99%
- **Segurança**: SSL, secrets protegidos, backups
- **Performance**: CDN, caching, otimizações
- **Monitoring**: Health checks, alertas
- **Rollback**: Capacidade de reverter deploys ruins

**Plataforma Recomendada:** Railway
- Deploy automático via Git
- Free tier generoso ($5/mês credit)
- Suporte nativo a Docker
- Managed databases (MongoDB, Redis)
- SSL automático
- Fácil configuração

**Alternativas:**
- **Render**: Também muito bom, free tier
- **DigitalOcean App Platform**: Mais controle, mais caro

---

## Implementação

### 1. Configuração Railway

**Passo 1: Criar Projeto**

```bash
# Instalar Railway CLI
npm i -g @railway/cli

# Login
railway login

# Criar projeto
railway init
```

**Passo 2: Configurar Services**

Railway permite múltiplos services no mesmo projeto:

1. **Backend Service**
   - Source: GitHub repo
   - Root directory: `/backend`
   - Build command: `docker build -f ../docker/backend/Dockerfile .`
   - Start command: Auto-detectado do Dockerfile

2. **Frontend Service**
   - Source: GitHub repo
   - Root directory: `/frontend`
   - Build command: `docker build -f ../docker/frontend/Dockerfile .`
   - Start command: Auto-detectado do Dockerfile

3. **Celery Worker Service**
   - Source: GitHub repo (mesmo repo)
   - Root directory: `/backend`
   - Start command: `celery -A app.celery_app worker --loglevel=warning`

4. **Celery Beat Service**
   - Source: GitHub repo
   - Start command: `celery -A app.celery_app beat --loglevel=warning`

5. **MongoDB Database**
   - Add plugin: MongoDB
   - Railway gerencia automaticamente

6. **Redis Database**
   - Add plugin: Redis
   - Railway gerencia automaticamente

---

### 2. Variáveis de Ambiente - Produção

**Backend Service:**

```bash
# App config
ENVIRONMENT=production
DEBUG=false
SECRET_KEY=<generate-secure-key-256-bits>
BACKEND_URL=https://api.conductor-crm.com
FRONTEND_URL=https://conductor-crm.com

# Database (auto-populado pelo Railway)
MONGO_URL=${{MongoDB.MONGO_URL}}
REDIS_URL=${{Redis.REDIS_URL}}

# API Keys (via Railway secrets)
CLAUDE_API_KEY=${{secrets.CLAUDE_API_KEY}}
OPENAI_API_KEY=${{secrets.OPENAI_API_KEY}}
GOOGLE_CLIENT_ID=${{secrets.GOOGLE_CLIENT_ID}}
GOOGLE_CLIENT_SECRET=${{secrets.GOOGLE_CLIENT_SECRET}}

# Email
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=${{secrets.SMTP_USER}}
SMTP_PASSWORD=${{secrets.SMTP_PASSWORD}}

# Monitoring
SENTRY_DSN=${{secrets.SENTRY_DSN}}

# Security
CORS_ORIGINS=https://conductor-crm.com
ALLOWED_HOSTS=api.conductor-crm.com

# Performance
WORKERS=4
MAX_REQUESTS=1000
MAX_REQUESTS_JITTER=50
```

**Frontend Service:**

```bash
NODE_ENV=production
API_URL=https://api.conductor-crm.com
WS_URL=wss://api.conductor-crm.com
GA_MEASUREMENT_ID=${{secrets.GA_MEASUREMENT_ID}}
SENTRY_DSN=${{secrets.SENTRY_DSN_FRONTEND}}
```

---

### 3. Configuração de Domínio e SSL

**Arquivo:** `docs/DOMAIN_SETUP.md`

```markdown
# Domain Setup

## 1. Comprar domínio (Namecheap, Google Domains, etc)

Exemplo: `conductor-crm.com`

## 2. Configurar DNS

### Backend (API)

**CNAME Record:**
- Host: `api`
- Value: `<railway-backend-url>.railway.app`
- TTL: 3600

### Frontend

**CNAME Record:**
- Host: `@` (ou `www`)
- Value: `<railway-frontend-url>.railway.app`
- TTL: 3600

## 3. Configurar no Railway

### Backend Service:
1. Settings > Domains
2. Add Custom Domain: `api.conductor-crm.com`
3. Railway gera SSL automaticamente (Let's Encrypt)

### Frontend Service:
1. Settings > Domains
2. Add Custom Domain: `conductor-crm.com`
3. SSL auto-gerado

## 4. Verificar SSL

```bash
curl -I https://api.conductor-crm.com
# Deve retornar: HTTP/2 200

curl -I https://conductor-crm.com
# Deve retornar: HTTP/2 200
```

## 5. Redirect www → non-www (opcional)

No Nginx config (frontend):

```nginx
server {
    listen 80;
    server_name www.conductor-crm.com;
    return 301 https://conductor-crm.com$request_uri;
}
```
```

---

### 4. Health Checks

**Backend Health Endpoint:**

**Arquivo:** `backend/app/api/v1/endpoints/health.py`

```python
from fastapi import APIRouter, status
from datetime import datetime
from app.database import get_database
from app.cache import get_redis

router = APIRouter()

@router.get("/health", status_code=status.HTTP_200_OK)
async def health_check():
    """
    Health check completo:
    - API está respondendo
    - MongoDB está conectado
    - Redis está conectado
    """

    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {}
    }

    # Check MongoDB
    try:
        db = await get_database()
        await db.command("ping")
        health_status["services"]["mongodb"] = "healthy"
    except Exception as e:
        health_status["services"]["mongodb"] = f"unhealthy: {str(e)}"
        health_status["status"] = "degraded"

    # Check Redis
    try:
        redis = await get_redis()
        await redis.ping()
        health_status["services"]["redis"] = "healthy"
    except Exception as e:
        health_status["services"]["redis"] = f"unhealthy: {str(e)}"
        health_status["status"] = "degraded"

    return health_status

@router.get("/health/simple", status_code=status.HTTP_200_OK)
async def simple_health():
    """Health check simples (apenas API)"""
    return {"status": "ok"}
```

**Railway Health Check Configuration:**

```yaml
# railway.json (na raiz do repo)
{
  "backend": {
    "healthcheckPath": "/api/v1/health/simple",
    "healthcheckTimeout": 10
  }
}
```

---

### 5. Backup Automatizado do MongoDB

**Estratégia:**
- **Railway MongoDB Plugin**: Já tem backups automáticos diários
- **Backup adicional**: Script customizado via Celery Beat

**Arquivo:** `backend/app/tasks/backup.py`

```python
"""
Tarefas de backup do MongoDB
"""

from celery import shared_task
from datetime import datetime
import boto3
import subprocess
import os

@shared_task
def backup_mongodb():
    """
    Backup diário do MongoDB para S3

    Executado via Celery Beat todo dia às 3am
    """

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    backup_file = f"backup_{timestamp}.gz"

    # 1. Dump do MongoDB
    mongo_url = os.getenv("MONGO_URL")

    try:
        subprocess.run([
            "mongodump",
            f"--uri={mongo_url}",
            "--gzip",
            f"--archive={backup_file}"
        ], check=True)

        # 2. Upload para S3
        s3 = boto3.client(
            's3',
            aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY")
        )

        s3.upload_file(
            backup_file,
            os.getenv("S3_BACKUP_BUCKET"),
            f"mongodb/{backup_file}"
        )

        # 3. Limpar arquivo local
        os.remove(backup_file)

        # 4. Manter apenas últimos 30 dias
        cleanup_old_backups(s3)

        return f"✅ Backup successful: {backup_file}"

    except Exception as e:
        return f"❌ Backup failed: {str(e)}"

def cleanup_old_backups(s3_client):
    """Remove backups com mais de 30 dias"""

    from datetime import timedelta

    bucket = os.getenv("S3_BACKUP_BUCKET")
    cutoff_date = datetime.utcnow() - timedelta(days=30)

    response = s3_client.list_objects_v2(
        Bucket=bucket,
        Prefix="mongodb/"
    )

    for obj in response.get('Contents', []):
        if obj['LastModified'].replace(tzinfo=None) < cutoff_date:
            s3_client.delete_object(
                Bucket=bucket,
                Key=obj['Key']
            )
```

**Configurar Celery Beat:**

```python
# backend/app/celery_config.py

from celery.schedules import crontab

CELERYBEAT_SCHEDULE = {
    'backup-mongodb-daily': {
        'task': 'app.tasks.backup.backup_mongodb',
        'schedule': crontab(hour=3, minute=0),  # 3am UTC
    },
}
```

---

### 6. Deploy Script Automatizado

**Arquivo:** `scripts/deploy.sh`

```bash
#!/bin/bash

set -e

echo "🚀 Starting deployment to production..."

# 1. Verificar branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "❌ Must be on main branch to deploy"
    exit 1
fi

# 2. Verificar que está limpo
if [ -n "$(git status --porcelain)" ]; then
    echo "❌ Working directory not clean. Commit or stash changes."
    exit 1
fi

# 3. Pull latest
echo "📥 Pulling latest changes..."
git pull origin main

# 4. Rodar testes
echo "🧪 Running tests..."
docker-compose run --rm backend pytest
docker-compose run --rm frontend npm test

# 5. Build local (validação)
echo "🔨 Building locally for validation..."
docker-compose -f docker-compose.prod.yml build

# 6. Tag versão
VERSION=$(date +"%Y%m%d_%H%M%S")
git tag -a "v$VERSION" -m "Production deploy $VERSION"

# 7. Push to GitHub (trigger Railway auto-deploy)
echo "📤 Pushing to GitHub..."
git push origin main
git push origin --tags

# 8. Aguardar Railway deploy
echo "⏳ Waiting for Railway to deploy (check dashboard)..."
echo "   https://railway.app/project/<your-project-id>"

# 9. Verificar health checks
echo "🏥 Checking health..."
sleep 60  # Esperar deploy completar

if curl -f https://api.conductor-crm.com/api/v1/health/simple; then
    echo "✅ Backend is healthy!"
else
    echo "❌ Backend health check failed!"
    echo "🔄 Consider rolling back..."
    exit 1
fi

if curl -f https://conductor-crm.com; then
    echo "✅ Frontend is healthy!"
else
    echo "❌ Frontend health check failed!"
    exit 1
fi

# 10. Slack notification (opcional)
if [ -n "$SLACK_WEBHOOK_URL" ]; then
    curl -X POST $SLACK_WEBHOOK_URL \
        -H 'Content-Type: application/json' \
        -d "{\"text\":\"✅ Production deploy successful: v$VERSION\"}"
fi

echo ""
echo "🎉 Deployment completed successfully!"
echo "🔗 Frontend: https://conductor-crm.com"
echo "🔗 Backend: https://api.conductor-crm.com"
echo "🔗 API Docs: https://api.conductor-crm.com/docs"
echo "📊 Version: v$VERSION"
```

---

### 7. Rollback Strategy

**Arquivo:** `scripts/rollback.sh`

```bash
#!/bin/bash

set -e

if [ -z "$1" ]; then
    echo "Usage: ./scripts/rollback.sh <version>"
    echo "Example: ./scripts/rollback.sh v20251105_143022"
    echo ""
    echo "Available versions:"
    git tag -l | tail -5
    exit 1
fi

VERSION=$1

echo "⏪ Rolling back to $VERSION..."

# 1. Verificar que tag existe
if ! git tag -l | grep -q "^$VERSION$"; then
    echo "❌ Version $VERSION not found"
    exit 1
fi

# 2. Confirmar
read -p "Are you sure you want to rollback to $VERSION? (yes/no) " -r
if [[ ! $REPLY =~ ^[Yy]es$ ]]; then
    echo "Rollback cancelled"
    exit 0
fi

# 3. Checkout tag
git checkout $VERSION

# 4. Deploy (force push)
git push origin HEAD:main --force

echo "✅ Rollback to $VERSION initiated"
echo "⏳ Check Railway dashboard for deployment progress"

# 5. Verificar health
sleep 60
if curl -f https://api.conductor-crm.com/api/v1/health/simple; then
    echo "✅ Rollback successful!"
else
    echo "❌ Health check failed after rollback"
    exit 1
fi
```

---

### 8. Configuração de Logs

**Railway Logs:**

Railway automaticamente coleta logs de:
- Stdout/stderr dos containers
- Retenção: 7 dias no free tier

**Log Shipping (opcional - para produção séria):**

```python
# backend/app/core/logging.py

import logging
from pythonjsonlogger import jsonlogger

def setup_logging():
    """
    Configura logging estruturado (JSON)
    """

    logger = logging.getLogger()

    if os.getenv("ENVIRONMENT") == "production":
        # JSON logging para produção
        handler = logging.StreamHandler()
        formatter = jsonlogger.JsonFormatter(
            '%(timestamp)s %(level)s %(name)s %(message)s'
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.setLevel(logging.WARNING)
    else:
        # Pretty logging para desenvolvimento
        logging.basicConfig(
            level=logging.DEBUG,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )

    return logger
```

---

### 9. Environment-Specific Settings

**Arquivo:** `backend/app/core/config.py`

```python
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # App
    APP_NAME: str = "Conductor CRM"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False

    # Security
    SECRET_KEY: str
    ALLOWED_HOSTS: List[str] = ["*"]
    CORS_ORIGINS: List[str] = ["*"]

    # Database
    MONGO_URL: str
    REDIS_URL: str

    # API Keys
    CLAUDE_API_KEY: str
    OPENAI_API_KEY: str | None = None

    # URLs
    BACKEND_URL: str = "http://localhost:8000"
    FRONTEND_URL: str = "http://localhost:4200"

    # Monitoring
    SENTRY_DSN: str | None = None

    # Performance
    CACHE_TTL: int = 300  # 5 minutes

    class Config:
        env_file = ".env"
        case_sensitive = True

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT == "development"

settings = Settings()
```

---

### 10. Pre-Deploy Checklist

**Arquivo:** `docs/DEPLOY_CHECKLIST.md`

```markdown
# Pre-Deploy Checklist

Antes de cada deploy para produção:

## Code Quality
- [ ] Todos os testes passando (pytest, E2E)
- [ ] Linter sem erros (flake8, ESLint)
- [ ] No console.log() no código frontend
- [ ] No print() desnecessários no backend
- [ ] Code review aprovado

## Security
- [ ] Secrets não estão hardcoded
- [ ] .env.example atualizado (sem valores reais)
- [ ] CORS configurado corretamente
- [ ] SQL injection protections (usamos MongoDB, mas validar inputs)
- [ ] XSS protections (CSP headers)
- [ ] Rate limiting configurado

## Database
- [ ] Migrations rodadas (se houver)
- [ ] Indexes criados
- [ ] Backup recente existe

## Performance
- [ ] Bundle size razoável (<2MB frontend)
- [ ] Lazy loading configurado
- [ ] Images otimizadas
- [ ] Caching configurado

## Monitoring
- [ ] Sentry configurado
- [ ] Health checks funcionando
- [ ] Alertas configurados

## Documentation
- [ ] README atualizado
- [ ] API docs atualizados
- [ ] CHANGELOG atualizado

## Infrastructure
- [ ] Environment variables configuradas
- [ ] Domain e SSL configurados
- [ ] Backup automatizado ativo

## Post-Deploy
- [ ] Smoke test manual
- [ ] Verificar logs
- [ ] Verificar Sentry (sem erros novos)
- [ ] Notificar time
```

---

## Critérios de Aceite

### Infraestrutura
- [ ] Railway project criado
- [ ] 4 services deployados (backend, frontend, celery, celery-beat)
- [ ] MongoDB e Redis configurados
- [ ] Environment variables todas setadas
- [ ] Secrets protegidos (não expostos)

### Domínio e SSL
- [ ] Domínio comprado
- [ ] DNS configurado (api.*, www.*)
- [ ] SSL certificado válido (A+ em ssllabs.com)
- [ ] HTTPS redirect funcionando
- [ ] Custom domain funcionando

### Deploy
- [ ] Auto-deploy do GitHub funcionando
- [ ] Deploy script automatizado (`deploy.sh`)
- [ ] Rollback strategy testada
- [ ] Tags de versão criadas
- [ ] Zero-downtime deploy

### Health & Monitoring
- [ ] Health endpoint respondendo
- [ ] Railway health checks configurados
- [ ] Logs acessíveis
- [ ] Uptime > 99% (após 1 semana)

### Backup
- [ ] Railway auto-backup ativo
- [ ] Backup customizado configurado (S3)
- [ ] Restore testado
- [ ] Retention policy (30 dias)

### Performance
- [ ] Response time P95 < 500ms
- [ ] Frontend FCP < 1.5s
- [ ] Backend startup < 30s
- [ ] Database queries otimizadas

### Documentação
- [ ] DEPLOY_CHECKLIST.md criado
- [ ] DOMAIN_SETUP.md criado
- [ ] Runbook para incidentes
- [ ] Credenciais documentadas (1Password/etc)

---

## Riscos

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| **Deploy quebra produção** | Crítico | Testes rigorosos; staging env; rollback rápido |
| **Downtime durante deploy** | Alto | Zero-downtime strategy; health checks |
| **Secrets expostos** | Crítico | Railway secrets; nunca committar .env |
| **Custos excedem budget** | Médio | Monitorar Railway usage; alertas de billing |
| **Backup falha** | Alto | Testar restore; múltiplas estratégias |

---

## Dependências

- Marco 039: Containers funcionando
- Marco 040: Testes passando
- Domínio comprado
- Railway account criada
- AWS account (para backups S3)

---

## Próximos Passos

Após deploy bem-sucedido:
1. Marco 042: Configurar monitoring completo
2. Marco 043: Adicionar analytics
3. Beta testing com usuários reais
4. Iterar baseado em feedback

---

**Estimativa:** 3 dias
**Assignee:** DevOps Engineer + Tech Lead
**Tags:** `deploy`, `production`, `infra`, `critical`
