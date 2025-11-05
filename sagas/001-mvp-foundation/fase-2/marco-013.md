# Marco 013: Auto-Enrichment Pipeline
> Backend - Pipeline automático de enriquecimento de dados | 3 dias

**Responsável**: Backend Dev
**Revisor**: Tech Lead
**Status**: 🔵 Planejado

---

## 🎯 Objetivo

Implementar pipeline automático que enriquece leads com dados externos (Clearbit, Hunter.io, etc) imediatamente após criação, adicionando informações de empresa, cargo, redes sociais e mais.

---

## 📋 Contexto

Dados enriquecidos melhoram drasticamente a qualificação de leads. O pipeline deve:
- Executar automaticamente ao criar lead
- Ser idempotente (pode re-executar sem duplicar)
- Ter retry logic (APIs externas podem falhar)
- Armazenar resultados mesmo parciais
- Não bloquear criação do lead (async)

**Integração**: Celery + Redis (background tasks) + External APIs

---

## 🏗️ Arquitetura do Pipeline

```
Lead Created
     ↓
[Trigger Enrichment Task]
     ↓
[Celery Worker]
     ↓
  ┌─────────────────────┐
  │ Enrichment Pipeline │
  └─────────────────────┘
           ↓
    ┌──────┴──────┐
    ↓             ↓
[Clearbit]   [Hunter.io]
    ↓             ↓
[Merge Results]
    ↓
[Save to MongoDB]
    ↓
[Trigger Re-qualification]
```

---

## 🔌 External APIs

### 1. Clearbit Enrichment API

**Endpoint**: `GET https://company.clearbit.com/v2/companies/find?domain=<domain>`

**Response**:
```json
{
  "id": "clearbit-uuid",
  "name": "Acme Corp",
  "domain": "acme.com",
  "logo": "https://logo.clearbit.com/acme.com",
  "description": "Enterprise software company...",
  "foundedYear": 2010,
  "location": "São Paulo, Brazil",
  "timeZone": "America/Sao_Paulo",
  "employees": 150,
  "employeesRange": "100-250",
  "marketCap": null,
  "raised": 5000000,
  "metrics": {
    "alexaUsRank": 50000,
    "alexaGlobalRank": 150000,
    "employees": 150,
    "employeesRange": "100-250",
    "marketCap": null,
    "raised": 5000000,
    "annualRevenue": null
  },
  "category": {
    "sector": "Information Technology",
    "industryGroup": "Software",
    "industry": "Application Software",
    "subIndustry": "Enterprise Software"
  },
  "tags": ["B2B", "SaaS", "Enterprise"],
  "tech": ["google_analytics", "salesforce", "aws"],
  "linkedin": {
    "handle": "company/acme-corp"
  },
  "twitter": {
    "handle": "acmecorp",
    "followers": 5000
  }
}
```

### 2. Hunter.io Email Verification

**Endpoint**: `GET https://api.hunter.io/v2/email-verifier?email=<email>&api_key=<key>`

**Response**:
```json
{
  "data": {
    "status": "valid",
    "result": "deliverable",
    "score": 95,
    "email": "john@acme.com",
    "regexp": true,
    "gibberish": false,
    "disposable": false,
    "webmail": false,
    "mx_records": true,
    "smtp_server": true,
    "smtp_check": true,
    "accept_all": false,
    "block": false,
    "sources": [...]
  }
}
```

---

## 💻 Implementação

### 1. Enrichment Service

