"""
LeadQualifier Agent - Qualifies leads using AI
"""

import json
from typing import Dict, Any
from app.agents.base import BaseAgent, ClaudeLLM


class LeadQualifierAgent(BaseAgent):
    """
    Agent specialized in qualifying leads

    Analyzes:
    - Company fit (industry, size)
    - Contact seniority
    - Lead source quality
    - Engagement indicators
    """

    SYSTEM_PROMPT = """You are an expert sales development representative specializing in lead qualification.
Analyze lead data and provide accurate qualification scores and recommendations.
Use BANT framework (Budget, Authority, Need, Timeline) when applicable.
Output must be valid JSON."""

    QUALIFICATION_PROMPT = """Qualify this lead and provide recommendations:

Lead Information:
- Name: {name}
- Email: {email}
- Company: {company}
- Job Title: {job_title}
- Source: {source}

Enrichment Data (if available):
{enrichment_summary}

Provide qualification:
1. Score (0-100): Overall lead quality
2. Classification: Hot (>70), Warm (40-70), Cold (<40)
3. Reasoning: Why this score?
4. Next Actions: 3-5 recommended actions
5. BANT Assessment: Budget, Authority, Need, Timeline indicators

Output as JSON:
{{
  "score": 85,
  "classification": "Hot",
  "reasoning": "Detailed explanation of score...",
  "next_actions": ["Action 1", "Action 2", "Action 3"],
  "bant": {{
    "budget": "Likely has budget (enterprise company)",
    "authority": "Director level - decision maker",
    "need": "Indicated interest via website",
    "timeline": "Immediate (inbound lead)"
  }}
}}"""

    def __init__(self):
        super().__init__(
            name="LeadQualifier",
            description="Qualifies leads and provides recommendations",
            llm=ClaudeLLM(temperature=0.7, max_tokens=2000)
        )

    async def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Qualify lead

        Args:
            input_data: Dict with lead details

        Returns:
            Dict with score, classification, reasoning, next_actions
        """

        # Format enrichment data summary
        enrichment = input_data.get("enrichment_data", {})
        enrichment_summary = "Not available"

        if enrichment:
            enrichment_summary = f"""
- Industry: {enrichment.get('industry', 'Unknown')}
- Company Size: {enrichment.get('company_size', 'Unknown')}
- Revenue: {enrichment.get('revenue', 'Unknown')}
- Tech Stack: {enrichment.get('tech_stack', 'Unknown')}
"""

        prompt = self.format_prompt(
            self.QUALIFICATION_PROMPT,
            name=input_data.get("name", "Unknown"),
            email=input_data.get("email", ""),
            company=input_data.get("company", "Unknown"),
            job_title=input_data.get("job_title", "Unknown"),
            source=input_data.get("source", "unknown"),
            enrichment_summary=enrichment_summary
        )

        response = await self.llm.generate(
            prompt=prompt,
            system=self.SYSTEM_PROMPT
        )

        try:
            result = json.loads(response)

            # Validate score
            score = result.get("score", 50)
            if not 0 <= score <= 100:
                score = 50

            # Ensure classification matches score
            if score > 70:
                classification = "Hot"
            elif score >= 40:
                classification = "Warm"
            else:
                classification = "Cold"

            result["score"] = score
            result["classification"] = classification
            result.setdefault("next_actions", ["Schedule call", "Send introduction email"])

            return result

        except json.JSONDecodeError:
            # Fallback response
            return {
                "score": 50,
                "classification": "Warm",
                "reasoning": "Unable to fully analyze lead. Requires manual review.",
                "next_actions": [
                    "Review lead manually",
                    "Research company",
                    "Schedule discovery call"
                ],
                "bant": {
                    "budget": "Unknown",
                    "authority": "To be determined",
                    "need": "To be qualified",
                    "timeline": "Unknown"
                }
            }
