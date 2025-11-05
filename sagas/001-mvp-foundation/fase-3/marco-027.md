# Marco 027: DealPredictor_Agent v1
> Backend - Agente de previsão de resultados de deals | 5 dias

**Responsável**: Tech Lead
**Revisor**: Product Manager
**Status**: 🔵 Planejado

---

## 🎯 Objetivo

Implementar agente de IA que prevê probabilidade de fechamento, data estimada de close, health score, e identifica fatores de risco em deals ativos.

---

## 📋 Key Features

- **Win Probability**: 0-100% de chance de fechar
- **Predicted Close Date**: Data estimada baseada em histórico
- **Health Score**: 0-100 saúde do deal
- **Risk Factors**: Lista de riscos identificados
- **Recommended Actions**: Ações prioritizadas para aumentar win rate

**Target Accuracy**: >65% vs outcomes reais

---

## 🤖 Agent Implementation

```python
# src/agents/deal_predictor_agent.py

from conductor import Agent, Task, Workflow
from conductor.llms import ClaudeLLM
from typing import Dict, List, Optional
from pydantic import BaseModel
from datetime import datetime, timedelta
import statistics

class DealPredictionInput(BaseModel):
    """Input para previsão de deal"""
    deal_id: str

    # Deal data
    title: str
    value: int
    stage: str
    probability: int  # Current probability (manual)
    expected_close_date: Optional[datetime] = None
    created_at: datetime

    # Context
    company_size: Optional[int] = None
    industry: Optional[str] = None
    contact_seniority: Optional[str] = None  # 'executive', 'manager', 'individual'

    # Activity metrics
    days_since_created: int
    days_in_current_stage: int
    total_activities: int
    last_activity_days_ago: int
    email_response_rate: float  # 0.0-1.0
    meeting_count: int

    # Engagement
    engagement_score: int  # From email tracking

    # Historical patterns (future: ML model)
    avg_deal_cycle_days: int = 30  # From historical data
    avg_win_rate_for_stage: float = 0.5

class RiskFactor(BaseModel):
    severity: str  # 'high', 'medium', 'low'
    factor: str
    impact: str  # Description of impact

class RecommendedAction(BaseModel):
    priority: str  # 'high', 'medium', 'low'
    action: str
    reasoning: str

class DealPredictionOutput(BaseModel):
    deal_id: str

    # Predictions
    ai_win_probability: int  # 0-100
    confidence_level: float  # 0.0-1.0
    predicted_close_date: Optional[datetime] = None
    health_score: int  # 0-100

    # Analysis
    risk_factors: List[RiskFactor]
    recommended_actions: List[RecommendedAction]

    # Reasoning
    prediction_reasoning: str
    key_signals: List[str]  # Positive signals
    warning_signs: List[str]  # Negative signals

    # Metadata
    predicted_at: datetime
    model_used: str

class DealPredictorAgent:
    """
    Agente especializado em prever resultados de deals

    Analisa:
    - Atividade e engajamento
    - Tempo em cada stage
    - Seniority dos stakeholders
    - Tamanho da empresa
    - Padrões históricos
    """

    def __init__(self):
        self.llm = ClaudeLLM(
            model="claude-3-5-sonnet-20241022",
            temperature=0.2,  # Baixa para consistência
            max_tokens=2000
        )

        self.agent = Agent(
            name="DealPredictor",
            role="Senior Sales Analytics Specialist",
            goal="Accurately predict deal outcomes and provide actionable insights",
            backstory="""You are an expert sales analyst with 15 years of experience
            analyzing deal patterns. You understand:
            - What makes deals close successfully
            - Early warning signs of deals at risk
            - Effective strategies to move deals forward

            You provide data-driven predictions with clear reasoning.""",
            llm=self.llm
        )

    async def predict_deal(self, deal_input: DealPredictionInput) -> DealPredictionOutput:
        """
        Prevê resultado do deal
        """
        # 1. Calculate base metrics
        metrics = self._calculate_base_metrics(deal_input)

        # 2. Build prompt
        prompt = self._build_prediction_prompt(deal_input, metrics)

        # 3. Execute agent
        task = Task(
            description=prompt,
            expected_output="JSON with prediction results",
            agent=self.agent
        )

        workflow = Workflow(tasks=[task], verbose=False)
        result = workflow.run()

        # 4. Parse result
        prediction = self._parse_result(result, deal_input, metrics)

        # 5. Metadata
        prediction.predicted_at = datetime.utcnow()
        prediction.model_used = self.llm.model

        return prediction

    def _calculate_base_metrics(self, deal: DealPredictionInput) -> Dict:
        """
        Calcula métricas base para análise
        """
        metrics = {}

        # Stage velocity (está movendo rápido ou devagar?)
        metrics['stage_velocity'] = 'slow' if deal.days_in_current_stage > 14 else 'normal'

        # Activity freshness
        metrics['activity_freshness'] = 'stale' if deal.last_activity_days_ago > 7 else 'fresh'

        # Engagement quality
        metrics['engagement_quality'] = (
            'high' if deal.engagement_score >= 70
            else 'medium' if deal.engagement_score >= 40
            else 'low'
        )

        # Deal maturity
        deal_age_ratio = deal.days_since_created / deal.avg_deal_cycle_days
        metrics['deal_maturity'] = (
            'overdue' if deal_age_ratio > 1.5
            else 'mature' if deal_age_ratio > 0.8
            else 'early'
        )

        # Response rate quality
        metrics['response_quality'] = (
            'excellent' if deal.email_response_rate > 0.7
            else 'good' if deal.email_response_rate > 0.4
            else 'poor'
        )

        return metrics

    def _build_prediction_prompt(self, deal: DealPredictionInput, metrics: Dict) -> str:
        """
        Constrói prompt para previsão
        """
        prompt = f"""
# Deal Outcome Prediction Task

## Deal Information
- **Title**: {deal.title}
- **Value**: R$ {deal.value / 100:,.2f}
- **Current Stage**: {deal.stage}
- **Current Probability** (manual): {deal.probability}%
- **Expected Close**: {deal.expected_close_date or 'Not set'}
- **Created**: {deal.created_at.date()} ({deal.days_since_created} days ago)

## Company & Contact
- **Company Size**: {deal.company_size or 'Unknown'} employees
- **Industry**: {deal.industry or 'Unknown'}
- **Contact Seniority**: {deal.contact_seniority or 'Unknown'}

## Activity Metrics
- **Days in Current Stage**: {deal.days_in_current_stage} days
- **Total Activities**: {deal.total_activities}
- **Last Activity**: {deal.last_activity_days_ago} days ago
- **Email Response Rate**: {deal.email_response_rate * 100:.0f}%
- **Meetings Held**: {deal.meeting_count}
- **Engagement Score**: {deal.engagement_score}/100

## Calculated Signals
- **Stage Velocity**: {metrics['stage_velocity']}
- **Activity Freshness**: {metrics['activity_freshness']}
- **Engagement Quality**: {metrics['engagement_quality']}
- **Deal Maturity**: {metrics['deal_maturity']}
- **Response Quality**: {metrics['response_quality']}

## Benchmarks
- **Average Deal Cycle**: {deal.avg_deal_cycle_days} days
- **Win Rate for {deal.stage}**: {deal.avg_win_rate_for_stage * 100:.0f}%

## Your Task
Analyze this deal and provide:

1. **Win Probability** (0-100%)
   - Consider engagement, activity, stage velocity
   - Adjust based on warning signs

2. **Health Score** (0-100)
   - Overall deal health
   - Independent of win probability

3. **Predicted Close Date**
   - Based on typical cycle time and current pace

4. **Risk Factors** (if any)
   - Identify risks with severity (high/medium/low)

5. **Recommended Actions** (prioritized)
   - 3-5 specific actions to improve win rate

## Output Format (JSON)
```json
{{
  "ai_win_probability": 75,
  "confidence_level": 0.85,
  "predicted_close_date": "2025-03-15",
  "health_score": 80,
  "risk_factors": [
    {{
      "severity": "medium",
      "factor": "Long time in current stage",
      "impact": "May indicate stalled deal"
    }}
  ],
  "recommended_actions": [
    {{
      "priority": "high",
      "action": "Schedule executive alignment call",
      "reasoning": "Decision maker engagement is critical"
    }}
  ],
  "prediction_reasoning": "Overall explanation...",
  "key_signals": ["High engagement", "Executive involved"],
  "warning_signs": ["7 days since last contact"]
}}
```

Provide your analysis:
"""
        return prompt

    def _parse_result(self, result: str, deal: DealPredictionInput, metrics: Dict) -> DealPredictionOutput:
        """Parse resultado do LLM"""
        import json
        import re

        json_match = re.search(r'\{.*\}', result, re.DOTALL)
        if not json_match:
            return self._default_prediction(deal)

        try:
            data = json.loads(json_match.group())

            # Parse predicted_close_date
            predicted_date = None
            if data.get('predicted_close_date'):
                try:
                    predicted_date = datetime.fromisoformat(data['predicted_close_date'])
                except:
                    # Fallback: add avg cycle time to today
                    predicted_date = datetime.utcnow() + timedelta(days=deal.avg_deal_cycle_days)

            return DealPredictionOutput(
                deal_id=deal.deal_id,
                ai_win_probability=max(0, min(100, data.get('ai_win_probability', 50))),
                confidence_level=max(0.0, min(1.0, data.get('confidence_level', 0.5))),
                predicted_close_date=predicted_date,
                health_score=max(0, min(100, data.get('health_score', 50))),
                risk_factors=[
                    RiskFactor(**r) for r in data.get('risk_factors', [])
                ],
                recommended_actions=[
                    RecommendedAction(**a) for a in data.get('recommended_actions', [])
                ],
                prediction_reasoning=data.get('prediction_reasoning', ''),
                key_signals=data.get('key_signals', []),
                warning_signs=data.get('warning_signs', []),
                predicted_at=datetime.utcnow(),
                model_used=self.llm.model
            )

        except Exception as e:
            print(f"Error parsing prediction: {e}")
            return self._default_prediction(deal)

    def _default_prediction(self, deal: DealPredictionInput) -> DealPredictionOutput:
        """Default prediction in case of error"""
        return DealPredictionOutput(
            deal_id=deal.deal_id,
            ai_win_probability=deal.probability,  # Use manual probability
            confidence_level=0.3,
            predicted_close_date=deal.expected_close_date,
            health_score=50,
            risk_factors=[
                RiskFactor(
                    severity='medium',
                    factor='AI prediction unavailable',
                    impact='Using fallback values'
                )
            ],
            recommended_actions=[
                RecommendedAction(
                    priority='high',
                    action='Update deal information for better predictions',
                    reasoning='More data improves accuracy'
                )
            ],
            prediction_reasoning='Fallback prediction (AI unavailable)',
            key_signals=[],
            warning_signs=['Prediction system error'],
            predicted_at=datetime.utcnow(),
            model_used='fallback'
        )
```