```python
# src/services/enrichment_service.py

import httpx
import os
from typing import Dict, Optional, List
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class EnrichmentService:
    """
    Serviço de enriquecimento de dados usando APIs externas
    """

    def __init__(self):
        self.clearbit_api_key = os.getenv('CLEARBIT_API_KEY')
        self.hunter_api_key = os.getenv('HUNTER_API_KEY')

        self.clearbit_base_url = "https://company.clearbit.com/v2"
        self.hunter_base_url = "https://api.hunter.io/v2"

        self.timeout = 10.0  # 10 segundos timeout

    async def enrich_lead(
        self,
        email: str,
        company_domain: Optional[str] = None
    ) -> Dict:
        """
        Enriquece lead com dados de múltiplas fontes

        Returns:
            {
                "company_data": {...},
                "email_verification": {...},
                "social_profiles": {...},
                "enrichment_metadata": {...}
            }
        """
        enrichment_result = {
            "company_data": None,
            "email_verification": None,
            "social_profiles": {},
            "enrichment_metadata": {
                "enriched_at": datetime.utcnow().isoformat(),
                "sources_used": [],
                "sources_failed": [],
                "completeness_score": 0
            }
        }

        # 1. Determinar company domain do email
        if not company_domain:
            company_domain = self._extract_domain_from_email(email)

        # 2. Enriquecer dados da empresa (Clearbit)
        company_data = await self._enrich_company(company_domain)
        if company_data:
            enrichment_result["company_data"] = company_data
            enrichment_result["enrichment_metadata"]["sources_used"].append("clearbit")
        else:
            enrichment_result["enrichment_metadata"]["sources_failed"].append("clearbit")

        # 3. Verificar email (Hunter.io)
        email_verification = await self._verify_email(email)
        if email_verification:
            enrichment_result["email_verification"] = email_verification
            enrichment_result["enrichment_metadata"]["sources_used"].append("hunter")
        else:
            enrichment_result["enrichment_metadata"]["sources_failed"].append("hunter")

        # 4. Calcular completeness score
        enrichment_result["enrichment_metadata"]["completeness_score"] = \
            self._calculate_completeness(enrichment_result)

        return enrichment_result

    async def _enrich_company(self, domain: str) -> Optional[Dict]:
        """
        Busca dados da empresa no Clearbit
        """
        if not self.clearbit_api_key or not domain:
            return None

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.clearbit_base_url}/companies/find",
                    params={"domain": domain},
                    headers={"Authorization": f"Bearer {self.clearbit_api_key}"}
                )

                if response.status_code == 200:
                    data = response.json()
                    return self._parse_clearbit_response(data)
                elif response.status_code == 404:
                    logger.info(f"Company not found in Clearbit: {domain}")
                    return None
                else:
                    logger.error(f"Clearbit API error: {response.status_code}")
                    return None

        except httpx.TimeoutException:
            logger.error(f"Clearbit API timeout for domain: {domain}")
            return None
        except Exception as e:
            logger.error(f"Clearbit enrichment failed: {str(e)}")
            return None

    def _parse_clearbit_response(self, data: Dict) -> Dict:
        """
        Parseia resposta do Clearbit para formato padronizado
        """
        return {
            "name": data.get("name"),
            "domain": data.get("domain"),
            "logo_url": data.get("logo"),
            "description": data.get("description"),
            "founded_year": data.get("foundedYear"),
            "location": data.get("location"),
            "timezone": data.get("timeZone"),

            # Métricas
            "employee_count": data.get("metrics", {}).get("employees"),
            "employee_range": data.get("metrics", {}).get("employeesRange"),
            "annual_revenue": data.get("metrics", {}).get("annualRevenue"),
            "raised": data.get("metrics", {}).get("raised"),
            "alexa_rank": data.get("metrics", {}).get("alexaGlobalRank"),

            # Categorização
            "sector": data.get("category", {}).get("sector"),
            "industry_group": data.get("category", {}).get("industryGroup"),
            "industry": data.get("category", {}).get("industry"),
            "sub_industry": data.get("category", {}).get("subIndustry"),

            # Tags e Tech Stack
            "tags": data.get("tags", []),
            "tech_stack": data.get("tech", []),

            # Social
            "linkedin_handle": data.get("linkedin", {}).get("handle"),
            "twitter_handle": data.get("twitter", {}).get("handle"),
            "twitter_followers": data.get("twitter", {}).get("followers"),

            # Metadata
            "clearbit_id": data.get("id")
        }

    async def _verify_email(self, email: str) -> Optional[Dict]:
        """
        Verifica validade do email usando Hunter.io
        """
        if not self.hunter_api_key or not email:
            return None

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.hunter_base_url}/email-verifier",
                    params={
                        "email": email,
                        "api_key": self.hunter_api_key
                    }
                )

                if response.status_code == 200:
                    data = response.json()
                    return self._parse_hunter_response(data)
                else:
                    logger.error(f"Hunter API error: {response.status_code}")
                    return None

        except Exception as e:
            logger.error(f"Email verification failed: {str(e)}")
            return None

    def _parse_hunter_response(self, data: Dict) -> Dict:
        """
        Parseia resposta do Hunter.io
        """
        email_data = data.get("data", {})

        return {
            "status": email_data.get("status"),  # valid, invalid, unknown
            "result": email_data.get("result"),  # deliverable, undeliverable, risky
            "score": email_data.get("score"),  # 0-100
            "is_disposable": email_data.get("disposable", False),
            "is_webmail": email_data.get("webmail", False),
            "is_gibberish": email_data.get("gibberish", False),
            "mx_records": email_data.get("mx_records", False),
            "smtp_check": email_data.get("smtp_check", False)
        }

    def _extract_domain_from_email(self, email: str) -> Optional[str]:
        """
        Extrai domínio do email
        """
        try:
            return email.split('@')[1].lower()
        except:
            return None

    def _calculate_completeness(self, enrichment_result: Dict) -> int:
        """
        Calcula score de completude (0-100)
        """
        score = 0

        # Company data (60 pontos)
        if enrichment_result.get("company_data"):
            company = enrichment_result["company_data"]
            if company.get("name"): score += 10
            if company.get("employee_count"): score += 15
            if company.get("industry"): score += 10
            if company.get("description"): score += 10
            if company.get("linkedin_handle"): score += 5
            if company.get("tech_stack"): score += 10

        # Email verification (40 pontos)
        if enrichment_result.get("email_verification"):
            email = enrichment_result["email_verification"]
            if email.get("status") == "valid": score += 20
            if email.get("score", 0) > 70: score += 10
            if not email.get("is_disposable"): score += 5
            if email.get("mx_records"): score += 5

        return min(100, score)
```

