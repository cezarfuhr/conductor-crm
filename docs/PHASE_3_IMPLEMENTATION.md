# Phase 3 Implementation - Intelligence Layer

## Overview

Phase 3 implements the AI-powered intelligence layer that differentiates Conductor CRM with automated email generation, lead qualification, deal prediction, and enrichment capabilities.

**Status:** ✅ Core AI Agents Implemented
**Marcos:** 012, 013, 024, 027 (partial 025-026, 028-031 pending)
**Estimated Time:** 34 days total

---

## Implemented Marcos

### ✅ Marco 024: EmailAssistant_Agent v1 (5 days)

**AI Agent for Sales Email Generation**

Generates personalized sales emails in 3 variations:
- **Formal**: Professional, detailed, expertise-focused
- **Casual**: Friendly, conversational, relationship-building
- **Direct**: Brief, value-focused, clear CTA

**Features:**
- Context-aware generation
- Subject line optimization
- Temperature: 0.8 (creative)
- Max tokens: 3000
- JSON-structured output

**Endpoint:**
```http
POST /api/v1/ai/email/generate
{
  "lead_id": "507f1f77bcf86cd799439011",
  "context": "Follow-up after demo"
}
```

**Response:**
```json
{
  "lead_id": "...",
  "variations": [
    {
      "type": "formal",
      "subject": "Partnership Opportunity with Acme Corp",
      "body": "Dear John,\n\nI hope this email finds you well...",
      "tone": "professional and detailed"
    },
    {
      "type": "casual",
      "subject": "Quick follow-up from our chat",
      "body": "Hi John,\n\nGreat chatting with you yesterday...",
      "tone": "friendly and conversational"
    },
    {
      "type": "direct",
      "subject": "Next steps for Acme",
      "body": "John,\n\nThree ways we can help Acme...",
      "tone": "brief and action-oriented"
    }
  ]
}
```

---

### ✅ Marco 027: DealPredictor_Agent v1 (5 days)

**AI Agent for Deal Outcome Prediction**

Analyzes deals and provides:
- Win probability (0-100%)
- Health score (0-100)
- Predicted close date
- Risk factors
- Recommended actions

**Analysis Factors:**
- Deal stage and progression
- Days in pipeline
- Activity count and recency
- Engagement metrics
- Stakeholder involvement
- Decision maker count

**Features:**
- Temperature: 0.5 (analytical)
- BANT-style assessment
- Actionable recommendations
- Updates deal with AI insights

**Endpoint:**
```http
POST /api/v1/ai/deal/predict
{
  "deal_id": "507f1f77bcf86cd799439011"
}
```

**Response:**
```json
{
  "deal_id": "...",
  "win_probability": 75,
  "health_score": 80,
  "predicted_close_date": "2025-12-15",
  "risk_factors": [
    "Low engagement in past 14 days",
    "No decision maker identified"
  ],
  "recommended_actions": [
    "Schedule follow-up call",
    "Identify decision maker",
    "Send ROI analysis"
  ],
  "reasoning": "Deal shows strong initial interest..."
}
```

---

### ✅ Marco 012: LeadQualifier_Agent v1 (5 days)

**AI Agent for Lead Qualification**

Qualifies leads using BANT framework:
- **Budget**: Financial capacity
- **Authority**: Decision-making power
- **Need**: Problem/pain point
- **Timeline**: Urgency

**Features:**
- Score calculation (0-100)
- Auto-classification (Hot >70, Warm 40-70, Cold <40)
- Enrichment data integration
- Next action recommendations
- Updates lead automatically

**Endpoint:**
```http
POST /api/v1/ai/lead/qualify
{
  "lead_id": "507f1f77bcf86cd799439011"
}
```

**Response:**
```json
{
  "lead_id": "...",
  "score": 85,
  "classification": "Hot",
  "reasoning": "Director-level contact at enterprise company...",
  "next_actions": [
    "Schedule discovery call",
    "Send product overview",
    "Research company initiatives"
  ],
  "bant": {
    "budget": "Likely has budget (enterprise company)",
    "authority": "Director level - decision maker",
    "need": "Indicated interest via website",
    "timeline": "Immediate (inbound lead)"
  }
}
```

