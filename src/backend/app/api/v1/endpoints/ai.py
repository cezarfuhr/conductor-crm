"""
AI endpoints - AI agent operations
"""

from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel
from typing import Optional, Dict, Any

from app.database import get_database
from app.dependencies import get_current_active_user
from app.models.user import User
from app.agents import EmailAssistantAgent, DealPredictorAgent, LeadQualifierAgent
from app.services.lead_service import LeadService
from app.services.deal_service import DealService

router = APIRouter()


# Request/Response models
class EmailGenerationRequest(BaseModel):
    lead_id: str
    context: Optional[str] = "initial outreach"


class LeadQualificationRequest(BaseModel):
    lead_id: str


class DealPredictionRequest(BaseModel):
    deal_id: str


# Email Generation
@router.post("/email/generate")
async def generate_email(
    request: EmailGenerationRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Generate email variations for a lead using AI

    Returns 3 variations: formal, casual, direct
    """

    # Get lead
    lead_service = LeadService(db)
    lead = await lead_service.get_lead(request.lead_id)

    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    if str(lead.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    # Prepare agent input
    agent_input = {
        "lead_name": lead.name,
        "company": lead.company or "your company",
        "job_title": lead.job_title or "",
        "context": request.context
    }

    # Generate emails
    agent = EmailAssistantAgent()
    result = await agent.run(agent_input)

    return {
        "lead_id": request.lead_id,
        "variations": result.get("variations", []),
        "agent": "EmailAssistant"
    }


# Lead Qualification
@router.post("/lead/qualify")
async def qualify_lead(
    request: LeadQualificationRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Qualify a lead using AI

    Returns: score, classification, reasoning, next actions
    """

    # Get lead
    lead_service = LeadService(db)
    lead = await lead_service.get_lead(request.lead_id)

    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    if str(lead.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    # Prepare agent input
    agent_input = {
        "name": lead.name,
        "email": lead.email,
        "company": lead.company,
        "job_title": lead.job_title,
        "source": lead.source,
        "enrichment_data": lead.enrichment_data
    }

    # Qualify lead
    agent = LeadQualifierAgent()
    result = await agent.run(agent_input)

    # Update lead with qualification
    await lead_service.qualify_lead(
        lead_id=request.lead_id,
        score=result["score"],
        classification=result["classification"],
        reasoning=result["reasoning"],
        next_actions=result.get("next_actions", [])
    )

    return {
        "lead_id": request.lead_id,
        "score": result["score"],
        "classification": result["classification"],
        "reasoning": result["reasoning"],
        "next_actions": result.get("next_actions", []),
        "bant": result.get("bant", {}),
        "agent": "LeadQualifier"
    }


# Deal Prediction
@router.post("/deal/predict")
async def predict_deal(
    request: DealPredictionRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Predict deal outcome using AI

    Returns: win probability, health score, predictions, recommendations
    """

    # Get deal
    deal_service = DealService(db)
    deal = await deal_service.get_deal(request.deal_id)

    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    if str(deal.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    # Get activity count (simplified - would query activities collection)
    activity_count = 0  # TODO: Query activities

    # Prepare agent input
    agent_input = {
        "title": deal.title,
        "value": deal.value,
        "currency": deal.currency,
        "stage": deal.stage,
        "created_at": deal.created_at,
        "expected_close_date": str(deal.expected_close_date) if deal.expected_close_date else "Not set",
        "activity_count": activity_count,
        "last_activity_date": "Unknown",  # TODO: Get from activities
        "engagement_score": 50,  # TODO: Calculate
        "contact_count": len(deal.contact_ids),
        "decision_makers": 0  # TODO: Calculate from contacts
    }

    # Predict deal outcome
    agent = DealPredictorAgent()
    result = await agent.run(agent_input)

    # Update deal with AI insights
    ai_insights = {
        "win_probability": result["win_probability"],
        "health_score": result["health_score"],
        "predicted_close_date": result.get("predicted_close_date"),
        "risk_factors": result.get("risk_factors", []),
        "recommended_actions": result.get("recommended_actions", []),
        "last_analysis": str(deal.updated_at)
    }

    from datetime import datetime
    await db.deals.update_one(
        {"_id": deal.id},
        {
            "$set": {
                "ai_insights": ai_insights,
                "ai_score": result["health_score"],
                "risk_factors": result.get("risk_factors", []),
                "updated_at": datetime.utcnow()
            }
        }
    )

    return {
        "deal_id": request.deal_id,
        "win_probability": result["win_probability"],
        "health_score": result["health_score"],
        "predicted_close_date": result.get("predicted_close_date"),
        "risk_factors": result.get("risk_factors", []),
        "recommended_actions": result.get("recommended_actions", []),
        "reasoning": result.get("reasoning", ""),
        "agent": "DealPredictor"
    }


@router.get("/health")
async def ai_health():
    """Check AI services health"""
    return {
        "status": "healthy",
        "agents": {
            "EmailAssistant": "available",
            "LeadQualifier": "available",
            "DealPredictor": "available"
        }
    }
