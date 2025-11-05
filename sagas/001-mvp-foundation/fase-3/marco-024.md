# Marco 024: EmailAssistant_Agent v1
> Backend - Agente de IA para geração de emails personalizados | 5 dias

**Responsável**: Tech Lead
**Revisor**: Product Manager
**Status**: 🔵 Planejado

---

## 🎯 Objetivo

Implementar agente de IA especializado em gerar emails personalizados automaticamente, criando 3 variações com diferentes tons e sugerindo subject lines otimizados.

---

## 📋 Contexto

Vendedores gastam **muito tempo** escrevendo emails. O EmailAssistant deve:
- Gerar emails personalizados baseados em contexto (lead/deal/contact)
- Criar 3 variações (formal, casual, direto)
- Sugerir subject lines com alto open rate
- Adaptar tom e estilo
- Economizar 80% do tempo de composição

**Target**: <10 segundos para gerar 3 variações completas

---

## 🤖 Agent Implementation

### 1. EmailAssistant Agent Class

```python
# src/agents/email_assistant_agent.py

from conductor import Agent, Task, Workflow
from conductor.llms import ClaudeLLM
from typing import Dict, List, Optional
from pydantic import BaseModel
from datetime import datetime

class EmailContext(BaseModel):
    """Contexto para geração de email"""
    # Entity info
    entity_type: str  # 'lead', 'deal', 'contact'
    entity_id: str

    # Recipient
    recipient_name: str
    recipient_email: str
    recipient_company: Optional[str] = None
    recipient_job_title: Optional[str] = None

    # Sender
    sender_name: str
    sender_company: str
    sender_role: str

    # Context
    previous_interactions: List[Dict] = []  # Últimas 3-5 interações
    deal_context: Optional[Dict] = None  # Se for sobre deal
    purpose: str  # 'introduction', 'follow_up', 'proposal', 'meeting_request'

    # Customization
    tone: str = 'professional'  # 'professional', 'casual', 'direct'
    language: str = 'pt-BR'
    max_words: int = 150

class EmailVariation(BaseModel):
    """Uma variação de email gerada"""
    subject: str
    body: str
    tone: str
    reasoning: str  # Por que essa abordagem

class EmailGenerationOutput(BaseModel):
    """Output do agente"""
    variations: List[EmailVariation]
    context_used: Dict
    generation_time_ms: int
    model_used: str

class EmailAssistantAgent:
    """
    Agente especializado em geração de emails de vendas

    Capabilities:
    - Gera 3 variações de email (formal, casual, direto)
    - Personaliza baseado em contexto do deal/lead
    - Sugere subject lines otimizados
    - Adapta tom e estilo
    - Inclui calls-to-action efetivos
    """

    def __init__(self):
        self.llm = ClaudeLLM(
            model="claude-3-5-sonnet-20241022",
            temperature=0.7,  # Criatividade moderada
            max_tokens=2000
        )

        self.agent = Agent(
            name="EmailAssistant",
            role="Senior Sales Development Representative",
            goal="Write personalized, effective sales emails that get responses",
            backstory="""You are a top-performing SDR with 10 years of experience.
            You know how to write emails that:
            - Get opened (compelling subject lines)
            - Get read (concise, valuable content)
            - Get responses (clear CTAs, personalization)

            You adapt your style based on the recipient and context.
            You're data-driven and always A/B test your approaches.""",
            llm=self.llm
        )

    async def generate_email(self, context: EmailContext) -> EmailGenerationOutput:
        """
        Gera email com 3 variações
        """
        import time
        start_time = time.time()

        # 1. Enriquecer contexto
        enriched_context = await self._enrich_context(context)

        # 2. Criar prompt estruturado
        prompt = self._build_prompt(enriched_context)

        # 3. Executar agente
        task = Task(
            description=prompt,
            expected_output="JSON with 3 email variations",
            agent=self.agent
        )

        workflow = Workflow(tasks=[task], verbose=False)
        result = workflow.run()

        # 4. Parse resultado
        output = self._parse_result(result, context)

        # 5. Metadata
        output.generation_time_ms = int((time.time() - start_time) * 1000)
        output.model_used = self.llm.model

        return output

    async def _enrich_context(self, context: EmailContext) -> Dict:
        """
        Enriquece contexto com dados adicionais do banco
        """
        from src.database import db
        from bson import ObjectId

        enriched = {
            "recipient": {
                "name": context.recipient_name,
                "email": context.recipient_email,
                "company": context.recipient_company,
                "job_title": context.recipient_job_title
            },
            "sender": {
                "name": context.sender_name,
                "company": context.sender_company,
                "role": context.sender_role
            },
            "purpose": context.purpose,
            "tone": context.tone,
            "language": context.language
        }

        # Buscar entidade
        if context.entity_type == 'lead':
            entity = await db.leads.find_one({"_id": ObjectId(context.entity_id)})
            if entity:
                enriched["lead_info"] = {
                    "status": entity.get("status"),
                    "source": entity.get("source"),
                    "qualification_score": entity.get("qualification_score"),
                    "classification": entity.get("classification")
                }

        elif context.entity_type == 'deal':
            entity = await db.deals.find_one({"_id": ObjectId(context.entity_id)})
            if entity:
                enriched["deal_info"] = {
                    "title": entity.get("title"),
                    "value": entity.get("value"),
                    "stage": entity.get("stage"),
                    "probability": entity.get("probability")
                }

        # Adicionar interações anteriores
        if context.previous_interactions:
            enriched["previous_interactions"] = context.previous_interactions[:3]

        return enriched

    def _build_prompt(self, context: Dict) -> str:
        """
        Constrói prompt estruturado para geração de emails
        """
        prompt = f"""
# Email Generation Task

## Context
You need to write a sales email from {context['sender']['name']} ({context['sender']['role']} at {context['sender']['company']})
to {context['recipient']['name']} ({context['recipient'].get('job_title', 'Contact')} at {context['recipient'].get('company', 'their company')}).

**Purpose**: {context['purpose']}
**Language**: {context['language']}
**Desired Tone**: {context['tone']}

## Additional Context
{self._format_additional_context(context)}

## Previous Interactions
{self._format_previous_interactions(context.get('previous_interactions', []))}

## Your Task
Generate **3 variations** of a sales email with different approaches:

1. **Variation 1 - Professional/Formal**
   - Formal business tone
   - Structured, clear
   - Professional language

2. **Variation 2 - Casual/Friendly**
   - Conversational tone
   - Warm, approachable
   - Less formal but still respectful

3. **Variation 3 - Direct/Concise**
   - Very short and direct
   - Bullet points
   - Focus on immediate value

## Email Guidelines
- **Subject Line**: Compelling, personalized, <60 chars
- **Opening**: Personalized (reference company, role, or recent activity)
- **Body**:
  - Maximum 150 words
  - Focus on recipient's pain points/goals
  - Provide clear value proposition
  - Include social proof if relevant
- **CTA**: Clear, single action (meeting, call, demo)
- **Closing**: Professional signature

## Output Format (JSON)
```json
{{
  "variations": [
    {{
      "tone": "professional",
      "subject": "Subject line here",
      "body": "Email body here...",
      "reasoning": "Why this approach works for this recipient"
    }},
    {{
      "tone": "casual",
      "subject": "Subject line here",
      "body": "Email body here...",
      "reasoning": "Why this approach works for this recipient"
    }},
    {{
      "tone": "direct",
      "subject": "Subject line here",
      "body": "Email body here...",
      "reasoning": "Why this approach works for this recipient"
    }}
  ]
}}
```

Generate the emails now:
"""
        return prompt

    def _format_additional_context(self, context: Dict) -> str:
        """Formata contexto adicional para o prompt"""
        formatted = []

        if "lead_info" in context:
            lead = context["lead_info"]
            formatted.append(f"- Lead Status: {lead.get('status')}")
            formatted.append(f"- Lead Score: {lead.get('qualification_score')}/100")
            formatted.append(f"- Classification: {lead.get('classification')}")

        if "deal_info" in context:
            deal = context["deal_info"]
            formatted.append(f"- Deal: {deal.get('title')}")
            formatted.append(f"- Value: R$ {deal.get('value', 0) / 100:,.2f}")
            formatted.append(f"- Stage: {deal.get('stage')}")
            formatted.append(f"- Probability: {deal.get('probability')}%")

        return "\n".join(formatted) if formatted else "No additional context available"

    def _format_previous_interactions(self, interactions: List[Dict]) -> str:
        """Formata interações anteriores"""
        if not interactions:
            return "No previous interactions"

        formatted = []
        for i, interaction in enumerate(interactions, 1):
            formatted.append(f"{i}. {interaction.get('type')}: {interaction.get('summary', 'N/A')}")

        return "\n".join(formatted)

    def _parse_result(self, result: str, context: EmailContext) -> EmailGenerationOutput:
        """Parse resultado do LLM para estrutura tipada"""
        import json
        import re

        # Extrair JSON do resultado
        json_match = re.search(r'\{.*\}', result, re.DOTALL)
        if not json_match:
            return self._default_emails(context)

        try:
            data = json.loads(json_match.group())

            variations = []
            for var in data.get('variations', []):
                variations.append(EmailVariation(
                    subject=var.get('subject', '(No subject)'),
                    body=var.get('body', ''),
                    tone=var.get('tone', 'professional'),
                    reasoning=var.get('reasoning', '')
                ))

            return EmailGenerationOutput(
                variations=variations,
                context_used=context.dict(),
                generation_time_ms=0,  # Will be set later
                model_used=""  # Will be set later
            )

        except Exception as e:
            print(f"Error parsing email result: {e}")
            return self._default_emails(context)

    def _default_emails(self, context: EmailContext) -> EmailGenerationOutput:
        """Emails padrão em caso de erro"""
        default_subject = f"Quick question about {context.recipient_company or 'your business'}"
        default_body = f"""Hi {context.recipient_name},

I hope this email finds you well.

I'm reaching out because I noticed [specific detail about their company].
At {context.sender_company}, we help companies like yours [value proposition].

Would you be open to a brief 15-minute call this week to explore if this could be valuable for {context.recipient_company or 'your team'}?

Best regards,
{context.sender_name}
{context.sender_role}
{context.sender_company}"""

        return EmailGenerationOutput(
            variations=[
                EmailVariation(
                    subject=default_subject,
                    body=default_body,
                    tone="professional",
                    reasoning="Default fallback email"
                )
            ],
            context_used=context.dict(),
            generation_time_ms=0,
            model_used="fallback"
        )
```