---

### ✅ Marco 013: Auto-Enrichment Pipeline (3 days)

**Clearbit Integration for Data Enrichment**

Enriches leads and companies with:
- Person data (title, role, seniority, social)
- Company data (industry, size, revenue, tech stack)
- Location and contact info
- Logo and description

**EnrichmentService Features:**
- Async HTTP client
- 10-second timeout
- Error handling with logging
- Data normalization
- Company size categorization

**Methods:**
```python
await enrichment_service.enrich_person(email)
await enrichment_service.enrich_company(domain)
```

**Enrichment Data Structure:**
```json
{
  "person": {
    "name": "John Doe",
    "title": "VP of Sales",
    "role": "sales",
    "seniority": "executive",
    "linkedin": "johndoe",
    "location": "San Francisco"
  },
  "company": {
    "name": "Acme Corp",
    "domain": "acme.com",
    "industry": "Software",
    "size": "enterprise",
    "employees": 5000,
    "revenue": 500000000,
    "tech_stack": ["Salesforce", "HubSpot"],
    "logo": "https://logo.clearbit.com/acme.com"
  }
}
```

---

## Architecture

### AI Agent Pattern

```
Client Request
    ↓
API Endpoint
    ↓
Fetch Entity (Lead/Deal)
    ↓
Prepare Agent Input
    ↓
AI Agent.run()
    ↓
LLM (Claude)
    ↓
Parse Response (JSON)
    ↓
Update Database
    ↓
Return Result
```

### Agent Base Class

```python
class BaseAgent:
    - name
    - description
    - llm (ClaudeLLM)

    @abstractmethod
    async def run(input_data) -> dict
```

### LLM Wrapper

```python
class ClaudeLLM:
    - model (claude-3-5-sonnet)
    - temperature
    - max_tokens

    async def generate(prompt, system) -> str
```

---

## API Endpoints

### AI Routes

All endpoints require authentication (JWT Bearer token):

```
POST /api/v1/ai/email/generate   - Generate email variations
POST /api/v1/ai/lead/qualify     - Qualify and score lead
POST /api/v1/ai/deal/predict     - Predict deal outcome
GET  /api/v1/ai/health           - Check AI services health
```

### Authentication

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Error Responses

```json
{
  "detail": "Lead not found"
}
```

**Status Codes:**
- 200: Success
- 401: Unauthorized
- 403: Forbidden (not owner)
- 404: Entity not found
- 500: Internal server error

---

## Configuration

### Environment Variables

```bash
# Claude API (Primary)
CLAUDE_API_KEY=sk-ant-xxx
CLAUDE_MODEL=claude-3-5-sonnet-20241022

# Clearbit Enrichment
CLEARBIT_API_KEY=sk_xxx

# Optional: OpenAI (Backup)
OPENAI_API_KEY=sk-xxx
```

### Agent Configuration

```python
# Email generation
EmailAssistantAgent(
    temperature=0.8,  # Creative
    max_tokens=3000
)

# Deal prediction
DealPredictorAgent(
    temperature=0.5,  # Analytical
    max_tokens=2000
)

# Lead qualification
LeadQualifierAgent(
    temperature=0.7,  # Balanced
    max_tokens=2000
)
```

---

## Database Updates

### Lead Qualification

When lead is qualified, updates:
```javascript
{
  score: 85,
  classification: "Hot",
  qualification_reasoning: "...",
  next_actions: ["...", "..."],
  qualified_at: ISODate("2025-11-05"),
  status: "qualified"
}
```

### Deal Prediction

When deal is predicted, updates:
```javascript
{
  ai_insights: {
    win_probability: 75,
    health_score: 80,
    predicted_close_date: "2025-12-15",
    risk_factors: ["..."],
    recommended_actions: ["..."],
    last_analysis: "2025-11-05T12:00:00Z"
  },
  ai_score: 80,
  risk_factors: ["...", "..."]
}
```

---

## Usage Examples

### 1. Qualify New Lead

