# Marco 017: Deal Model & API
> Backend - Modelo e API de Deals/Oportunidades | 3 dias

**Responsável**: Backend Dev
**Revisor**: Tech Lead
**Status**: 🔵 Planejado

---

## 🎯 Objetivo

Implementar modelo de dados e API REST completa para Deals (Oportunidades de venda), com pipeline stages, relacionamentos com leads/contacts, e histórico de mudanças.

---

## 📋 Contexto

Deals representam oportunidades de venda ativas. Diferente de Leads:
- Lead = interesse inicial (topo do funil)
- Deal = oportunidade qualificada (meio/fundo do funil)

Um Deal deve ter:
- Value ($ estimado)
- Pipeline stage (Qualification → Proposal → Negotiation → Closed)
- Expected close date
- Probability (% de fechar)
- Related contacts/company
- Activities e notas

---

## 🗄️ MongoDB Schema

```javascript
// Collection: deals

{
  _id: ObjectId,
  title: String,  // Ex: "Contrato de CRM - Acme Corp"

  // Value
  value: Number,  // Em centavos (R$ 10.000 = 1000000)
  currency: String,  // "BRL", "USD"

  // Pipeline
  stage: String,  // 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost'
  pipeline_id: ObjectId,  // Reference to pipeline (future: custom pipelines)

  // Probability & Forecasting
  probability: Number,  // 0-100 (%, updated by AI)
  expected_close_date: Date,
  actual_close_date: Date,  // Populated when closed

  // Relationships
  lead_id: ObjectId,  // Lead que originou (nullable se deal criado diretamente)
  company_id: ObjectId,  // Company associada
  contact_ids: [ObjectId],  // Contacts envolvidos

  // Ownership
  owner_id: ObjectId,  // SDR/vendedor responsável
  team_id: ObjectId,  // Time (future)

  // Source
  source: String,  // 'converted_lead', 'manual', 'inbound', 'outbound'

  // Status
  status: String,  // 'open', 'won', 'lost'
  lost_reason: String,  // Motivo se lost

  // AI Fields (from DealPredictor_Agent)
  ai_probability: Number,  // Win probability calculado por IA
  ai_predicted_close_date: Date,
  ai_health_score: Number,  // 0-100 (health do deal)
  risk_factors: [String],  // Fatores de risco identificados pela IA
  recommended_actions: [{
    action: String,
    priority: String  // 'high', 'medium', 'low'
  }],

  // Custom Fields (future)
  custom_fields: Map,  // Flexibilidade para campos customizados

  // Metadata
  created_at: Date,
  updated_at: Date,
  created_by: ObjectId,
  last_activity_at: Date,  // Última atividade (email, call, note)

  // Stage History (track mudanças)
  stage_history: [{
    stage: String,
    entered_at: Date,
    exited_at: Date,
    duration_days: Number
  }],

  // Tags
  tags: [String]
}

// Indexes
db.deals.createIndex({ owner_id: 1, status: 1 })
db.deals.createIndex({ stage: 1, expected_close_date: 1 })
db.deals.createIndex({ company_id: 1 })
db.deals.createIndex({ status: 1, created_at: -1 })
db.deals.createIndex({ expected_close_date: 1 })
```

---

## 📝 Pydantic Models

```python
# src/models/deal.py

from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict
from datetime import datetime
from bson import ObjectId
from enum import Enum

class DealStage(str, Enum):
    QUALIFICATION = "qualification"
    PROPOSAL = "proposal"
    NEGOTIATION = "negotiation"
    CLOSED_WON = "closed_won"
    CLOSED_LOST = "closed_lost"

class DealStatus(str, Enum):
    OPEN = "open"
    WON = "won"
    LOST = "lost"

class DealSource(str, Enum):
    CONVERTED_LEAD = "converted_lead"
    MANUAL = "manual"
    INBOUND = "inbound"
    OUTBOUND = "outbound"

class StageHistoryEntry(BaseModel):
    stage: DealStage
    entered_at: datetime
    exited_at: Optional[datetime] = None
    duration_days: Optional[int] = None

class RecommendedAction(BaseModel):
    action: str
    priority: str  # 'high', 'medium', 'low'

class DealBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    value: int = Field(..., ge=0)  # Em centavos
    currency: str = Field(default="BRL", pattern="^[A-Z]{3}$")

    stage: DealStage = Field(default=DealStage.QUALIFICATION)
    probability: int = Field(default=10, ge=0, le=100)
    expected_close_date: Optional[datetime] = None

    company_id: Optional[str] = None
    contact_ids: List[str] = []
    lead_id: Optional[str] = None

    source: DealSource = Field(default=DealSource.MANUAL)

    tags: List[str] = []
    custom_fields: Dict = {}

    @validator('value')
    def validate_value(cls, v):
        if v < 0:
            raise ValueError('Value must be positive')
        return v

    @validator('probability')
    def validate_probability(cls, v):
        if not 0 <= v <= 100:
            raise ValueError('Probability must be between 0 and 100')
        return v

class DealCreate(DealBase):
    owner_id: str

class DealUpdate(BaseModel):
    title: Optional[str] = None
    value: Optional[int] = None
    stage: Optional[DealStage] = None
    probability: Optional[int] = None
    expected_close_date: Optional[datetime] = None
    contact_ids: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    custom_fields: Optional[Dict] = None

class DealInDB(DealBase):
    id: str
    owner_id: str
    status: DealStatus = DealStatus.OPEN

    ai_probability: Optional[int] = None
    ai_predicted_close_date: Optional[datetime] = None
    ai_health_score: Optional[int] = None
    risk_factors: List[str] = []
    recommended_actions: List[RecommendedAction] = []

    stage_history: List[StageHistoryEntry] = []

    created_at: datetime
    updated_at: datetime
    created_by: str
    last_activity_at: Optional[datetime] = None

    actual_close_date: Optional[datetime] = None
    lost_reason: Optional[str] = None

    class Config:
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }
```

