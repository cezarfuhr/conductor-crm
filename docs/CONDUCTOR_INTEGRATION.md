# Conductor Framework Integration

## Overview

Conductor CRM uses the **Conductor** framework from PrimoIA as its AI orchestration layer. Conductor is an agentic AI framework that enables building reliable, context-aware AI agents with minimal code.

## Architecture

```
Conductor CRM
├── Backend (FastAPI)
│   ├── AI Agents (using Conductor)
│   │   ├── LeadQualifier_Agent
│   │   ├── EmailAssistant_Agent
│   │   ├── DealPredictor_Agent
│   │   └── Copilot_Agent
│   └── REST API
├── Frontend (Angular)
└── Conductor Core (Submodules)
    ├── conductor/         # Core framework
    ├── conductor-gateway/ # API gateway
    └── conductor-web/     # Web interface
```

## Submodules

The project includes three Conductor submodules:

### 1. conductor/conductor
- **URL**: https://github.com/primoia/conductor.git
- **Purpose**: Core AI agent framework
- **Used for**: Building AI agents with LLM orchestration

### 2. conductor/conductor-gateway
- **URL**: https://github.com/primoia/conductor-gateway.git
- **Purpose**: API gateway for Conductor
- **Used for**: Routing requests to agents

### 3. conductor/conductor-web
- **URL**: https://github.com/primoia/conductor-web.git
- **Purpose**: Web UI for Conductor
- **Used for**: Debugging and monitoring agents (optional)

## Setup

### Initialize Submodules

```bash
# Initialize all submodules
git submodule init
git submodule update

# Or use the setup script
./scripts/setup-dev.sh
```

### Update Submodules

```bash
# Update to latest version
git submodule update --remote

# Update specific submodule
git submodule update --remote conductor/conductor
```

## Integration with FastAPI Backend

### Installation

The Conductor framework is used as a Python library in our FastAPI backend:

```python
# requirements.txt
conductor-ai>=0.1.0  # Core framework
```

### Basic Usage

```python
from conductor import Agent, AgentConfig, ClaudeLLM

# Configure LLM
llm = ClaudeLLM(
    model="claude-3-5-sonnet-20241022",
    api_key=os.getenv("CLAUDE_API_KEY"),
    temperature=0.7,
    max_tokens=2000
)

# Create agent
class LeadQualifierAgent(Agent):
    """Agent that qualifies leads based on context"""

    def __init__(self):
        config = AgentConfig(
            name="LeadQualifier",
            description="Qualifies leads and assigns scores",
            llm=llm,
            tools=[get_company_info, calculate_score]
        )
        super().__init__(config)

    async def qualify(self, lead_data: dict) -> dict:
        prompt = f"""
        Qualify this lead and provide a score (0-100):

        Name: {lead_data['name']}
        Company: {lead_data['company']}
        Email: {lead_data['email']}
        Source: {lead_data['source']}
        """

        result = await self.run(prompt)
        return result
```

### Agent Examples

#### 1. Lead Qualifier Agent

```python
# app/agents/lead_qualifier.py

from conductor import Agent, Tool
from app.services.clearbit import enrich_company

class LeadQualifierAgent(Agent):
    @Tool(name="enrich_company")
    async def enrich(self, domain: str):
        """Enriches company data using Clearbit"""
        return await enrich_company(domain)

    async def qualify_lead(self, lead: dict):
        """Main qualification logic"""
        prompt = """
        Analyze this lead and provide:
        1. Score (0-100)
        2. Classification (Hot/Warm/Cold)
        3. Reasoning
        4. Next actions

        Lead data: {lead}
        """
        return await self.run(prompt)
```

#### 2. Email Assistant Agent

```python
# app/agents/email_assistant.py

from conductor import Agent

class EmailAssistantAgent(Agent):
    async def generate_email(self, context: dict):
        """Generates 3 email variations"""
        prompt = """
        Generate 3 email variations for this context:

        Lead: {context['lead_name']}
        Company: {context['company']}
        Deal context: {context['deal_context']}

        Provide:
        1. Formal variation
        2. Casual variation
        3. Direct variation

        Include subject lines for each.
        """
        return await self.run(prompt)
```

## Configuration

### Environment Variables

```bash
# .env
CLAUDE_API_KEY=sk-ant-xxx
CLAUDE_MODEL=claude-3-5-sonnet-20241022
OPENAI_API_KEY=sk-xxx  # Backup LLM
```

