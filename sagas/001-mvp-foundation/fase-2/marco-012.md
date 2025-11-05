# Marco 012: LeadQualifier_Agent v1
> Backend - Agente de qualificação automática de leads | 5 dias

**Responsável**: Tech Lead + Backend Dev
**Revisor**: Product Manager
**Status**: 🔵 Planejado

---

## 🎯 Objetivo

Implementar o primeiro agente de IA do CRM: LeadQualifier_Agent, que analisa leads automaticamente e atribui score (0-100), classificação (Hot/Warm/Cold) e sugere próximas ações.

---

## 📋 Contexto

Este é o **agente core** que demonstra o valor da IA no CRM. Ele deve ser:
- Rápido (<10 segundos por lead)
- Preciso (>70% accuracy vs qualificação manual)
- Explicável (mostrar reasoning)
- Integrado com Conductor framework

**Integração**: Conductor Core (submodule) + FastAPI + MongoDB

---

## 🤖 Especificações do Agente

### 1. Agent Definition (Conductor)

```python
# src/agents/lead_qualifier_agent.py

from conductor import Agent, Task, Workflow
from conductor.llms import ClaudeLLM
from typing import Dict, List, Optional
from pydantic import BaseModel

class LeadQualificationInput(BaseModel):
    """Input para o agente de qualificação"""
    lead_id: str
    name: str
    email: str
    company: Optional[str] = None
    job_title: Optional[str] = None
    phone: Optional[str] = None
    source: str
    source_details: Optional[str] = None

    # Dados enriquecidos (se disponíveis)
    enriched_data: Optional[Dict] = None

    # Contexto adicional
    website_url: Optional[str] = None
    linkedin_url: Optional[str] = None

class LeadQualificationOutput(BaseModel):
    """Output do agente de qualificação"""
    lead_id: str
    score: int  # 0-100
    classification: str  # 'hot', 'warm', 'cold'

    # Reasoning
    qualification_reasons: List[str]  # Lista de motivos
    positive_signals: List[str]
    negative_signals: List[str]
    missing_data: List[str]

    # Actions
    next_actions: List[Dict[str, str]]  # [{"action": "...", "priority": "high/medium/low"}]
    suggested_owner: Optional[str] = None

    # Metadata
    confidence_level: float  # 0.0-1.0
    processing_time_ms: int
    model_used: str

class LeadQualifierAgent:
    """
    Agente especializado em qualificação de leads

    Avalia leads baseado em:
    - Job title (decision maker?)
    - Company size e industry
    - Engagement signals
    - Source quality
    - Completeness dos dados
    """

    def __init__(self):
        self.llm = ClaudeLLM(
            model="claude-3-5-sonnet-20241022",
            temperature=0.1,  # Baixa para consistência
            max_tokens=2000
        )

        self.agent = Agent(
            name="LeadQualifier",
            role="Lead Qualification Specialist",
            goal="Qualify leads accurately and suggest best next actions",
            backstory="""You are an expert sales development representative with 10 years
            of experience qualifying B2B leads. You understand buyer personas, decision-making
            units, and buying signals. You provide clear, actionable recommendations.""",
            llm=self.llm
        )

    def qualify(self, lead_input: LeadQualificationInput) -> LeadQualificationOutput:
        """
        Qualifica um lead usando IA
        """
        import time
        start_time = time.time()

        # 1. Preparar contexto
        context = self._build_context(lead_input)

        # 2. Criar prompt estruturado
        prompt = self._build_qualification_prompt(context)

        # 3. Executar agente
        task = Task(
            description=prompt,
            expected_output="JSON with qualification results",
            agent=self.agent
        )

        workflow = Workflow(
            tasks=[task],
            verbose=False
        )

        result = workflow.run()

        # 4. Parse resultado
        qualification = self._parse_result(result, lead_input.lead_id)

        # 5. Adicionar metadata
        qualification.processing_time_ms = int((time.time() - start_time) * 1000)
        qualification.model_used = self.llm.model

        return qualification

    def _build_context(self, lead_input: LeadQualificationInput) -> Dict:
        """
        Constrói contexto rico para o agente
        """
        context = {
            "basic_info": {
                "name": lead_input.name,
                "email": lead_input.email,
                "company": lead_input.company or "Unknown",
                "job_title": lead_input.job_title or "Unknown",
                "phone": lead_input.phone or "Not provided",
                "source": lead_input.source,
                "source_details": lead_input.source_details or "None"
            },
            "enriched_data": lead_input.enriched_data or {},
            "urls": {
                "website": lead_input.website_url,
                "linkedin": lead_input.linkedin_url
            }
        }

        return context

    def _build_qualification_prompt(self, context: Dict) -> str:
        """
        Constrói prompt estruturado para qualificação
        """
        prompt = f"""
# Lead Qualification Task

## Lead Information
Name: {context['basic_info']['name']}
Email: {context['basic_info']['email']}
Company: {context['basic_info']['company']}
Job Title: {context['basic_info']['job_title']}
Phone: {context['basic_info']['phone']}
Source: {context['basic_info']['source']}
Source Details: {context['basic_info']['source_details']}

## Enriched Data
{self._format_enriched_data(context['enriched_data'])}

## Your Task
Analyze this lead and provide a comprehensive qualification assessment.

**Scoring Criteria (0-100):**
- Job Title (0-30 points): Is this a decision maker? (CEO, CTO, VP, Director = high)
- Company Fit (0-25 points): Company size, industry, location match ICP?
- Engagement (0-20 points): Source quality, provided details, completeness
- Data Quality (0-15 points): How complete is the information?
- Buying Signals (0-10 points): Any urgency or pain points indicated?

**Classification:**
- Hot (80-100): High-value, likely to convert, immediate action needed
- Warm (50-79): Qualified but needs nurturing
- Cold (0-49): Low priority or unqualified

**Output Format (JSON):**
{{
  "score": <0-100>,
  "classification": "<hot|warm|cold>",
  "qualification_reasons": ["reason 1", "reason 2", ...],
  "positive_signals": ["signal 1", "signal 2", ...],
  "negative_signals": ["signal 1", "signal 2", ...],
  "missing_data": ["data 1", "data 2", ...],
  "next_actions": [
    {{"action": "Action description", "priority": "high"}},
    {{"action": "Action description", "priority": "medium"}},
    ...
  ],
  "suggested_owner": "<senior|junior|none>",
  "confidence_level": <0.0-1.0>
}}

Provide your analysis:
"""
        return prompt

    def _format_enriched_data(self, enriched: Dict) -> str:
        """Formata dados enriquecidos para o prompt"""
        if not enriched:
            return "No enriched data available"

        formatted = []
        for key, value in enriched.items():
            formatted.append(f"- {key}: {value}")

        return "\n".join(formatted)

    def _parse_result(self, result: str, lead_id: str) -> LeadQualificationOutput:
        """
        Parse resultado do LLM para estrutura tipada
        """
        import json
        import re

        # Extrair JSON do resultado
        json_match = re.search(r'\{.*\}', result, re.DOTALL)
        if not json_match:
            # Fallback: qualificação neutra
            return self._default_qualification(lead_id)

        try:
            data = json.loads(json_match.group())

            return LeadQualificationOutput(
                lead_id=lead_id,
                score=max(0, min(100, data.get('score', 50))),
                classification=data.get('classification', 'warm').lower(),
                qualification_reasons=data.get('qualification_reasons', []),
                positive_signals=data.get('positive_signals', []),
                negative_signals=data.get('negative_signals', []),
                missing_data=data.get('missing_data', []),
                next_actions=data.get('next_actions', []),
                suggested_owner=data.get('suggested_owner'),
                confidence_level=data.get('confidence_level', 0.5),
                processing_time_ms=0,  # Will be set later
                model_used=""  # Will be set later
            )
        except Exception as e:
            print(f"Error parsing LLM result: {e}")
            return self._default_qualification(lead_id)

    def _default_qualification(self, lead_id: str) -> LeadQualificationOutput:
        """
        Qualificação padrão em caso de erro
        """
        return LeadQualificationOutput(
            lead_id=lead_id,
            score=50,
            classification='warm',
            qualification_reasons=["Automatic fallback qualification"],
            positive_signals=[],
            negative_signals=["Could not process with AI"],
            missing_data=[],
            next_actions=[
                {"action": "Manual review required", "priority": "high"}
            ],
            confidence_level=0.0,
            processing_time_ms=0,
            model_used="fallback"
        )
```

