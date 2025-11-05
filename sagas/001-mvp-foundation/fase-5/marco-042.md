# Marco 042: Launch & Monitoring

**Fase:** 5 - Deploy, Testing & Launch
**Duração Estimada:** 2 dias
**Prioridade:** Alta
**Dependências:** Marco 041 (Deploy Production)

---

## Objetivo

Configurar sistema completo de monitoramento e alertas para a aplicação em produção usando Sentry (error tracking), Uptime Robot (uptime monitoring), e criar runbook para resposta a incidentes. Garantir visibilidade completa da saúde da aplicação e capacidade de detectar e responder rapidamente a problemas.

---

## Contexto

Monitoramento é essencial em produção para:
- **Detectar erros**: Antes dos usuários reportarem
- **Medir performance**: Identificar gargalos
- **Garantir uptime**: Saber quando serviço cai
- **Resposta rápida**: Alertas em tempo real
- **Debug produção**: Stack traces e contexto

**Ferramentas:**
- **Sentry**: Error tracking + Performance monitoring
- **Uptime Robot**: Uptime monitoring (free tier: 50 monitors)
- **Railway Metrics**: CPU, Memory, Network
- **Custom Dashboard**: Metrics agregados

**Target SLA:**
- Uptime: >99%
- Error rate: <0.1%
- MTTD (Mean Time To Detect): <5 minutos
- MTTR (Mean Time To Resolve): <1 hora (para P0)

---

## Implementação

### 1. Sentry Setup - Backend

**Instalar SDK:**

```bash
pip install sentry-sdk[fastapi]
```

**Configurar Sentry:**

**Arquivo:** `backend/app/core/sentry.py`

```python
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.celery import CeleryIntegration
from sentry_sdk.integrations.redis import RedisIntegration
from sentry_sdk.integrations.logging import LoggingIntegration
import os

def init_sentry():
    """
    Inicializa Sentry com todas as integrações
    """

    environment = os.getenv("ENVIRONMENT", "development")
    sentry_dsn = os.getenv("SENTRY_DSN")

    if not sentry_dsn:
        print("⚠️  SENTRY_DSN not configured, skipping Sentry initialization")
        return

    sentry_sdk.init(
        dsn=sentry_dsn,
        environment=environment,

        # Integrations
        integrations=[
            FastApiIntegration(transaction_style="endpoint"),
            CeleryIntegration(),
            RedisIntegration(),
            LoggingIntegration(
                level=logging.INFO,
                event_level=logging.ERROR
            ),
        ],

        # Performance Monitoring
        traces_sample_rate=1.0 if environment == "development" else 0.1,
        profiles_sample_rate=1.0 if environment == "development" else 0.1,

        # Error Filtering
        before_send=before_send_filter,

        # Release tracking
        release=os.getenv("RAILWAY_DEPLOYMENT_ID", "unknown"),
    )

    print(f"✅ Sentry initialized for environment: {environment}")

def before_send_filter(event, hint):
    """
    Filtra eventos antes de enviar para Sentry

    - Ignora 404s
    - Ignora health check errors
    - Adiciona contexto extra
    """

    # Ignorar 404s
    if event.get('exception'):
        exc = event['exception']['values'][0]
        if 'NotFound' in exc.get('type', ''):
            return None

    # Ignorar health checks
    if event.get('request'):
        url = event['request'].get('url', '')
        if '/health' in url:
            return None

    # Adicionar contexto extra
    event['extra'] = event.get('extra', {})
    event['extra']['deployment_id'] = os.getenv("RAILWAY_DEPLOYMENT_ID")

    return event
```

**Integrar no FastAPI:**

**Arquivo:** `backend/app/main.py`

```python
from fastapi import FastAPI, Request
from app.core.sentry import init_sentry
import sentry_sdk

# Inicializar Sentry
init_sentry()

app = FastAPI(title="Conductor CRM API")

@app.middleware("http")
async def sentry_context(request: Request, call_next):
    """
    Adiciona contexto extra ao Sentry para cada request
    """

    # Adicionar user context se autenticado
    if hasattr(request.state, "user"):
        sentry_sdk.set_user({
            "id": str(request.state.user.id),
            "email": request.state.user.email,
        })

    # Adicionar request context
    sentry_sdk.set_context("request", {
        "url": str(request.url),
        "method": request.method,
        "headers": dict(request.headers),
    })

    response = await call_next(request)
    return response
```

---

### 2. Sentry Setup - Frontend

**Instalar SDK:**

```bash
npm install @sentry/angular --save
```

**Configurar Sentry:**

**Arquivo:** `frontend/src/app/core/sentry.config.ts`