---

## 🔌 API Endpoint

```python
# src/api/routes/ai/email.py

from fastapi import APIRouter, HTTPException, Depends
from src.agents.email_assistant_agent import EmailAssistantAgent, EmailContext
from typing import Optional

router = APIRouter()

@router.post("/ai/email/generate")
async def generate_email(
    # Required fields
    entity_type: str,
    entity_id: str,
    recipient_email: str,
    purpose: str,

    # Optional fields
    recipient_name: Optional[str] = None,
    recipient_company: Optional[str] = None,
    recipient_job_title: Optional[str] = None,
    tone: str = 'professional',
    language: str = 'pt-BR',

    current_user: str = Depends(get_current_user)
):
    """
    Gera email com assistência de IA

    Purpose options:
    - introduction: Primeiro contato
    - follow_up: Seguimento de conversa anterior
    - proposal: Enviar proposta
    - meeting_request: Solicitar reunião
    - check_in: Check-in de relacionamento
    """
    # Get user info
    user = await db.users.find_one({"_id": ObjectId(current_user)})

    # Build context
    context = EmailContext(
        entity_type=entity_type,
        entity_id=entity_id,
        recipient_name=recipient_name or recipient_email.split('@')[0],
        recipient_email=recipient_email,
        recipient_company=recipient_company,
        recipient_job_title=recipient_job_title,
        sender_name=user.get('name', 'Your Name'),
        sender_company=user.get('company', 'Your Company'),
        sender_role=user.get('role', 'Sales'),
        purpose=purpose,
        tone=tone,
        language=language
    )

    # Generate email
    agent = EmailAssistantAgent()
    result = await agent.generate_email(context)

    return {
        "variations": [v.dict() for v in result.variations],
        "generation_time_ms": result.generation_time_ms,
        "model_used": result.model_used
    }

@router.post("/ai/email/improve")
async def improve_email(
    draft: str,
    instructions: str = "Make it more compelling and concise",
    current_user: str = Depends(get_current_user)
):
    """
    Melhora um rascunho de email existente
    """
    agent = EmailAssistantAgent()

    # Usar LLM diretamente para improvement
    prompt = f"""
Improve the following email draft based on these instructions: {instructions}

ORIGINAL DRAFT:
{draft}

IMPROVED VERSION:
"""

    improved = agent.llm.generate(prompt)

    return {
        "improved_email": improved,
        "original_length": len(draft.split()),
        "improved_length": len(improved.split())
    }
```