---

### 2. Celery Task

```python
# src/tasks/enrichment_tasks.py

from celery import Task
from src.services.enrichment_service import EnrichmentService
from src.database import db
from bson import ObjectId
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class EnrichLeadTask(Task):
    """
    Celery task para enriquecer lead
    """
    name = 'tasks.enrich_lead'
    max_retries = 3
    default_retry_delay = 60  # 1 minuto

    def run(self, lead_id: str):
        """
        Executa enrichment de um lead
        """
        try:
            # 1. Buscar lead
            lead = db.leads.find_one({"_id": ObjectId(lead_id)})
            if not lead:
                logger.error(f"Lead not found: {lead_id}")
                return

            # 2. Executar enrichment
            enrichment_service = EnrichmentService()

            # Rodar async code em sync context
            import asyncio
            enrichment_result = asyncio.run(
                enrichment_service.enrich_lead(
                    email=lead['email'],
                    company_domain=lead.get('company_domain')
                )
            )

            # 3. Salvar resultados
            db.leads.update_one(
                {"_id": ObjectId(lead_id)},
                {
                    "$set": {
                        "enriched_data": enrichment_result,
                        "enrichment_status": "completed",
                        "enriched_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow()
                    }
                }
            )

            logger.info(f"Lead {lead_id} enriched successfully. "
                       f"Completeness: {enrichment_result['enrichment_metadata']['completeness_score']}%")

            # 4. Trigger re-qualification (se lead já foi qualificado antes)
            if lead.get('qualification_score') is not None:
                from src.tasks.qualification_tasks import QualifyLeadTask
                QualifyLeadTask().delay(lead_id)

            return {
                "lead_id": lead_id,
                "status": "success",
                "completeness": enrichment_result['enrichment_metadata']['completeness_score']
            }

        except Exception as e:
            logger.error(f"Enrichment failed for lead {lead_id}: {str(e)}")

            # Marcar como failed
            db.leads.update_one(
                {"_id": ObjectId(lead_id)},
                {
                    "$set": {
                        "enrichment_status": "failed",
                        "enrichment_error": str(e),
                        "updated_at": datetime.utcnow()
                    }
                }
            )

            # Retry se não excedeu max_retries
            if self.request.retries < self.max_retries:
                raise self.retry(exc=e, countdown=self.default_retry_delay * (2 ** self.request.retries))

            return {
                "lead_id": lead_id,
                "status": "failed",
                "error": str(e)
            }
```

---

### 3. Trigger Automático