```typescript
import * as Sentry from '@sentry/angular';
import { environment } from '../environments/environment';

export function initSentry() {
  if (!environment.sentryDsn) {
    console.warn('⚠️  Sentry DSN not configured');
    return;
  }

  Sentry.init({
    dsn: environment.sentryDsn,
    environment: environment.name,

    // Performance Monitoring
    integrations: [
      new Sentry.BrowserTracing({
        tracePropagationTargets: [
          'localhost',
          'conductor-crm.com',
          'api.conductor-crm.com'
        ],
        routingInstrumentation: Sentry.routingInstrumentation,
      }),
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Performance sampling
    tracesSampleRate: environment.production ? 0.1 : 1.0,

    // Session Replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Release tracking
    release: environment.version,

    // Error filtering
    beforeSend(event, hint) {
      // Ignorar erros de extensões do browser
      if (event.exception) {
        const error = hint.originalException;
        if (error && error.message) {
          if (error.message.includes('chrome-extension://')) {
            return null;
          }
        }
      }

      return event;
    },
  });

  console.log('✅ Sentry initialized');
}
```

**Integrar no Angular:**

**Arquivo:** `frontend/src/main.ts`

```typescript
import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';
import { environment } from './environments/environment';
import { initSentry } from './app/core/sentry.config';

// Inicializar Sentry
initSentry();

if (environment.production) {
  enableProdMode();
}

platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .catch(err => console.error(err));
```

**Error Handler:**

**Arquivo:** `frontend/src/app/core/global-error-handler.ts`

```typescript
import { ErrorHandler, Injectable } from '@angular/core';
import * as Sentry from '@sentry/angular';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  handleError(error: any): void {
    // Log no console (desenvolvimento)
    console.error('Global error:', error);

    // Enviar para Sentry
    Sentry.captureException(error);

    // Mostrar toast para usuário (opcional)
    // this.toastService.error('Algo deu errado. Já fomos notificados.');
  }
}
```

**Registrar no AppModule:**

```typescript
import { ErrorHandler, NgModule } from '@angular/core';
import { GlobalErrorHandler } from './core/global-error-handler';

@NgModule({
  // ...
  providers: [
    {
      provide: ErrorHandler,
      useClass: GlobalErrorHandler,
    },
  ],
})
export class AppModule {}
```

---

### 3. Uptime Robot Setup

**Configurar Monitors:**

1. **Acesse:** https://uptimerobot.com
2. **Crie account gratuito** (50 monitors no free tier)
3. **Adicione monitors:**

**Monitor 1: Backend API**
- Type: HTTP(s)
- URL: `https://api.conductor-crm.com/api/v1/health/simple`
- Interval: 5 minutes
- Alert Contacts: Seu email + Slack (opcional)

**Monitor 2: Frontend**
- Type: HTTP(s)
- URL: `https://conductor-crm.com`
- Interval: 5 minutes
- Alert Contacts: Seu email + Slack

**Monitor 3: Database Health**
- Type: HTTP(s)
- URL: `https://api.conductor-crm.com/api/v1/health` (full check)
- Interval: 10 minutes

**Monitor 4: AI Endpoints**
- Type: Keyword (verifica se resposta contém palavra)
- URL: `https://api.conductor-crm.com/api/v1/ai/health`
- Keyword: `"status":"healthy"`
- Interval: 10 minutes

---

### 4. Alert Configuration

**Sentry Alerts:**

1. **Error Alert:**
   - Trigger: New issue ou spike de erros
   - Condition: >10 occurrences em 1 minuto
   - Actions: Email + Slack

2. **Performance Alert:**
   - Trigger: P95 response time >1 segundo
   - Condition: 5 minutos consecutivos
   - Actions: Email

3. **Release Alert:**
   - Trigger: Novo release deployado
   - Actions: Slack notification

**Uptime Robot Alerts:**

1. **Email Alerts:**
   - Down: Imediato
   - Up: Quando voltar

2. **Slack Integration (opcional):**
   - Criar Incoming Webhook no Slack
   - Adicionar em Alert Contacts

---

### 5. Custom Monitoring Dashboard

**Arquivo:** `backend/app/api/v1/endpoints/monitoring.py`