---

## 🔌 API Endpoints

```python
# src/api/routes/deals.py

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from src.models.deal import DealCreate, DealUpdate, DealInDB
from src.database import db
from bson import ObjectId
from datetime import datetime

router = APIRouter()

@router.post("/deals", response_model=DealInDB, status_code=201)
async def create_deal(
    deal: DealCreate,
    current_user: str = Depends(get_current_user)
):
    """
    Cria um novo deal
    """
    deal_dict = deal.dict()
    deal_dict.update({
        "status": "open",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "created_by": current_user,
        "stage_history": [{
            "stage": deal.stage,
            "entered_at": datetime.utcnow()
        }]
    })

    result = await db.deals.insert_one(deal_dict)

    created_deal = await db.deals.find_one({"_id": result.inserted_id})
    created_deal['id'] = str(created_deal.pop('_id'))

    return DealInDB(**created_deal)

@router.get("/deals", response_model=List[DealInDB])
async def list_deals(
    status: Optional[str] = Query(None, enum=['open', 'won', 'lost']),
    stage: Optional[str] = Query(None),
    owner_id: Optional[str] = None,
    company_id: Optional[str] = None,
    min_value: Optional[int] = None,
    max_value: Optional[int] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    sort_by: str = Query("created_at", enum=["created_at", "value", "expected_close_date"]),
    sort_order: str = Query("desc", enum=["asc", "desc"]),
    current_user: str = Depends(get_current_user)
):
    """
    Lista deals com filtros
    """
    filter_query = {}

    if status:
        filter_query['status'] = status
    if stage:
        filter_query['stage'] = stage
    if owner_id:
        filter_query['owner_id'] = owner_id
    if company_id:
        filter_query['company_id'] = company_id
    if min_value is not None:
        filter_query['value'] = {'$gte': min_value}
    if max_value is not None:
        filter_query.setdefault('value', {})['$lte'] = max_value

    # Sorting
    sort_direction = -1 if sort_order == "desc" else 1

    cursor = db.deals.find(filter_query).sort(sort_by, sort_direction).skip(skip).limit(limit)

    deals = []
    async for deal in cursor:
        deal['id'] = str(deal.pop('_id'))
        deals.append(DealInDB(**deal))

    return deals

@router.get("/deals/{deal_id}", response_model=DealInDB)
async def get_deal(
    deal_id: str,
    current_user: str = Depends(get_current_user)
):
    """
    Retorna um deal específico
    """
    deal = await db.deals.find_one({"_id": ObjectId(deal_id)})

    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    deal['id'] = str(deal.pop('_id'))
    return DealInDB(**deal)

@router.put("/deals/{deal_id}", response_model=DealInDB)
async def update_deal(
    deal_id: str,
    deal_update: DealUpdate,
    current_user: str = Depends(get_current_user)
):
    """
    Atualiza um deal
    """
    # Buscar deal atual
    existing_deal = await db.deals.find_one({"_id": ObjectId(deal_id)})
    if not existing_deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    update_data = {k: v for k, v in deal_update.dict(exclude_unset=True).items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()

    # Se mudou stage, atualizar stage_history
    if "stage" in update_data and update_data["stage"] != existing_deal["stage"]:
        # Close current stage
        stage_history = existing_deal.get("stage_history", [])
        if stage_history:
            last_entry = stage_history[-1]
            if not last_entry.get("exited_at"):
                last_entry["exited_at"] = datetime.utcnow()
                last_entry["duration_days"] = (datetime.utcnow() - last_entry["entered_at"]).days

        # Add new stage
        stage_history.append({
            "stage": update_data["stage"],
            "entered_at": datetime.utcnow()
        })
        update_data["stage_history"] = stage_history

    await db.deals.update_one(
        {"_id": ObjectId(deal_id)},
        {"$set": update_data}
    )

    updated_deal = await db.deals.find_one({"_id": ObjectId(deal_id)})
    updated_deal['id'] = str(updated_deal.pop('_id'))

    return DealInDB(**updated_deal)

@router.patch("/deals/{deal_id}/stage", response_model=DealInDB)
async def update_stage(
    deal_id: str,
    stage: str,
    current_user: str = Depends(get_current_user)
):
    """
    Atualiza apenas o stage do deal (para drag & drop no Kanban)
    """
    return await update_deal(
        deal_id,
        DealUpdate(stage=stage),
        current_user
    )

@router.post("/deals/{deal_id}/win")
async def mark_as_won(
    deal_id: str,
    current_user: str = Depends(get_current_user)
):
    """
    Marca deal como ganho
    """
    await db.deals.update_one(
        {"_id": ObjectId(deal_id)},
        {
            "$set": {
                "status": "won",
                "stage": "closed_won",
                "actual_close_date": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        }
    )

    return {"message": "Deal marked as won! 🎉"}

@router.post("/deals/{deal_id}/lose")
async def mark_as_lost(
    deal_id: str,
    lost_reason: str,
    current_user: str = Depends(get_current_user)
):
    """
    Marca deal como perdido
    """
    await db.deals.update_one(
        {"_id": ObjectId(deal_id)},
        {
            "$set": {
                "status": "lost",
                "stage": "closed_lost",
                "lost_reason": lost_reason,
                "actual_close_date": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        }
    )

    return {"message": "Deal marked as lost"}

@router.delete("/deals/{deal_id}")
async def delete_deal(
    deal_id: str,
    current_user: str = Depends(get_current_user)
):
    """
    Deleta um deal (soft delete)
    """
    result = await db.deals.update_one(
        {"_id": ObjectId(deal_id)},
        {
            "$set": {
                "deleted_at": datetime.utcnow(),
                "deleted_by": current_user
            }
        }
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Deal not found")

    return {"message": "Deal deleted successfully"}

# Pipeline Summary
@router.get("/deals/pipeline/summary")
async def get_pipeline_summary(
    current_user: str = Depends(get_current_user)
):
    """
    Retorna sumário do pipeline (para dashboard)
    """
    pipeline_data = await db.deals.aggregate([
        {"$match": {"status": "open"}},
        {"$group": {
            "_id": "$stage",
            "count": {"$sum": 1},
            "total_value": {"$sum": "$value"},
            "avg_probability": {"$avg": "$probability"}
        }}
    ]).to_list(length=None)

    return {
        "stages": pipeline_data,
        "total_open_deals": sum(s['count'] for s in pipeline_data),
        "total_pipeline_value": sum(s['total_value'] for s in pipeline_data)
    }
```