---

## 🔌 API Endpoint

```python
# src/api/routes/leads.py

from fastapi import APIRouter, HTTPException, BackgroundTasks
from src.agents.lead_qualifier_agent import LeadQualifierAgent, LeadQualificationInput
from src.models.lead import Lead
from src.database import db

router = APIRouter()

@router.post("/leads/{lead_id}/qualify")
async def qualify_lead(
    lead_id: str,
    background_tasks: BackgroundTasks
):
    """
    Qualifica um lead usando IA

    Pode ser executado:
    - Sincronamente (retorna resultado imediato)
    - Assincronamente (retorna task_id, processa em background)
    """
    # 1. Buscar lead
    lead = await db.leads.find_one({"_id": ObjectId(lead_id)})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # 2. Preparar input
    qualification_input = LeadQualificationInput(
        lead_id=lead_id,
        name=lead['name'],
        email=lead['email'],
        company=lead.get('company'),
        job_title=lead.get('job_title'),
        phone=lead.get('phone'),
        source=lead['source'],
        source_details=lead.get('source_details'),
        enriched_data=lead.get('enriched_data'),
        website_url=lead.get('website_url'),
        linkedin_url=lead.get('linkedin_url')
    )

    # 3. Executar qualificação (síncrono para MVP)
    agent = LeadQualifierAgent()
    result = agent.qualify(qualification_input)

    # 4. Atualizar lead no banco
    await db.leads.update_one(
        {"_id": ObjectId(lead_id)},
        {
            "$set": {
                "qualification_score": result.score,
                "classification": result.classification,
                "qualification_reasons": result.qualification_reasons,
                "positive_signals": result.positive_signals,
                "negative_signals": result.negative_signals,
                "missing_data": result.missing_data,
                "next_actions": result.next_actions,
                "qualification_metadata": {
                    "confidence_level": result.confidence_level,
                    "processing_time_ms": result.processing_time_ms,
                    "model_used": result.model_used,
                    "qualified_at": datetime.utcnow()
                },
                "updated_at": datetime.utcnow()
            }
        }
    )

    return {
        "lead_id": lead_id,
        "qualification": result.dict(),
        "message": "Lead qualified successfully"
    }

@router.post("/leads/{lead_id}/requalify")
async def requalify_lead(lead_id: str):
    """
    Re-qualifica um lead (quando dados mudam)
    """
    return await qualify_lead(lead_id)
```