```python
# src/api/routes/leads.py

from src.tasks.enrichment_tasks import EnrichLeadTask

@router.post("/leads")
async def create_lead(lead_data: LeadCreate):
    """
    Cria lead e dispara enrichment automaticamente
    """
    # 1. Validar e criar lead
    lead = {
        "name": lead_data.name,
        "email": lead_data.email.lower(),
        "company": lead_data.company,
        "job_title": lead_data.job_title,
        "source": lead_data.source,
        "status": "new",

        # Enrichment tracking
        "enrichment_status": "pending",
        "enriched_at": None,
        "enriched_data": None,

        # Timestamps
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }

    result = await db.leads.insert_one(lead)
    lead_id = str(result.inserted_id)

    # 2. Trigger enrichment (async)
    EnrichLeadTask().delay(lead_id)

    # 3. Retornar lead criado (ainda sem enrichment)
    lead['id'] = lead_id
    del lead['_id']

    return {
        "lead": lead,
        "message": "Lead created successfully. Enrichment in progress."
    }

@router.post("/leads/{lead_id}/enrich")
async def enrich_lead_manually(lead_id: str):
    """
    Endpoint para re-enriquecer lead manualmente
    """
    # Verificar se lead existe
    lead = await db.leads.find_one({"_id": ObjectId(lead_id)})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Trigger enrichment
    task = EnrichLeadTask().delay(lead_id)

    return {
        "lead_id": lead_id,
        "task_id": task.id,
        "message": "Enrichment task started",
        "status_url": f"/tasks/{task.id}/status"
    }
```

---

## 🗄️ Schema Update

```python
# src/models/lead.py - Adicionar campos de enrichment

class Lead(BaseModel):
    # ... campos existentes ...

    # Enrichment fields
    enrichment_status: Optional[str] = "pending"  # pending, completed, failed
    enriched_at: Optional[datetime] = None
    enrichment_error: Optional[str] = None

    enriched_data: Optional[Dict] = None
    # enriched_data structure:
    # {
    #   "company_data": {...},
    #   "email_verification": {...},
    #   "social_profiles": {},
    #   "enrichment_metadata": {
    #     "enriched_at": "2025-11-05T...",
    #     "sources_used": ["clearbit", "hunter"],
    #     "sources_failed": [],
    #     "completeness_score": 85
    #   }
    # }
```

---

## ⚙️ Configuração

### Environment Variables

```bash
# .env

# Clearbit
CLEARBIT_API_KEY=sk_clearbit_...

# Hunter.io
HUNTER_API_KEY=hunter_io_key...

# Celery
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Rate Limits (requests per minute)
CLEARBIT_RATE_LIMIT=600
HUNTER_RATE_LIMIT=300
```

### Celery Worker

```python
# src/celery_app.py

from celery import Celery
import os

app = Celery(
    'conductor_crm',
    broker=os.getenv('CELERY_BROKER_URL'),
    backend=os.getenv('CELERY_RESULT_BACKEND')
)

app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='America/Sao_Paulo',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,  # 5 minutos max
    worker_prefetch_multiplier=4,
    worker_max_tasks_per_child=1000
)

# Auto-discover tasks
app.autodiscover_tasks(['src.tasks'])
```

**Rodar worker**:
```bash
celery -A src.celery_app worker --loglevel=info
```

---

## 🧪 Testes

### Unit Tests

```python
# tests/test_enrichment_service.py

import pytest
from src.services.enrichment_service import EnrichmentService

class TestEnrichmentService:

    @pytest.mark.asyncio
    async def test_enrich_company_success(self):
        """Testa enrichment de empresa (mock)"""
        service = EnrichmentService()

        # Mock Clearbit API
        with patch('httpx.AsyncClient.get') as mock_get:
            mock_get.return_value.status_code = 200
            mock_get.return_value.json.return_value = {
                "name": "Acme Corp",
                "domain": "acme.com",
                "metrics": {"employees": 100}
            }

            result = await service._enrich_company("acme.com")

            assert result['name'] == "Acme Corp"
            assert result['employee_count'] == 100

    @pytest.mark.asyncio
    async def test_verify_email_valid(self):
        """Testa verificação de email válido"""
        service = EnrichmentService()

        with patch('httpx.AsyncClient.get') as mock_get:
            mock_get.return_value.status_code = 200
            mock_get.return_value.json.return_value = {
                "data": {
                    "status": "valid",
                    "score": 95,
                    "disposable": False
                }
            }

            result = await service._verify_email("test@acme.com")

            assert result['status'] == "valid"
            assert result['score'] == 95
            assert not result['is_disposable']

    def test_calculate_completeness(self):
        """Testa cálculo de completeness score"""
        service = EnrichmentService()

        enrichment_result = {
            "company_data": {
                "name": "Acme",
                "employee_count": 100,
                "industry": "Tech",
                "description": "A company"
            },
            "email_verification": {
                "status": "valid",
                "score": 90,
                "is_disposable": False,
                "mx_records": True
            }
        }

        score = service._calculate_completeness(enrichment_result)

        assert score >= 70  # Boa completude
```

