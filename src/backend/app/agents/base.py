"""
AI Agents module - Conductor-based agents for CRM intelligence
"""

from typing import Optional, Dict, Any, List
from abc import ABC, abstractmethod
import anthropic
from app.core.config import settings


class BaseLLM:
    """Base LLM wrapper"""

    async def generate(self, prompt: str, **kwargs) -> str:
        """Generate text from prompt"""
        raise NotImplementedError


class ClaudeLLM(BaseLLM):
    """Claude LLM wrapper using Anthropic API"""

    def __init__(
        self,
        model: str = None,
        temperature: float = 0.7,
        max_tokens: int = 2000
    ):
        self.model = model or settings.CLAUDE_MODEL
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.client = anthropic.Anthropic(api_key=settings.CLAUDE_API_KEY)

    async def generate(self, prompt: str, system: Optional[str] = None) -> str:
        """Generate text using Claude"""

        messages = [{"role": "user", "content": prompt}]

        kwargs = {
            "model": self.model,
            "max_tokens": self.max_tokens,
            "temperature": self.temperature,
            "messages": messages
        }

        if system:
            kwargs["system"] = system

        response = self.client.messages.create(**kwargs)

        return response.content[0].text


class BaseAgent(ABC):
    """Base agent class for all AI agents"""

    def __init__(
        self,
        name: str,
        description: str,
        llm: Optional[BaseLLM] = None,
        temperature: float = 0.7
    ):
        self.name = name
        self.description = description
        self.llm = llm or ClaudeLLM(temperature=temperature)

    @abstractmethod
    async def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute agent logic"""
        pass

    def format_prompt(self, template: str, **kwargs) -> str:
        """Format prompt template with variables"""
        return template.format(**kwargs)