---

## 🎨 Critérios de Scoring

### Job Title Scoring (0-30 pontos)

| Job Title | Pontos | Motivo |
|-----------|--------|--------|
| CEO, Founder, President | 30 | Decision maker final |
| CTO, VP, Director | 25 | Decision maker departamental |
| Manager, Coordinator | 15 | Influenciador |
| Analyst, Specialist | 5 | Usuário final |
| Unknown | 0 | Sem informação |

### Company Fit Scoring (0-25 pontos)

| Critério | Pontos | Condição |
|----------|--------|----------|
| Company size | 10 | 10-200 funcionários (ICP) |
| Industry | 10 | Tech, SaaS, Services B2B |
| Location | 5 | Brasil |

### Engagement Scoring (0-20 pontos)

| Critério | Pontos | Condição |
|----------|--------|----------|
| Source quality | 10 | Referral, LinkedIn > Form > Import |
| Data completeness | 5 | >60% campos preenchidos |
| Source details provided | 5 | Contexto adicional fornecido |

### Data Quality (0-15 pontos)

| Critério | Pontos | Condição |
|----------|--------|----------|
| Email valid | 5 | Format + domain válidos |
| Phone provided | 3 | Telefone presente |
| Company info | 4 | Company name + URL |
| Enriched data | 3 | Clearbit data disponível |