### Integration Tests

```python
# tests/integration/test_enrichment_pipeline.py

async def test_full_enrichment_pipeline():
    """
    Testa pipeline completo:
    1. Criar lead
    2. Trigger enrichment
    3. Aguardar conclusão
    4. Verificar dados enriquecidos
    """
    # 1. Criar lead
    response = await client.post("/api/v1/leads", json={
        "name": "Test Lead",
        "email": "test@acme.com",
        "source": "linkedin"
    })
    lead_id = response.json()['lead']['id']

    # 2. Aguardar enrichment (max 30s)
    import time
    for _ in range(30):
        time.sleep(1)
        response = await client.get(f"/api/v1/leads/{lead_id}")
        lead = response.json()

        if lead['enrichment_status'] == 'completed':
            break

    # 3. Verificar enriquecimento
    assert lead['enrichment_status'] == 'completed'
    assert lead['enriched_data'] is not None
    assert lead['enriched_data']['enrichment_metadata']['completeness_score'] > 0

    # 4. Verificar dados da empresa
    if lead['enriched_data']['company_data']:
        assert 'name' in lead['enriched_data']['company_data']
```

---

## ✅ Critérios de Aceitação

- [ ] Pipeline executa automaticamente ao criar lead
- [ ] Enrichment completa em <30 segundos (background)
- [ ] Dados do Clearbit são salvos corretamente
- [ ] Email verification funciona (Hunter.io)
- [ ] Completeness score é calculado (0-100)
- [ ] Retry logic funciona (3 tentativas)
- [ ] Lead pode ser re-enriquecido manualmente
- [ ] Enrichment não bloqueia criação do lead
- [ ] Logs estruturados para debugging
- [ ] Rate limiting é respeitado
- [ ] Erros são tratados gracefully
- [ ] Testes unitários passando
- [ ] Testes de integração passando

---

## 🔗 Dependências

### Dependências Técnicas
- ✅ Marco 009: Lead Model & API
- ✅ Marco 007: External APIs configured
- ⬜ Redis instalado e rodando
- ⬜ Celery configurado

### Bibliotecas Python
```
httpx>=0.24.0
celery>=5.3.0
redis>=4.5.0
```

---

## 🚨 Riscos e Mitigações

### Risco 1: APIs externas offline
**Mitigação**:
- Retry logic (3x com backoff)
- Fallback: salvar lead sem enrichment
- Status tracking: `enrichment_status = 'failed'`

### Risco 2: Rate limits excedidos
**Mitigação**:
- Celery rate limiting
- Queue com prioridade (Hot leads primeiro)
- Cache de respostas (mesma empresa)

### Risco 3: Custos de API altos
**Mitigação**:
- Monitorar uso (requests/dia)
- Limit no Free plan (10 enrichments/mês)
- Cache agressivo (7 dias)

### Risco 4: Dados desatualizados
**Mitigação**:
- Re-enrich automático (a cada 90 dias)
- Botão manual "Re-enrich"
- Timestamp `enriched_at`

---

## 📊 Métricas de Sucesso

### Performance
- Tempo médio de enrichment: <15s
- Taxa de sucesso: >85%
- Taxa de retry: <20%

### Qualidade
- Completeness score médio: >60%
- Dados da empresa encontrados: >70% dos leads
- Email verificado: >90% dos leads

### Negócio
- Economia de tempo: 15 min manual → 15s auto (60x)
- Accuracy de qualificação melhora: +15%
- Adoption: 100% (automático)

---

**Status**: 🔵 Pronto para Implementação
**Estimativa**: 3 dias
**Prioridade**: 🔥 Alta (Melhora qualificação drasticamente)