---

## 🔌 API Endpoint

```python
# src/api/routes/ai/deal.py

@router.post("/ai/deal/{deal_id}/predict")
async def predict_deal(
    deal_id: str,
    current_user: str = Depends(get_current_user)
):
    """
    Prevê resultado de um deal
    """
    # 1. Get deal
    deal = await db.deals.find_one({"_id": ObjectId(deal_id)})
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    # 2. Gather metrics
    activities = await db.activities.find({
        'entity_type': 'deal',
        'entity_id': ObjectId(deal_id)
    }).to_list(length=None)

    # Calculate activity metrics
    days_since_created = (datetime.utcnow() - deal['created_at']).days
    last_activity = max([a['created_at'] for a in activities]) if activities else deal['created_at']
    days_since_last_activity = (datetime.utcnow() - last_activity).days

    # Email metrics
    email_activities = [a for a in activities if a['type'] == 'email' and a.get('email_direction') == 'sent']
    emails_with_response = sum(1 for a in email_activities if a.get('email_opened'))
    email_response_rate = emails_with_response / len(email_activities) if email_activities else 0

    # 3. Build input
    prediction_input = DealPredictionInput(
        deal_id=deal_id,
        title=deal['title'],
        value=deal['value'],
        stage=deal['stage'],
        probability=deal.get('probability', 50),
        expected_close_date=deal.get('expected_close_date'),
        created_at=deal['created_at'],
        days_since_created=days_since_created,
        days_in_current_stage=(datetime.utcnow() - deal['stage_history'][-1]['entered_at']).days,
        total_activities=len(activities),
        last_activity_days_ago=days_since_last_activity,
        email_response_rate=email_response_rate,
        meeting_count=sum(1 for a in activities if a['type'] == 'meeting'),
        engagement_score=deal.get('engagement_score', 50)
    )

    # 4. Run prediction
    agent = DealPredictorAgent()
    prediction = await agent.predict_deal(prediction_input)

    # 5. Save to database
    await db.deals.update_one(
        {"_id": ObjectId(deal_id)},
        {
            "$set": {
                "ai_probability": prediction.ai_win_probability,
                "ai_predicted_close_date": prediction.predicted_close_date,
                "ai_health_score": prediction.health_score,
                "risk_factors": [r.dict() for r in prediction.risk_factors],
                "recommended_actions": [a.dict() for a in prediction.recommended_actions],
                "prediction_metadata": {
                    "predicted_at": prediction.predicted_at,
                    "confidence_level": prediction.confidence_level,
                    "model_used": prediction.model_used
                }
            }
        }
    )

    return prediction.dict()
```

---

## ✅ Critérios de Aceitação

- [ ] Agente prevê win probability (0-100%)
- [ ] Predicted close date é calculado
- [ ] Health score (0-100) é retornado
- [ ] Risk factors são identificados
- [ ] Recommended actions são priorizadas
- [ ] Previsão completa em <5 segundos
- [ ] Accuracy >65% (após 3 meses de dados)
- [ ] Resultados salvos no deal
- [ ] API endpoint funciona
- [ ] Testes unitários

---

## 🔗 Dependências

- ✅ Marco 017: Deal Model & API
- ✅ Marco 022: Activity Logging System
- ✅ Marco 004: Conductor Core

---

**Status**: 🔵 Pronto para Implementação
**Estimativa**: 5 dias