### Buying Signals (0-10 pontos)

| Critério | Pontos | Condição |
|----------|--------|----------|
| Urgency indicators | 5 | Keywords: "urgent", "ASAP", "now" |
| Pain points mentioned | 5 | Problema explícito |

---

## 🎯 Classification Logic

```python
def classify_lead(score: int) -> str:
    """
    Hot: 80-100 (Top 20%)
    Warm: 50-79 (Middle 50%)
    Cold: 0-49 (Bottom 30%)
    """
    if score >= 80:
        return 'hot'
    elif score >= 50:
        return 'warm'
    else:
        return 'cold'
```

---

## 📝 Next Actions Suggestions

### Hot Leads (80-100)
```json
[
  {"action": "Call within 1 hour", "priority": "high"},
  {"action": "Send personalized email", "priority": "high"},
  {"action": "Add to priority sequence", "priority": "high"},
  {"action": "Assign to senior SDR", "priority": "medium"}
]
```

### Warm Leads (50-79)
```json
[
  {"action": "Send nurture email sequence", "priority": "medium"},
  {"action": "Connect on LinkedIn", "priority": "medium"},
  {"action": "Schedule follow-up in 3 days", "priority": "low"}
]
```

### Cold Leads (0-49)
```json
[
  {"action": "Add to long-term nurture", "priority": "low"},
  {"action": "Request more information", "priority": "low"},
  {"action": "Verify contact details", "priority": "low"}
]
```

---

## 🧪 Testes e Validação

### Unit Tests

```python
# tests/test_lead_qualifier_agent.py

import pytest
from src.agents.lead_qualifier_agent import LeadQualifierAgent, LeadQualificationInput

class TestLeadQualifierAgent:

    def test_qualify_hot_lead(self):
        """Testa qualificação de lead Hot"""
        agent = LeadQualifierAgent()

        input_data = LeadQualificationInput(
            lead_id="123",
            name="João Silva",
            email="joao.silva@empresa.com.br",
            company="Tech Corp",
            job_title="CEO",
            phone="+55 11 99999-9999",
            source="linkedin",
            enriched_data={
                "company_size": 50,
                "company_industry": "Technology"
            }
        )

        result = agent.qualify(input_data)

        assert result.score >= 70
        assert result.classification in ['hot', 'warm']
        assert len(result.qualification_reasons) > 0
        assert result.confidence_level > 0.5

    def test_qualify_cold_lead(self):
        """Testa qualificação de lead Cold"""
        agent = LeadQualifierAgent()

        input_data = LeadQualificationInput(
            lead_id="124",
            name="Maria Santos",
            email="maria@email.com",
            source="import"
        )

        result = agent.qualify(input_data)

        assert result.score < 50
        assert result.classification == 'cold'
        assert len(result.missing_data) > 0

    def test_processing_time(self):
        """Testa tempo de processamento (<10s)"""
        agent = LeadQualifierAgent()

        input_data = LeadQualificationInput(
            lead_id="125",
            name="Test User",
            email="test@test.com",
            source="website_form"
        )

        result = agent.qualify(input_data)

        assert result.processing_time_ms < 10000  # 10 segundos
```

### Integration Tests

```python
# tests/integration/test_lead_qualification_flow.py

async def test_full_qualification_flow():
    """
    Testa fluxo completo:
    1. Criar lead
    2. Qualificar automaticamente
    3. Verificar resultado salvo
    """
    # 1. Criar lead
    response = await client.post("/api/v1/leads", json={
        "name": "Test Lead",
        "email": "test@company.com",
        "company": "Test Company",
        "job_title": "CTO",
        "source": "linkedin"
    })
    lead_id = response.json()['id']

    # 2. Qualificar
    response = await client.post(f"/api/v1/leads/{lead_id}/qualify")
    assert response.status_code == 200

    qualification = response.json()['qualification']
    assert qualification['score'] > 0
    assert qualification['classification'] in ['hot', 'warm', 'cold']

    # 3. Verificar lead foi atualizado
    response = await client.get(f"/api/v1/leads/{lead_id}")
    lead = response.json()

    assert lead['qualification_score'] == qualification['score']
    assert lead['classification'] == qualification['classification']
```