```python
from fastapi import APIRouter, Depends
from app.database import get_database
from datetime import datetime, timedelta
from app.dependencies import get_current_user

router = APIRouter()

@router.get("/monitoring/metrics")
async def get_metrics(
    current_user = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    Dashboard de métricas do sistema (apenas admins)
    """

    # Últimas 24 horas
    since = datetime.utcnow() - timedelta(hours=24)

    # Queries agregadas
    metrics = {
        "timestamp": datetime.utcnow().isoformat(),
        "users": {
            "total": await db.users.count_documents({}),
            "active_24h": await db.users.count_documents({
                "last_login": {"$gte": since}
            }),
            "new_24h": await db.users.count_documents({
                "created_at": {"$gte": since}
            }),
        },
        "leads": {
            "total": await db.leads.count_documents({}),
            "created_24h": await db.leads.count_documents({
                "created_at": {"$gte": since}
            }),
            "qualified_24h": await db.leads.count_documents({
                "status": "qualified",
                "updated_at": {"$gte": since}
            }),
        },
        "deals": {
            "total": await db.deals.count_documents({}),
            "created_24h": await db.deals.count_documents({
                "created_at": {"$gte": since}
            }),
            "won_24h": await db.deals.count_documents({
                "stage": "won",
                "updated_at": {"$gte": since}
            }),
        },
        "ai": {
            "emails_generated_24h": await db.activities.count_documents({
                "type": "ai_email_generated",
                "created_at": {"$gte": since}
            }),
            "predictions_made_24h": await db.activities.count_documents({
                "type": "ai_prediction",
                "created_at": {"$gte": since}
            }),
        },
        "system": {
            "errors_24h": await get_error_count_from_sentry(),
            "avg_response_time": await get_avg_response_time(),
        }
    }

    return metrics

async def get_error_count_from_sentry():
    """Busca count de erros do Sentry via API"""
    # Implementar chamada à API do Sentry
    return 0  # Placeholder

async def get_avg_response_time():
    """Calcula tempo médio de resposta"""
    # Implementar baseado em logs ou Sentry performance
    return 0.25  # Placeholder (250ms)
```

**Frontend Dashboard:**

**Arquivo:** `frontend/src/app/pages/admin/monitoring/monitoring.component.ts`

```typescript
import { Component, OnInit } from '@angular/core';
import { MonitoringService } from '../../../services/monitoring.service';

@Component({
  selector: 'app-monitoring',
  templateUrl: './monitoring.component.html',
})
export class MonitoringComponent implements OnInit {
  metrics: any;
  loading = true;

  constructor(private monitoringService: MonitoringService) {}

  ngOnInit() {
    this.loadMetrics();
    // Refresh a cada 30 segundos
    setInterval(() => this.loadMetrics(), 30000);
  }

  loadMetrics() {
    this.monitoringService.getMetrics().subscribe({
      next: (data) => {
        this.metrics = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load metrics', err);
        this.loading = false;
      }
    });
  }
}
```

---

### 6. Runbook para Incidentes

**Arquivo:** `docs/RUNBOOK.md`

```markdown
# Incident Response Runbook

## Tipos de Incidentes

### P0 - Crítico (MTTR: <1h)
- Sistema completamente down
- Data loss
- Security breach

### P1 - Alto (MTTR: <4h)
- Feature crítica não funciona
- Performance degradation severa
- Erro afetando >50% dos usuários

### P2 - Médio (MTTR: <24h)
- Feature secundária não funciona
- Performance degradation leve
- Erro afetando <10% dos usuários

### P3 - Baixo (MTTR: <1 semana)
- Bug menor
- Melhoria de UX

---

## Response Process

### 1. Detect (MTTD < 5 min)
- Sentry alert
- Uptime Robot alert
- User report
- Manual detection

### 2. Acknowledge
- Criar incident em Slack #incidents channel
- Atribuir DRI (Directly Responsible Individual)
- Atualizar status page (se houver)

### 3. Assess
- Severidade (P0-P3)
- Impacto (quantos usuários)
- Root cause hypothesis

### 4. Mitigate
- Rollback se deploy recente
- Hotfix se necessário
- Workaround temporário

### 5. Resolve
- Deploy fix
- Verificar health checks
- Monitorar por 30 minutos

### 6. Post-Mortem (apenas P0/P1)
- O que aconteceu?
- Por que aconteceu?
- Como prevenir no futuro?
- Action items

---

## Common Incidents

### Backend não responde

**Symptoms:**
- Uptime Robot alert: API down
- Sentry: Muitos timeouts

**Check:**
```bash
# 1. Verificar Railway logs
railway logs --service backend

# 2. Verificar se container está rodando
# (no Railway dashboard)

# 3. Verificar health check
curl https://api.conductor-crm.com/api/v1/health
```

**Fix:**
```bash
# Restart service via Railway dashboard
# OU
railway restart --service backend
```

---

### MongoDB connection issues

**Symptoms:**
- Sentry: `pymongo.errors.ServerSelectionTimeoutError`
- Health check retorna degraded

**Check:**
```bash
# 1. Verificar MongoDB no Railway
# 2. Verificar MONGO_URL environment variable
# 3. Verificar se IP está whitelisted (Atlas)
```

**Fix:**
- Restart MongoDB plugin
- Verificar credentials
- Verificar network connectivity

---

### High error rate

**Symptoms:**
- Sentry alert: Spike de erros
- Múltiplos erros do mesmo tipo

**Check:**
```bash
# 1. Ver stack trace no Sentry
# 2. Verificar se foi deploy recente
# 3. Verificar se é erro específico de um endpoint
```

**Fix:**
```bash
# Se deploy recente: ROLLBACK
./scripts/rollback.sh <previous-version>

