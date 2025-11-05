"""
DealPredictor Agent - Predicts deal outcomes using AI
"""

import json
from typing import Dict, Any
from datetime import datetime
from app.agents.base import BaseAgent, ClaudeLLM


class DealPredictorAgent(BaseAgent):
    """
    Agent specialized in predicting deal outcomes

    Analyzes:
    - Deal stage and progression
    - Activity and engagement
    - Stakeholder involvement
    - Time in pipeline
    """

    SYSTEM_PROMPT = """You are an expert sales analyst specializing in deal forecasting.
Analyze deal data and provide accurate predictions about outcomes.
Consider multiple factors: engagement, timeline, stakeholders, activity patterns.
Output must be valid JSON."""

    PREDICTION_PROMPT = """Analyze this deal and provide predictions:

Deal Information:
- Title: {title}
- Value: ${value:,.2f} {currency}
- Current Stage: {stage}
- Days in Pipeline: {days_in_pipeline}
- Expected Close: {expected_close_date}

Activity Metrics:
- Total Activities: {activity_count}
- Last Activity: {last_activity_date}
- Engagement Score: {engagement_score}/100

Stakeholders:
- Number of Contacts: {contact_count}
- Decision Makers Involved: {decision_makers}

Provide analysis:
1. Win Probability (0-100%)
2. Health Score (0-100)
3. Predicted Close Date
4. Risk Factors (list)
5. Recommended Actions (list)
6. Reasoning

Output as JSON:
{{
  "win_probability": 75,
  "health_score": 80,
  "predicted_close_date": "2025-12-15",
  "risk_factors": ["...", "..."],
  "recommended_actions": ["...", "..."],
  "reasoning": "Detailed explanation..."
}}"""

    def __init__(self):
        super().__init__(
            name="DealPredictor",
            description="Predicts deal outcomes and provides insights",
            llm=ClaudeLLM(temperature=0.5, max_tokens=2000)
        )

    async def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Predict deal outcome

        Args:
            input_data: Dict with deal details and metrics

        Returns:
            Dict with predictions and insights
        """

        # Calculate days in pipeline
        created_at = input_data.get("created_at", datetime.utcnow())
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))

        days_in_pipeline = (datetime.utcnow() - created_at).days

        prompt = self.format_prompt(
            self.PREDICTION_PROMPT,
            title=input_data.get("title", "Untitled Deal"),
            value=input_data.get("value", 0),
            currency=input_data.get("currency", "USD"),
            stage=input_data.get("stage", "unknown"),
            days_in_pipeline=days_in_pipeline,
            expected_close_date=input_data.get("expected_close_date", "Not set"),
            activity_count=input_data.get("activity_count", 0),
            last_activity_date=input_data.get("last_activity_date", "Never"),
            engagement_score=input_data.get("engagement_score", 50),
            contact_count=input_data.get("contact_count", 0),
            decision_makers=input_data.get("decision_makers", 0)
        )

        response = await self.llm.generate(
            prompt=prompt,
            system=self.SYSTEM_PROMPT
        )

        try:
            result = json.loads(response)

            # Ensure all required fields exist
            result.setdefault("win_probability", 50)
            result.setdefault("health_score", 50)
            result.setdefault("risk_factors", [])
            result.setdefault("recommended_actions", [])

            return result

        except json.JSONDecodeError:
            # Fallback response
            return {
                "win_probability": 50,
                "health_score": 50,
                "predicted_close_date": input_data.get("expected_close_date"),
                "risk_factors": ["Unable to analyze - insufficient data"],
                "recommended_actions": ["Increase engagement", "Schedule follow-up"],
                "reasoning": "Analysis unavailable"
            }