```python
# When lead is created
lead_id = "507f1f77bcf86cd799439011"

# Call qualification
response = await client.post(
    "/api/v1/ai/lead/qualify",
    json={"lead_id": lead_id},
    headers={"Authorization": f"Bearer {token}"}
)

# Lead is automatically updated with:
# - score, classification, reasoning, next_actions
```

### 2. Generate Follow-up Email

```python
# For existing lead
response = await client.post(
    "/api/v1/ai/email/generate",
    json={
        "lead_id": lead_id,
        "context": "Follow-up after pricing discussion"
    }
)

# Get 3 variations to choose from
variations = response.json()["variations"]
```

### 3. Analyze Deal Health

```python
# For deal in pipeline
response = await client.post(
    "/api/v1/ai/deal/predict",
    json={"deal_id": deal_id}
)

# Deal is updated with AI insights
# Dashboard shows health score and recommendations
```

---

## Pending Marcos (To be implemented)

### Marco 025: Email Composer UI (4 days)
- Angular component for email composition
- Tabs for 3 variations
- WYSIWYG editor (Quill.js)
- Send integration

### Marco 026: Email Tracking (3 days)
- Tracking pixel for opens
- Link click tracking
- Engagement score calculation

### Marco 028: Deal Intelligence UI (3 days)
- Health score visualization
- Win probability gauge
- Risk alerts display

### Marco 029: Dashboard Principal (4 days)
- Metrics cards
- Pipeline chart
- Recent activities
- Top deals widget

### Marco 030: AI Copilot Chat (5 days)
- Chat interface
- WebSocket connection
- Natural language queries
- Quick actions

### Marco 031: Workflow Engine (5 days)
- Trigger system
- Action executor
- Pre-configured workflows

---

## Performance

### Response Times

- Email Generation: ~3-5 seconds
- Lead Qualification: ~2-3 seconds
- Deal Prediction: ~2-4 seconds
- Enrichment: ~1-2 seconds

### Rate Limiting

Claude API limits:
- Tier 1: 50 requests/min
- Tier 2: 1000 requests/min

### Caching

Consider caching:
- Enrichment data (1 hour TTL)
- Agent responses for same input
- Company data lookups

---

## Testing

### Manual Testing

```bash
# Start backend
cd src/backend
uvicorn app.main:app --reload

# Test with curl
curl -X POST http://localhost:8000/api/v1/ai/lead/qualify \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"lead_id": "..."}'
```

### Swagger UI

Access interactive docs:
```
http://localhost:8000/docs
```

Navigate to **ai** tag for all AI endpoints.

---

## Monitoring

### Logging

All agents log:
- Input data received
- LLM calls made
- Response parsing
- Errors and warnings

```python
logger.info(f"Agent {self.name} processing request")
logger.error(f"Enrichment error: {str(e)}")
```

### Health Check

```http
GET /api/v1/ai/health

Response:
{
  "status": "healthy",
  "agents": {
    "EmailAssistant": "available",
    "LeadQualifier": "available",
    "DealPredictor": "available"
  }
}
```

---

## Best Practices

### Prompt Engineering

1. **System Prompts**: Set role and constraints
2. **Structured Output**: Always request JSON
3. **Context**: Provide relevant information
4. **Examples**: Include in-context examples for better results
5. **Temperature**: Adjust for task (0.5 analytical, 0.8 creative)

### Error Handling

```python
try:
    result = json.loads(response)
except json.JSONDecodeError:
    # Fallback response
    return default_response
```

### Security

- Validate user ownership before calling agents
- Never expose API keys in responses
- Sanitize input data
- Rate limit AI endpoints

---

## Next Steps

1. **Background Jobs (Celery)**
   - Auto-qualify leads on creation
   - Periodic enrichment updates
   - Scheduled deal health checks

2. **Frontend Integration**
   - Email composer with AI
   - Deal intelligence dashboard
   - Lead qualification UI

3. **Advanced Features**
   - Custom prompts per user
   - Agent fine-tuning
   - Multi-agent workflows

---

**Last Updated:** 2025-11-05
**Phase Status:** 🟢 Core AI Agents Implemented
**Next:** Frontend UI + Background jobs + Workflow engine