# Se bug específico: Hotfix
git checkout -b hotfix/fix-xxx
# Fix bug
git commit -m "hotfix: fix xxx"
./scripts/deploy.sh
```

---

### Performance degradation

**Symptoms:**
- Sentry: P95 response time >1s
- Usuários reportam lentidão

**Check:**
```bash
# 1. Verificar Sentry Performance
# 2. Verificar Railway metrics (CPU, Memory)
# 3. Verificar slow queries no MongoDB
```

**Fix:**
- Adicionar indexes se query lenta
- Escalar recursos no Railway
- Otimizar código

---

### AI endpoints timing out

**Symptoms:**
- Timeouts em /ai/email/generate
- Celery tasks acumulando

**Check:**
```bash
# 1. Verificar Claude API status
# 2. Verificar Celery worker logs
# 3. Verificar Redis queue size
```

**Fix:**
- Aumentar timeout
- Escalar Celery workers
- Implementar retry logic

---

## Emergency Contacts

- **Tech Lead**: +55 11 99999-9999
- **DevOps**: +55 11 88888-8888
- **On-call rotation**: Ver planilha

## Useful Commands

```bash
# Ver logs em tempo real
railway logs --service backend --follow

# Restart service
railway restart --service <name>

# Rollback deploy
./scripts/rollback.sh <version>

# Acessar shell do container
railway run --service backend bash

# Backup manual do MongoDB
./scripts/backup.sh
```
```

---

### 7. Status Page (Opcional)

Para comunicar status aos usuários, usar **Uptime Robot Public Status Page**:

1. Uptime Robot > Status Pages > Add Status Page
2. Selecionar monitors
3. Custom domain: `status.conductor-crm.com`
4. Branding: Logo, cores

**Ou alternativa:** https://statuspage.io (mais recursos, pago)

---

### 8. Logging Best Practices

**Estruturado (JSON):**

```python
# Backend logging
import structlog

logger = structlog.get_logger()

# Bom
logger.info(
    "user_logged_in",
    user_id=user.id,
    email=user.email,
    ip=request.client.host
)

# Ruim
logger.info(f"User {user.email} logged in from {request.client.host}")
```

**Log Levels:**
- **DEBUG**: Desenvolvimento apenas
- **INFO**: Ações importantes (login, criação de deal)
- **WARNING**: Algo inesperado mas não erro
- **ERROR**: Erro que precisa atenção
- **CRITICAL**: Sistema em estado ruim

---

## Critérios de Aceite

### Sentry
- [ ] Sentry account criado (Free tier)
- [ ] Backend SDK configurado
- [ ] Frontend SDK configurado
- [ ] Error tracking funcionando
- [ ] Performance monitoring ativo
- [ ] Session replay configurado (frontend)
- [ ] Alerts configurados
- [ ] Slack integration (opcional)

### Uptime Monitoring
- [ ] Uptime Robot account criado
- [ ] 4+ monitors configurados
- [ ] Email alerts funcionando
- [ ] Slack integration (opcional)
- [ ] Public status page criada (opcional)

### Metrics & Dashboard
- [ ] Endpoint /monitoring/metrics criado
- [ ] Frontend dashboard (admin only)
- [ ] Métricas de negócio (leads, deals)
- [ ] Métricas de sistema (errors, performance)
- [ ] Auto-refresh configurado

### Incident Response
- [ ] RUNBOOK.md completo
- [ ] Processos documentados
- [ ] Severidades definidas
- [ ] SLAs definidos (MTTD, MTTR)
- [ ] Emergency contacts definidos
- [ ] Slack #incidents channel criado

### Testing
- [ ] Simular erro e verificar Sentry
- [ ] Simular downtime e verificar Uptime Robot
- [ ] Testar rollback process
- [ ] Validar alertas chegando

---

## Riscos

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| **Alert fatigue (muitos alertas)** | Médio | Filtrar bem; thresholds adequados |
| **Sentry quota excedida** | Baixo | Monitorar usage; upgrade se necessário |
| **Falso positivo em alertas** | Baixo | Ajustar sensibilidade; whitelist conhecidos |
| **Incidente não detectado** | Alto | Múltiplas camadas de monitoring |

---

## Dependências

- Marco 041: Produção rodando
- Sentry account
- Uptime Robot account
- Slack workspace (opcional)

---

**Estimativa:** 2 dias
**Assignee:** DevOps Engineer + Backend Developer
**Tags:** `monitoring`, `sentry`, `alerts`, `ops`