---

## ✅ Critérios de Aceitação

- [ ] Agente qualifica lead em <10 segundos
- [ ] Score sempre entre 0-100
- [ ] Classification sempre 'hot', 'warm' ou 'cold'
- [ ] Retorna ao menos 3 qualification_reasons
- [ ] Retorna ao menos 3 next_actions sugeridas
- [ ] Accuracy >70% vs qualificação manual (baseline de 10 leads)
- [ ] Fallback funciona se LLM falhar
- [ ] API endpoint `/leads/:id/qualify` funcional
- [ ] Resultado salvo no MongoDB
- [ ] Logs estruturados para debugging
- [ ] Testes unitários passando
- [ ] Testes de integração passando

---

## 🔗 Dependências

### Dependências Técnicas
- ✅ Marco 009: Lead Model & API (precisa do schema)
- ✅ Marco 005: Database & Backend Setup (MongoDB)
- ✅ Marco 004: Conductor Core inicializado
- ✅ Marco 007: OpenAI/Anthropic API keys configuradas

### Dependências Conceituais
- Documentação REQUISITOS_CRM_AI_FIRST.md (LeadQualifier_Agent spec)
- ICP definido (para scoring de Company Fit)

---

## 🚨 Riscos e Mitigações

### Risco 1: LLM muito lento (>10s)
**Mitigação**:
- Usar Claude Haiku (mais rápido) em vez de Sonnet
- Reduzir max_tokens
- Cache de prompts similares

### Risco 2: Resultados inconsistentes
**Mitigação**:
- Temperature = 0.1 (baixa variabilidade)
- Prompt bem estruturado
- Fallback para regras se JSON inválido

### Risco 3: Custos de API alto
**Mitigação**:
- Monitorar uso (tokens/lead)
- Limite de qualificações/dia no Free plan
- Otimizar prompt (menos tokens)

### Risco 4: Accuracy baixa (<70%)
**Mitigação**:
- Iterar no prompt com exemplos reais
- Few-shot learning (adicionar exemplos ao prompt)
- Coletar feedback e melhorar

---

## 📊 Métricas de Sucesso

### Performance
- Tempo médio de qualificação: <5s
- 95th percentile: <10s
- Taxa de erro: <5%

### Qualidade
- Accuracy vs manual: >70%
- Inter-rater reliability: >0.7 (Cohen's Kappa)
- User satisfaction: NPS >50

### Negócio
- Economia de tempo: 10 min → 10s (60x faster)
- Adoption rate: >80% dos leads qualificados por IA
- Override rate: <20% (usuários concordam com IA)

---

## 📝 Notas de Implementação

### Integração com Conductor

O agente usa o framework Conductor (submodule) que fornece:
- Agent abstraction
- Task execution
- LLM providers (Claude, GPT-4)
- Workflow orchestration

**Configuração Conductor**:
```python
# .env
CONDUCTOR_LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
```

### Prompt Engineering

O prompt é **crucial** para qualidade. Elementos importantes:
1. **Role definition**: "Expert SDR with 10 years experience"
2. **Structured output**: JSON schema claro
3. **Scoring rubric**: Critérios explícitos
4. **Examples** (futuro): Few-shot para melhorar accuracy

### Async Processing (Fase Futura)

MVP: Processamento síncrono (10s response time OK)

**Futuro** (>1000 leads/dia):
- Celery task queue
- Webhook quando completo
- UI mostra "Processing..." state

---

**Status**: 🔵 Pronto para Implementação
**Estimativa**: 5 dias
**Prioridade**: 🔥 Alta (Core diferencial do produto)