---

## 🧪 Testing & Validation

### Unit Tests

```python
# tests/test_email_assistant_agent.py

import pytest
from src.agents.email_assistant_agent import EmailAssistantAgent, EmailContext

class TestEmailAssistantAgent:

    @pytest.mark.asyncio
    async def test_generate_email_introduction(self):
        """Testa geração de email de introdução"""
        agent = EmailAssistantAgent()

        context = EmailContext(
            entity_type="lead",
            entity_id="123",
            recipient_name="John Doe",
            recipient_email="john@acme.com",
            recipient_company="Acme Corp",
            recipient_job_title="CTO",
            sender_name="Jane Smith",
            sender_company="CRM Inc",
            sender_role="SDR",
            purpose="introduction"
        )

        result = await agent.generate_email(context)

        # Assertions
        assert len(result.variations) == 3
        assert all(v.subject for v in result.variations)
        assert all(v.body for v in result.variations)
        assert all(len(v.body.split()) <= 200 for v in result.variations)  # Reasonable length
        assert result.generation_time_ms > 0

    @pytest.mark.asyncio
    async def test_different_tones(self):
        """Testa que variações têm tons diferentes"""
        agent = EmailAssistantAgent()

        context = EmailContext(
            entity_type="deal",
            entity_id="456",
            recipient_name="Bob Wilson",
            recipient_email="bob@startup.io",
            sender_name="Alice Johnson",
            sender_company="SalesTech",
            sender_role="Account Executive",
            purpose="follow_up"
        )

        result = await agent.generate_email(context)

        tones = [v.tone for v in result.variations]
        assert 'professional' in tones or 'formal' in tones
        assert 'casual' in tones or 'friendly' in tones
        assert 'direct' in tones or 'concise' in tones

    def test_subject_line_length(self):
        """Testa que subject lines são curtos (<80 chars)"""
        # Test implementation
        pass
```