---

## 🧪 Business Logic

### Stage Probabilities (Default)

```python
STAGE_PROBABILITIES = {
    "qualification": 10,
    "proposal": 30,
    "negotiation": 60,
    "closed_won": 100,
    "closed_lost": 0
}
```

### Value Formatting

```python
def format_value(value_cents: int, currency: str = "BRL") -> str:
    """
    Formata valor monetário
    value_cents em centavos: 1000000 = R$ 10.000,00
    """
    value = value_cents / 100

    if currency == "BRL":
        return f"R$ {value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    elif currency == "USD":
        return f"$ {value:,.2f}"
    else:
        return f"{value:,.2f} {currency}"
```

---

## ✅ Critérios de Aceitação

- [ ] Schema MongoDB implementado
- [ ] CRUD completo funcionando
- [ ] Listagem com filtros (status, stage, owner, value range)
- [ ] Paginação e sorting
- [ ] Update de stage atualiza stage_history
- [ ] Endpoints de win/lose funcionam
- [ ] Pipeline summary funciona
- [ ] Validações de campos
- [ ] Soft delete implementado
- [ ] Indexes criados
- [ ] Testes unitários
- [ ] Documentação API (OpenAPI/Swagger)

---

## 🔗 Dependências

- ✅ Marco 005: Database & Backend Setup
- ✅ Marco 009: Lead Model (para conversão lead → deal)
- ⬜ Marco 020: Contact & Company Models (para relacionamentos)

---

**Status**: 🔵 Pronto para Implementação
**Estimativa**: 3 dias
**Prioridade**: 🔥 Alta (Core feature)