### Agent Configuration

```python
# app/core/config.py

AGENT_CONFIGS = {
    "lead_qualifier": {
        "model": "claude-3-5-sonnet-20241022",
        "temperature": 0.7,
        "max_tokens": 2000,
        "timeout": 30
    },
    "email_assistant": {
        "model": "claude-3-5-sonnet-20241022",
        "temperature": 0.8,
        "max_tokens": 2000,
        "timeout": 30
    },
    "deal_predictor": {
        "model": "claude-3-5-sonnet-20241022",
        "temperature": 0.5,
        "max_tokens": 1500,
        "timeout": 30
    }
}
```

## Monitoring

### Conductor Web UI (Optional)

For debugging and monitoring agents:

```bash
# Start Conductor Web
cd conductor/conductor-web
npm install
npm start

# Access at http://localhost:3000
```

### Logging

```python
import logging

# Enable Conductor debug logs
logging.getLogger("conductor").setLevel(logging.DEBUG)

# In agent code
logger = logging.getLogger(__name__)
logger.info(f"Agent {self.name} processing request")
```

## Best Practices

### 1. Error Handling

```python
from conductor.exceptions import AgentError, LLMError

try:
    result = await agent.run(prompt)
except LLMError as e:
    # LLM API failed
    logger.error(f"LLM error: {e}")
    # Fallback logic
except AgentError as e:
    # Agent execution failed
    logger.error(f"Agent error: {e}")
```

### 2. Caching

```python
from conductor.cache import cache_result

class MyAgent(Agent):
    @cache_result(ttl=3600)  # Cache for 1 hour
    async def expensive_operation(self, input: str):
        return await self.run(input)
```

### 3. Rate Limiting

```python
from conductor.ratelimit import RateLimiter

rate_limiter = RateLimiter(
    max_requests=100,
    time_window=60  # 100 requests per minute
)

await rate_limiter.acquire()
result = await agent.run(prompt)
```

### 4. Prompt Engineering

```python
# Use structured prompts
LEAD_QUALIFICATION_PROMPT = """
You are a sales lead qualifier. Analyze the provided lead data and output JSON.

Input:
{lead_data}

Output format:
{{
    "score": 0-100,
    "classification": "Hot|Warm|Cold",
    "reasoning": "Brief explanation",
    "next_actions": ["action1", "action2"]
}}

Rules:
- Score > 70: Hot lead
- Score 40-70: Warm lead
- Score < 40: Cold lead
"""
```

## Testing

### Unit Tests

```python
import pytest
from app.agents.lead_qualifier import LeadQualifierAgent

@pytest.mark.asyncio
async def test_lead_qualifier():
    agent = LeadQualifierAgent()

    lead_data = {
        "name": "John Doe",
        "company": "Acme Corp",
        "email": "john@acme.com",
        "source": "website"
    }

    result = await agent.qualify_lead(lead_data)

    assert "score" in result
    assert 0 <= result["score"] <= 100
    assert result["classification"] in ["Hot", "Warm", "Cold"]
```

### Mock LLM for Testing

```python
from conductor.testing import MockLLM

@pytest.fixture
def mock_llm():
    return MockLLM(
        responses={
            "qualify": {"score": 85, "classification": "Hot"}
        }
    )

async def test_with_mock(mock_llm):
    agent = LeadQualifierAgent(llm=mock_llm)
    result = await agent.qualify_lead({})
    assert result["score"] == 85
```

## Troubleshooting

### Common Issues

**Issue: Submodule not initialized**
```bash
git submodule update --init --recursive
```

**Issue: LLM API timeout**
```python
# Increase timeout
llm = ClaudeLLM(
    timeout=60  # 60 seconds
)
```

**Issue: Token limit exceeded**
```python
# Reduce max_tokens or use summarization
llm = ClaudeLLM(
    max_tokens=2000  # Reduced from 4096
)
```

## Resources

- [Conductor GitHub](https://github.com/primoia/conductor)
- [Conductor Documentation](https://conductor.primoia.com/docs)
- [Claude API Docs](https://docs.anthropic.com)
- [OpenAI API Docs](https://platform.openai.com/docs)

## Support

For issues related to:
- **Conductor framework**: Create issue on Conductor GitHub
- **Integration with CRM**: Contact Tech Lead
- **API keys**: Contact DevOps

---

**Last Updated**: 2025-11-05