---

## ✅ Critérios de Aceitação

- [ ] Agente gera 3 variações de email
- [ ] Variações têm tons distintos (formal, casual, direto)
- [ ] Subject lines são compelling (<60 chars)
- [ ] Emails são personalizados (mencionam nome, empresa)
- [ ] Geração completa em <10 segundos
- [ ] Body tem 80-150 palavras
- [ ] Inclui CTA claro
- [ ] Suporta pt-BR e en-US
- [ ] API endpoint funciona
- [ ] Fallback funciona se LLM falhar
- [ ] Testes unitários passando

---

## 🔗 Dependências

- ✅ Marco 004: Conductor Core integrado
- ✅ Marco 009, 017, 020: Lead, Deal, Contact models
- ✅ Marco 007: Anthropic API configurado

---

## 🚨 Riscos e Mitigações

### Risco 1: LLM muito lento (>10s)
**Mitigação**:
- Streaming responses (mostrar texto sendo gerado)
- Usar Claude Haiku para geração mais rápida
- Cache de emails similares

### Risco 2: Emails genéricos (não personalizados)
**Mitigação**:
- Enriquecer contexto com mais dados
- Few-shot examples no prompt
- User feedback loop

### Risco 3: Hallucinations (informações incorretas)
**Mitigação**:
- User sempre revisa antes de enviar
- Disclaimer "AI-generated, please review"
- Validação de fatos mencionados

---

**Status**: 🔵 Pronto para Implementação
**Estimativa**: 5 dias
**Prioridade**: 🔥🔥 Muito Alta (Core AI feature)
