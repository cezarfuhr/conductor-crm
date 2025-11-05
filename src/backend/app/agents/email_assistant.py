"""
EmailAssistant Agent - Generates sales emails using AI
"""

import json
from typing import Dict, Any
from app.agents.base import BaseAgent, ClaudeLLM


class EmailAssistantAgent(BaseAgent):
    """
    Agent specialized in generating sales emails

    Generates 3 email variations:
    - Formal: Professional and detailed
    - Casual: Friendly and conversational
    - Direct: Brief and to the point
    """

    SYSTEM_PROMPT = """You are a professional sales email writer.
Generate compelling, personalized sales emails that drive engagement.
Focus on value proposition and clear calls-to-action.
Output must be valid JSON."""

    EMAIL_GENERATION_PROMPT = """Generate 3 sales email variations for this lead:

Lead Information:
- Name: {lead_name}
- Company: {company}
- Job Title: {job_title}
- Context: {context}

Generate 3 variations:
1. FORMAL: Professional, detailed, emphasizes expertise
2. CASUAL: Friendly, conversational, builds relationship
3. DIRECT: Brief, value-focused, clear CTA

For each variation, provide:
- subject: Email subject line (max 60 chars)
- body: Email body (3-5 paragraphs)
- tone: Description of tone used

Output as JSON:
{{
  "variations": [
    {{
      "type": "formal",
      "subject": "...",
      "body": "...",
      "tone": "..."
    }},
    {{
      "type": "casual",
      "subject": "...",
      "body": "...",
      "tone": "..."
    }},
    {{
      "type": "direct",
      "subject": "...",
      "body": "...",
      "tone": "..."
    }}
  ]
}}"""

    def __init__(self):
        super().__init__(
            name="EmailAssistant",
            description="Generates personalized sales emails",
            llm=ClaudeLLM(temperature=0.8, max_tokens=3000)
        )

    async def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate email variations

        Args:
            input_data: Dict with lead_name, company, job_title, context

        Returns:
            Dict with variations list
        """

        prompt = self.format_prompt(
            self.EMAIL_GENERATION_PROMPT,
            lead_name=input_data.get("lead_name", "there"),
            company=input_data.get("company", "your company"),
            job_title=input_data.get("job_title", ""),
            context=input_data.get("context", "initial outreach")
        )

        response = await self.llm.generate(
            prompt=prompt,
            system=self.SYSTEM_PROMPT
        )

        # Parse JSON response
        try:
            result = json.loads(response)
            return result
        except json.JSONDecodeError:
            # Fallback if JSON parsing fails
            return {
                "variations": [
                    {
                        "type": "formal",
                        "subject": f"Partnership Opportunity with {input_data.get('company', 'Your Company')}",
                        "body": response[:500],
                        "tone": "professional"
                    }
                ]
            }

    async def generate_subject_lines(self, context: str, count: int = 5) -> list[str]:
        """Generate subject line options"""

        prompt = f"""Generate {count} engaging email subject lines for: {context}

Output as JSON array of strings:
["Subject 1", "Subject 2", ...]"""

        response = await self.llm.generate(prompt=prompt)

        try:
            return json.loads(response)
        except:
            return [f"Re: {context}"]
