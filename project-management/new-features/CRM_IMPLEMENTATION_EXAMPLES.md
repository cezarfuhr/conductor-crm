# 🚀 CRM AI-First: Exemplos Práticos de Implementação

> Exemplos concretos de código mostrando como construir um CRM usando o Conductor como core

---

## 📋 Índice
1. [Agentes de IA do CRM](#agentes-de-ia)
2. [Backend API](#backend-api)
3. [Frontend Components](#frontend-components)
4. [Integração com Conductor](#integração-conductor)
5. [Workflows Automatizados](#workflows)

---

## 🤖 Agentes de IA do CRM

### 1. LeadQualifier_Agent

```python
# conductor-crm/backend/src/agents/lead_qualifier.py

from conductor.ai_core import Agent, Tool
from typing import Dict, Any
import json

class LeadQualifierAgent(Agent):
    """
    Agente que analisa e qualifica leads automaticamente usando IA
    """

    agent_id = "LeadQualifier_Agent"
    description = "Qualifica leads baseado em dados da empresa, histórico e comportamento"

    tools = [
        Tool("search_company_info", "Busca informações sobre a empresa do lead"),
        Tool("analyze_behavior", "Analisa comportamento no site/emails"),
        Tool("calculate_fit_score", "Calcula score de fit (0-100)"),
    ]

    prompt = """
    Você é um especialista em qualificação de leads B2B.

    Analise o lead fornecido e retorne:
    1. Score de qualificação (0-100)
    2. Classificação (Hot/Warm/Cold)
    3. Motivos da classificação
    4. Próximas ações recomendadas
    5. Previsão de tempo até conversão

    Considere:
    - Tamanho da empresa
    - Setor de atuação
    - Cargo do contato
    - Comportamento (páginas visitadas, downloads)
    - Engajamento com emails

    Lead Data:
    {lead_data}

    Retorne em formato JSON estruturado.
    """

    def execute(self, lead_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executa a qualificação do lead
        """
        # Enriquece dados usando ferramentas
        company_info = self.use_tool("search_company_info", {
            "company_name": lead_data.get("company"),
            "website": lead_data.get("website")
        })

        behavior_data = self.use_tool("analyze_behavior", {
            "lead_id": lead_data.get("id"),
            "email": lead_data.get("email")
        })

        # Monta contexto completo
        full_context = {
            **lead_data,
            "company_info": company_info,
            "behavior": behavior_data
        }

        # Chama o LLM com o prompt
        response = self.llm.generate(
            self.prompt.format(lead_data=json.dumps(full_context, indent=2))
        )

        # Parseia resposta
        result = json.loads(response)

        return {
            "score": result["score"],
            "classification": result["classification"],
            "reasons": result["reasons"],
            "next_actions": result["next_actions"],
            "time_to_conversion": result["time_to_conversion"],
            "confidence": result.get("confidence", 0.85)
        }


# Exemplo de uso
if __name__ == "__main__":
    agent = LeadQualifierAgent()

    lead = {
        "id": "lead_123",
        "name": "João Silva",
        "email": "joao@techcorp.com",
        "company": "TechCorp Inc",
        "website": "https://techcorp.com",
        "job_title": "CTO",
        "phone": "+55 11 99999-9999",
        "source": "website_form",
        "created_at": "2025-11-01T10:30:00Z"
    }

    qualification = agent.execute(lead)
    print(json.dumps(qualification, indent=2))
```

### 2. EmailAssistant_Agent

```python
# conductor-crm/backend/src/agents/email_assistant.py

from conductor.ai_core import Agent
from typing import Dict, List, Optional

class EmailAssistantAgent(Agent):
    """
    Agente que escreve emails personalizados baseado em contexto do CRM
    """

    agent_id = "EmailAssistant_Agent"
    description = "Escreve emails de vendas personalizados usando contexto do deal"

    prompt = """
    Você é um assistente de vendas expert em comunicação B2B.

    Contexto do Deal:
    - Contato: {contact_name} ({job_title}) na {company}
    - Estágio: {deal_stage}
    - Histórico: {interaction_history}

    Intent: {intent}

    Escreva um email profissional, personalizado e persuasivo que:
    1. Seja natural e humano (não robotizado)
    2. Faça referência ao contexto específico
    3. Tenha CTA claro
    4. Tom: {tone}
    5. Comprimento: {length}

    Retorne 3 variações do email em JSON:
    {{
        "subject_lines": ["...", "...", "..."],
        "email_variations": [
            {{"version": "formal", "body": "..."}},
            {{"version": "casual", "body": "..."}},
            {{"version": "brief", "body": "..."}}
        ],
        "best_send_time": "...",
        "follow_up_suggestion": "..."
    }}
    """

    def compose_email(
        self,
        contact: Dict,
        deal: Dict,
        intent: str,
        tone: str = "professional",
        length: str = "medium"
    ) -> Dict:
        """
        Compõe email com IA
        """
        # Busca histórico de interações
        history = self._get_interaction_history(contact["id"], deal["id"])

        # Gera email
        response = self.llm.generate(
            self.prompt.format(
                contact_name=contact["name"],
                job_title=contact["job_title"],
                company=contact["company"],
                deal_stage=deal["stage"],
                interaction_history=self._format_history(history),
                intent=intent,
                tone=tone,
                length=length
            )
        )

        return json.loads(response)

    def _get_interaction_history(self, contact_id: str, deal_id: str) -> List[Dict]:
        """Busca histórico de interações do banco"""
        # Implementação real buscaria do banco
        return [
            {"type": "email", "date": "2025-10-15", "summary": "Apresentação inicial"},
            {"type": "call", "date": "2025-10-20", "summary": "Demo do produto"},
            {"type": "meeting", "date": "2025-10-25", "summary": "Reunião com decisores"}
        ]

    def _format_history(self, history: List[Dict]) -> str:
        """Formata histórico para o prompt"""
        return "\n".join([
            f"- {h['date']}: {h['type']} - {h['summary']}"
            for h in history
        ])
```

### 3. DealPredictor_Agent

```python
# conductor-crm/backend/src/agents/deal_predictor.py

from conductor.ai_core import Agent
from typing import Dict, List
import pandas as pd
from datetime import datetime

class DealPredictorAgent(Agent):
    """
    Agente que prevê probabilidade de fechamento de deals usando IA + dados históricos
    """

    agent_id = "DealPredictor_Agent"
    description = "Prevê probabilidade de fechamento e sugere ações"

    def predict_deal(self, deal_id: str) -> Dict:
        """
        Analisa um deal e retorna previsões
        """
        # 1. Busca dados do deal
        deal = self._get_deal_data(deal_id)

        # 2. Busca deals similares históricos
        similar_deals = self._find_similar_deals(deal)

        # 3. Calcula features
        features = self._extract_features(deal, similar_deals)

        # 4. LLM analisa qualitativamente
        llm_analysis = self._llm_analysis(deal, features)

        # 5. Combina análises
        return {
            "deal_id": deal_id,
            "win_probability": features["win_probability"],
            "predicted_close_date": features["predicted_close_date"],
            "current_health": llm_analysis["health_score"],
            "risks": llm_analysis["risks"],
            "opportunities": llm_analysis["opportunities"],
            "recommended_actions": llm_analysis["actions"],
            "similar_deals_stats": {
                "total": len(similar_deals),
                "won": sum(1 for d in similar_deals if d["status"] == "won"),
                "avg_cycle": self._avg_cycle_time(similar_deals)
            }
        }

    def _llm_analysis(self, deal: Dict, features: Dict) -> Dict:
        """Usa LLM para análise qualitativa"""
        prompt = f"""
        Analise este deal de vendas:

        Deal Info:
        - Valor: ${deal['value']:,.2f}
        - Estágio: {deal['stage']}
        - Dias no estágio atual: {features['days_in_stage']}
        - Último contato: {features['days_since_contact']} dias atrás
        - Engajamento score: {features['engagement_score']}/100
        - Competidores: {', '.join(deal.get('competitors', []))}

        Dados históricos similares:
        - Probabilidade calculada: {features['win_probability']:.1%}
        - Ciclo médio similar: {features['avg_similar_cycle']} dias

        Retorne em JSON:
        1. health_score (0-100): Saúde atual do deal
        2. risks: Lista de riscos identificados
        3. opportunities: Oportunidades de acelerar
        4. actions: 3-5 ações específicas recomendadas
        """

        response = self.llm.generate(prompt)
        return json.loads(response)

    def _extract_features(self, deal: Dict, similar_deals: List[Dict]) -> Dict:
        """Extrai features para previsão"""
        return {
            "win_probability": self._calculate_probability(deal, similar_deals),
            "predicted_close_date": self._predict_close_date(deal, similar_deals),
            "days_in_stage": (datetime.now() - deal["stage_entered_at"]).days,
            "days_since_contact": (datetime.now() - deal["last_contact_at"]).days,
            "engagement_score": self._calculate_engagement(deal),
            "avg_similar_cycle": self._avg_cycle_time(similar_deals)
        }
```

---

## 🔌 Backend API

### FastAPI Service Layer

```python
# conductor-crm/backend/src/api/routes/ai_assistant.py

from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, Dict, List
import asyncio

from src.services.conductor_client import ConductorClient
from src.agents.lead_qualifier import LeadQualifierAgent
from src.agents.email_assistant import EmailAssistantAgent

router = APIRouter(prefix="/ai", tags=["AI Assistant"])
conductor = ConductorClient(gateway_url="http://conductor-gateway:5006")


class QualifyLeadRequest(BaseModel):
    lead_id: str

class ComposeEmailRequest(BaseModel):
    contact_id: str
    deal_id: str
    intent: str
    tone: Optional[str] = "professional"


@router.post("/qualify-lead")
async def qualify_lead(request: QualifyLeadRequest):
    """
    Qualifica um lead usando IA
    """
    try:
        # Busca dados do lead
        lead = await db.leads.find_one({"_id": request.lead_id})
        if not lead:
            raise HTTPException(404, "Lead não encontrado")

        # Executa agente via Conductor Gateway
        result = await conductor.execute_agent(
            agent_id="LeadQualifier_Agent",
            input_data=lead,
            mode="stateless"
        )

        # Atualiza lead no banco
        await db.leads.update_one(
            {"_id": request.lead_id},
            {"$set": {
                "qualification_score": result["score"],
                "classification": result["classification"],
                "qualification_date": datetime.now(),
                "ai_insights": result["reasons"]
            }}
        )

        return {
            "success": True,
            "lead_id": request.lead_id,
            "qualification": result
        }

    except Exception as e:
        raise HTTPException(500, str(e))


@router.post("/compose-email/stream")
async def compose_email_stream(request: ComposeEmailRequest):
    """
    Compõe email com streaming SSE (usuário vê em tempo real)
    """
    async def event_generator():
        try:
            # Busca contexto
            contact = await db.contacts.find_one({"_id": request.contact_id})
            deal = await db.deals.find_one({"_id": request.deal_id})

            # Inicia execução via SSE do Conductor Gateway
            async for event in conductor.stream_agent_execution(
                agent_id="EmailAssistant_Agent",
                input_data={
                    "contact": contact,
                    "deal": deal,
                    "intent": request.intent,
                    "tone": request.tone
                }
            ):
                yield f"data: {json.dumps(event)}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream"
    )


@router.get("/chat/{conversation_id}")
async def chat_with_ai(conversation_id: str, message: str):
    """
    Chat contextual com IA sobre o CRM
    """
    result = await conductor.execute_agent(
        agent_id="CRMAssistant_Agent",
        input_data={"message": message},
        mode="contextual",
        context_id=conversation_id
    )

    return {"response": result["output"]}
```

### Conductor Client SDK

```python
# conductor-crm/backend/src/services/conductor_client.py

import aiohttp
import asyncio
from typing import Dict, Any, AsyncIterator
import json

class ConductorClient:
    """
    Cliente para comunicação com Conductor Gateway
    """

    def __init__(self, gateway_url: str):
        self.gateway_url = gateway_url.rstrip("/")
        self.session = None

    async def _ensure_session(self):
        if not self.session:
            self.session = aiohttp.ClientSession()

    async def execute_agent(
        self,
        agent_id: str,
        input_data: Dict[str, Any],
        mode: str = "stateless",
        context_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executa agente de forma síncrona
        """
        await self._ensure_session()

        payload = {
            "agent": agent_id,
            "input": json.dumps(input_data),
            "mode": mode
        }

        if context_id:
            payload["context_id"] = context_id

        async with self.session.post(
            f"{self.gateway_url}/api/v1/execute",
            json=payload
        ) as response:
            response.raise_for_status()
            return await response.json()

    async def stream_agent_execution(
        self,
        agent_id: str,
        input_data: Dict[str, Any]
    ) -> AsyncIterator[Dict[str, Any]]:
        """
        Executa agente com streaming SSE
        """
        await self._ensure_session()

        # 1. Inicia job
        async with self.session.post(
            f"{self.gateway_url}/api/v1/stream-execute",
            json={"agent": agent_id, "input": json.dumps(input_data)}
        ) as response:
            job_info = await response.json()
            job_id = job_info["job_id"]

        # 2. Conecta ao stream
        async with self.session.get(
            f"{self.gateway_url}/api/v1/stream/{job_id}"
        ) as response:
            async for line in response.content:
                if line.startswith(b"data: "):
                    data = json.loads(line[6:])
                    yield data

                    if data.get("event") == "result":
                        break

    async def list_agents(self) -> List[Dict[str, str]]:
        """Lista agentes disponíveis"""
        await self._ensure_session()

        async with self.session.get(
            f"{self.gateway_url}/api/v1/agents"
        ) as response:
            return await response.json()
```

---

## 🎨 Frontend Components

### Angular Service

```typescript
// conductor-crm/frontend/src/app/services/ai.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface LeadQualification {
  score: number;
  classification: 'Hot' | 'Warm' | 'Cold';
  reasons: string[];
  next_actions: string[];
}

export interface EmailDraft {
  subject_lines: string[];
  email_variations: Array<{
    version: string;
    body: string;
  }>;
  best_send_time: string;
}

@Injectable({ providedIn: 'root' })
export class AiService {
  private apiUrl = 'http://localhost:5007/ai';

  constructor(private http: HttpClient) {}

  qualifyLead(leadId: string): Observable<LeadQualification> {
    return this.http.post<LeadQualification>(
      `${this.apiUrl}/qualify-lead`,
      { lead_id: leadId }
    );
  }

  composeEmailStream(
    contactId: string,
    dealId: string,
    intent: string
  ): Observable<any> {
    return new Observable(observer => {
      const eventSource = new EventSource(
        `${this.apiUrl}/compose-email/stream?` +
        `contact_id=${contactId}&deal_id=${dealId}&intent=${intent}`
      );

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        observer.next(data);

        if (data.event === 'result') {
          eventSource.close();
          observer.complete();
        }
      };

      eventSource.onerror = (error) => {
        eventSource.close();
        observer.error(error);
      };

      return () => eventSource.close();
    });
  }

  chatWithAi(conversationId: string, message: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/chat/${conversationId}`, {
      params: { message }
    });
  }
}
```

### AI Lead Insights Component

```typescript
// conductor-crm/frontend/src/app/modules/leads/ai-lead-insights.component.ts

import { Component, Input, OnInit } from '@angular/core';
import { AiService, LeadQualification } from '../../services/ai.service';

@Component({
  selector: 'app-ai-lead-insights',
  template: `
    <div class="ai-insights-card">
      <h3>🤖 AI Insights</h3>

      <div *ngIf="loading" class="loading">
        <mat-spinner diameter="40"></mat-spinner>
        <p>Analisando lead com IA...</p>
      </div>

      <div *ngIf="qualification" class="qualification-result">
        <!-- Score -->
        <div class="score-badge" [class]="qualification.classification.toLowerCase()">
          <span class="score">{{ qualification.score }}</span>
          <span class="label">{{ qualification.classification }}</span>
        </div>

        <!-- Reasons -->
        <div class="reasons">
          <h4>Por que essa classificação?</h4>
          <ul>
            <li *ngFor="let reason of qualification.reasons">
              {{ reason }}
            </li>
          </ul>
        </div>

        <!-- Next Actions -->
        <div class="actions">
          <h4>🎯 Próximas Ações Recomendadas</h4>
          <mat-chip-list>
            <mat-chip *ngFor="let action of qualification.next_actions">
              {{ action }}
            </mat-chip>
          </mat-chip-list>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .ai-insights-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 12px;
    }

    .score-badge {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 24px;
      font-weight: bold;
      margin: 20px 0;
    }

    .score-badge.hot { color: #ff4444; }
    .score-badge.warm { color: #ffaa00; }
    .score-badge.cold { color: #4444ff; }
  `]
})
export class AiLeadInsightsComponent implements OnInit {
  @Input() leadId!: string;

  qualification: LeadQualification | null = null;
  loading = false;

  constructor(private aiService: AiService) {}

  ngOnInit() {
    this.loadQualification();
  }

  loadQualification() {
    this.loading = true;
    this.aiService.qualifyLead(this.leadId).subscribe({
      next: (result) => {
        this.qualification = result;
        this.loading = false;
      },
      error: (err) => {
        console.error('Erro ao qualificar lead:', err);
        this.loading = false;
      }
    });
  }
}
```

### AI Email Composer Component

```typescript
// conductor-crm/frontend/src/app/modules/inbox/ai-email-composer.component.ts

import { Component, Input } from '@angular/core';
import { AiService, EmailDraft } from '../../services/ai.service';

@Component({
  selector: 'app-ai-email-composer',
  template: `
    <div class="email-composer">
      <h3>✍️ AI Email Assistant</h3>

      <!-- Intent Input -->
      <mat-form-field>
        <mat-label>O que você quer comunicar?</mat-label>
        <input matInput [(ngModel)]="intent"
               placeholder="Ex: Follow-up após demo"
               (keyup.enter)="generateEmail()">
      </mat-form-field>

      <button mat-raised-button color="primary"
              (click)="generateEmail()"
              [disabled]="generating">
        <mat-icon>auto_awesome</mat-icon>
        Gerar Email com IA
      </button>

      <!-- Streaming Output -->
      <div *ngIf="generating" class="generating">
        <mat-progress-bar mode="indeterminate"></mat-progress-bar>
        <p>{{ streamingStatus }}</p>
      </div>

      <!-- Email Variations -->
      <div *ngIf="emailDraft" class="email-variations">
        <mat-tab-group>
          <mat-tab *ngFor="let variation of emailDraft.email_variations"
                   [label]="variation.version">
            <div class="email-preview">
              <h4>Subject:</h4>
              <mat-chip-list>
                <mat-chip *ngFor="let subject of emailDraft.subject_lines"
                          (click)="selectedSubject = subject">
                  {{ subject }}
                </mat-chip>
              </mat-chip-list>

              <h4>Body:</h4>
              <div class="email-body" [innerHTML]="variation.body | sanitizeHtml"></div>

              <button mat-raised-button color="accent"
                      (click)="useThisEmail(variation)">
                Usar este Email
              </button>
            </div>
          </mat-tab>
        </mat-tab-group>
      </div>
    </div>
  `
})
export class AiEmailComposerComponent {
  @Input() contactId!: string;
  @Input() dealId!: string;

  intent = '';
  generating = false;
  streamingStatus = '';
  emailDraft: EmailDraft | null = null;
  selectedSubject = '';

  constructor(private aiService: AiService) {}

  generateEmail() {
    if (!this.intent) return;

    this.generating = true;
    this.emailDraft = null;

    this.aiService.composeEmailStream(
      this.contactId,
      this.dealId,
      this.intent
    ).subscribe({
      next: (event) => {
        if (event.event === 'status_update') {
          this.streamingStatus = event.data.message;
        } else if (event.event === 'result') {
          this.emailDraft = event.data.result;
          this.generating = false;
        }
      },
      error: (err) => {
        console.error('Erro ao gerar email:', err);
        this.generating = false;
      }
    });
  }

  useThisEmail(variation: any) {
    // Implementar: copiar para editor ou enviar
    console.log('Usando email:', variation);
  }
}
```

---

## 🔄 Workflows Automatizados

### Lead Nurturing Workflow

```yaml
# conductor-crm/workflows/lead_nurturing.yaml

name: lead_nurturing_workflow
description: Workflow automático de nutrição de leads

triggers:
  - event: lead.created
    condition: lead.source == 'website_form'

steps:
  # Step 1: Qualificar lead
  - name: qualify_lead
    agent: LeadQualifier_Agent
    input:
      lead_id: ${trigger.lead_id}
    output: qualification

  # Step 2: Enriquecer dados
  - name: enrich_data
    agent: DataEnricher_Agent
    input:
      company: ${trigger.lead.company}
    output: enriched_data
    parallel: true  # Roda em paralelo com step 3

  # Step 3: Criar deal se Hot
  - name: create_deal_if_hot
    condition: ${qualification.classification} == 'Hot'
    action: crm.create_deal
    input:
      lead_id: ${trigger.lead_id}
      value: ${qualification.estimated_value}
      probability: ${qualification.score}

  # Step 4: Agendar follow-up
  - name: schedule_followup
    agent: SchedulerBot_Agent
    input:
      lead_id: ${trigger.lead_id}
      action: ${qualification.next_actions[0]}
      delay_days: 2

  # Step 5: Notificar vendedor
  - name: notify_sales
    action: notification.send
    input:
      user_id: ${qualification.assigned_to}
      message: "Novo lead qualificado: ${trigger.lead.name} (${qualification.classification})"
```

### Deal Intelligence Workflow

```yaml
# conductor-crm/workflows/deal_intelligence.yaml

name: deal_intelligence_workflow
description: Análise contínua de saúde dos deals

triggers:
  - schedule: "0 9 * * *"  # Todo dia às 9h

steps:
  # Analisa todos os deals ativos
  - name: get_active_deals
    action: crm.query_deals
    input:
      status: active
    output: active_deals

  - name: analyze_each_deal
    for_each: ${active_deals}
    steps:
      - name: predict_outcome
        agent: DealPredictor_Agent
        input:
          deal_id: ${item.id}
        output: prediction

      - name: check_risks
        condition: ${prediction.win_probability} < 0.4
        agent: RiskMitigation_Agent
        input:
          deal_id: ${item.id}
          risks: ${prediction.risks}
        output: mitigation_plan

      - name: alert_if_urgent
        condition: ${prediction.health_score} < 50
        action: notification.send_urgent
        input:
          user_id: ${item.owner_id}
          message: "⚠️ Deal ${item.name} precisa de atenção: ${prediction.risks[0]}"
```

---

## 🎯 Fluxo Completo: Da UI ao Agente

### Exemplo: Usuário clica "Qualificar com IA"

```
┌─────────────────────────────────────────────────┐
│ 1. Frontend (Angular)                           │
│    User clicks "Qualificar Lead" button         │
│    → aiService.qualifyLead(leadId)              │
└─────────────────────────────────────────────────┘
                     ↓ HTTP POST
┌─────────────────────────────────────────────────┐
│ 2. CRM Backend (FastAPI)                        │
│    POST /ai/qualify-lead                        │
│    → Busca lead do MongoDB                      │
│    → conductorClient.execute_agent()            │
└─────────────────────────────────────────────────┘
                     ↓ HTTP POST
┌─────────────────────────────────────────────────┐
│ 3. Conductor Gateway                            │
│    POST /api/v1/execute                         │
│    → Valida payload                             │
│    → Chama conductor CLI via MCP tools          │
└─────────────────────────────────────────────────┘
                     ↓ Python subprocess
┌─────────────────────────────────────────────────┐
│ 4. Conductor Core (Python)                      │
│    conductor --agent LeadQualifier_Agent...     │
│    → Carrega agente                             │
│    → Executa ferramentas (search_company, etc)  │
│    → Chama LLM (Claude/Gemini)                  │
│    → Retorna resultado estruturado              │
└─────────────────────────────────────────────────┘
                     ↓ JSON response
┌─────────────────────────────────────────────────┐
│ 5. CRM Backend                                  │
│    ← Recebe qualificação                        │
│    → Atualiza lead no MongoDB                   │
│    → Retorna para frontend                      │
└─────────────────────────────────────────────────┘
                     ↓ JSON response
┌─────────────────────────────────────────────────┐
│ 6. Frontend                                     │
│    ← Recebe qualificação                        │
│    → Atualiza UI com score, classification      │
│    → Mostra insights e próximas ações           │
└─────────────────────────────────────────────────┘
```

---

## 📦 Estrutura de Pacote NPM Reutilizável

```typescript
// @conductor/crm-components (publicado no NPM)

export { AiLeadInsightsComponent } from './components/ai-lead-insights';
export { AiEmailComposerComponent } from './components/ai-email-composer';
export { AiChatWidgetComponent } from './components/ai-chat-widget';
export { DealIntelligenceComponent } from './components/deal-intelligence';

export { AiService } from './services/ai.service';
export { ConductorClient } from './services/conductor-client';

export { ConductorCrmModule } from './conductor-crm.module';
```

Uso em outros projetos:
```bash
npm install @conductor/crm-components
```

```typescript
import { ConductorCrmModule } from '@conductor/crm-components';

@NgModule({
  imports: [ConductorCrmModule]
})
export class MyCustomCrmModule {}
```

---

**Próximo Passo**: Implementar PoC com 1 tela + 1 agente funcionando end-to-end! 🚀
