# 🔄 AI Migration to Conductor Gateway - Status & Next Steps

**Date:** 2025-11-06
**Status:** ✅ Phase 1 Complete - Code Cleanup & Architecture Preparation
**Next Phase:** Implementation of AIOrchestrator & Gateway Integration

---

## 📋 What Was Done

### ✅ Phase 1: Cleanup & Preparation (COMPLETED)

#### 1. Removed Internal AI Agent Code
- ❌ **Deleted:** `src/backend/app/agents/` directory (Python code)
  - `base.py` - Base agent framework
  - `email_assistant.py` - Email generation agent
  - `lead_qualifier.py` - Lead qualification agent
  - `deal_predictor.py` - Deal prediction agent

#### 2. Created External Agent Definitions
- ✅ **Created:** `conductor-agents/` directory with persona files
  - `EmailAssistant_CRM_Agent/persona.md` (2,000+ lines)
  - `LeadQualifier_CRM_Agent/persona.md` (3,000+ lines)
  - `DealPredictor_CRM_Agent/persona.md` (4,000+ lines)

**Agent personas include:**
- Detailed role & personality
- Input/output formats (JSON schemas)
- Operating procedures & frameworks (BANT, email writing, forecasting)
- Rules, constraints, and best practices
- Example outputs
- Context awareness guidelines

#### 3. Updated CRM Backend Endpoints
- ✅ **Modified:** `src/backend/app/api/v1/endpoints/ai.py`
  - Removed direct agent instantiation
  - Added migration warnings (HTTP 503 responses)
  - Documented future architecture with TODO comments
  - Preserved business logic (lead/deal data fetching)
  - Added placeholders for AIOrchestrator integration

#### 4. Configured Docker Compose
- ✅ **Created:** `docker-compose.yml` with 3-tier architecture
  - **Tier 1:** Conductor API Engine (port 8000)
  - **Tier 2:** Conductor Gateway (ports 5006, 8006)
  - **Tier 3:** CRM Backend (port 8001)
  - **Support:** Redis (port 6379)
  - **Note:** MongoDB is external (not in compose)

#### 5. Analyzed Conductor Submodules
- ✅ **Identified:** `ConductorClient` in conductor-gateway
  - Located at: `conductor/conductor-gateway/src/clients/conductor_client.py`
  - Purpose: HTTP proxy to Conductor API
  - Key method: `execute_agent(agent_name, prompt, instance_id, ...)`

---

## 🏗️ New Architecture (AI-First)

```
┌────────────────────────────────────────────────────────────────┐
│                    USER INTERACTS WITH CRM                      │
└────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────────────┐
│              CRM FRONTEND (Angular) - Port 4200                 │
│  - Lead management UI                                           │
│  - Deal pipeline view                                           │
│  - Email generation interface                                   │
│  - Real-time AI streaming (SSE)                                 │
└─────────────────────────┬──────────────────────────────────────┘
                          │ HTTP/SSE
                          ▼
┌────────────────────────────────────────────────────────────────┐
│           CRM BACKEND (FastAPI) - Port 8001                     │
│  - Business logic (CRUD, validation)                            │
│  - AIOrchestrator (TODO: Implement)                             │
│  - Notifications                                                │
│  - User management                                              │
│  - MongoDB: CRM data (users, leads, deals)                      │
└─────────────────────────┬──────────────────────────────────────┘
                          │ HTTP
                          ▼
┌────────────────────────────────────────────────────────────────┐
│        CONDUCTOR GATEWAY (BFF) - Ports 5006/8006                │
│  - REST API + SSE streaming                                     │
│  - Job queue for async execution                                │
│  - Screenplay/Persona management                                │
│  - MongoDB: Gateway data (screenplays, personas, history)       │
│  - MCP Server (port 8006)                                       │
└─────────────────────────┬──────────────────────────────────────┘
                          │ HTTP Proxy
                          ▼
┌────────────────────────────────────────────────────────────────┐
│        CONDUCTOR API ENGINE (AI Core) - Port 8000               │
│  - Agent discovery & loading                                    │
│  - Prompt engineering & context building                        │
│  - LLM provider abstraction (Claude, Gemini, etc.)              │
│  - Conversation history management                              │
│  - MongoDB: Agent definitions & state                           │
└─────────────────────────┬──────────────────────────────────────┘
                          │
                          ▼
                  ┌───────────────┐
                  │  LLM Providers │
                  │  - Claude      │
                  │  - Gemini      │
                  │  - Cursor      │
                  └───────────────┘
```

---

## 🚀 Next Steps: Phase 2 Implementation

### Step 1: Create AIOrchestrator Service

**File:** `src/backend/app/services/ai_orchestrator.py`

```python
"""
AIOrchestrator - Bridge between CRM and Conductor Gateway
"""
import httpx
from app.core.config import settings

class AIOrchestrator:
    def __init__(self):
        self.gateway_url = settings.CONDUCTOR_GATEWAY_URL
        self.client = httpx.AsyncClient(timeout=600)

    async def generate_email(self, lead_name: str, company: str, context: str, tone: str):
        """Generate email via EmailAssistant_CRM_Agent"""
        # POST to http://conductor-gateway:5006/api/execute
        ...

    async def qualify_lead(self, lead_id: str, lead_data: dict):
        """Qualify lead via LeadQualifier_CRM_Agent"""
        ...

    async def predict_deal(self, deal_id: str, deal_data: dict):
        """Predict deal via DealPredictor_CRM_Agent"""
        ...

    async def stream_execute(self, agent_name: str, payload: dict):
        """Start async execution and return SSE stream URL"""
        # POST to /api/v1/stream-execute
        # Returns job_id for SSE connection
        ...
```

### Step 2: Update CRM Backend Settings

**File:** `src/backend/app/core/config.py`

Add:
```python
# Conductor Gateway integration
CONDUCTOR_GATEWAY_URL: str = "http://localhost:5006"
CONDUCTOR_API_URL: str = "http://localhost:8000"
```

### Step 3: Implement AI Endpoints

**File:** `src/backend/app/api/v1/endpoints/ai.py`

Replace HTTP 503 responses with actual AIOrchestrator calls:
- Uncomment TODO sections
- Add orchestrator dependency injection
- Implement error handling
- Add notification triggers

### Step 4: Create Agent Definitions in Conductor

**Agent Creation (user must do this):**

```bash
# Option 1: Manual creation via Conductor CLI
cd conductor/conductor
conductor create-agent EmailAssistant_CRM_Agent

# Option 2: Use Gateway API
curl -X POST http://localhost:5006/api/agents \
  -H "Content-Type: application/json" \
  -d @conductor-agents/EmailAssistant_CRM_Agent/definition.json

# Copy persona files
cp conductor-agents/EmailAssistant_CRM_Agent/persona.md \
   .conductor_workspace/agents/EmailAssistant_CRM_Agent/
```

### Step 5: Frontend Integration (Optional)

**File:** `src/frontend/src/app/services/conductor-ai.service.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class ConductorAIService {
  streamEmailGeneration(lead: Lead): Observable<EmailStreamEvent> {
    // Connect to SSE stream via CRM Backend or directly to Gateway
    ...
  }
}
```

---

## 📊 Migration Status by Component

| Component | Status | Notes |
|-----------|--------|-------|
| **Agent Python Code** | ✅ Removed | Deleted `app/agents/` directory |
| **Agent Personas** | ✅ Created | 3 MD files in `conductor-agents/` |
| **AI Endpoints** | ⚠️ Disabled | Return HTTP 503 with migration message |
| **AIOrchestrator** | ❌ TODO | Service not yet implemented |
| **Docker Compose** | ✅ Configured | Ready for deployment |
| **Conductor Submodules** | ✅ Analyzed | Gateway client identified |
| **Documentation** | ✅ Updated | This file created |
| **Requirements.txt** | ⚠️ Pending | Need to remove `anthropic` dependency |
| **Frontend** | ❌ TODO | No AI integration yet (was never implemented) |

---

## ⚠️ Deprecated Documentation

The following docs reference the OLD architecture with internal agents:

1. **`docs/CONDUCTOR_INTEGRATION.md`**
   - ⚠️ Contains examples of internal agent usage
   - 🔄 Update needed: Change examples to Gateway integration

2. **`docs/PHASE_3_IMPLEMENTATION.md`**
   - ⚠️ Describes internal agent framework (`app/agents/base.py`)
   - 🔄 Update needed: Add note about migration to Conductor

3. **`docs/LOCAL_DEVELOPMENT.md`**
   - ⚠️ May reference running agents locally
   - 🔄 Update needed: Add docker-compose instructions

**Action Required:** Add migration notes to these files or create new "AI Architecture" doc.

---

## 🔧 Configuration Requirements

### Environment Variables (CRM Backend)

**New variables to add to `.env`:**
```bash
# Conductor Integration
CONDUCTOR_GATEWAY_URL=http://localhost:5006
CONDUCTOR_API_URL=http://localhost:8000

# Keep existing (for direct usage if needed)
CLAUDE_API_KEY=sk-ant-your-api-key
```

### Docker Compose Usage

**Start services:**
```bash
# Ensure MongoDB is running externally
# Set .env variables
docker-compose up -d

# Check health
curl http://localhost:8000/health  # Conductor API
curl http://localhost:5006/health  # Gateway
curl http://localhost:8001/health  # CRM Backend
```

**View logs:**
```bash
docker-compose logs -f conductor-api
docker-compose logs -f conductor-gateway
docker-compose logs -f crm-backend
```

---

## 📝 Testing Migration

### 1. Test Conductor API Directly
```bash
# List agents
curl http://localhost:8000/agents

# Execute agent
curl -X POST http://localhost:8000/conductor/execute \
  -H "Content-Type: application/json" \
  -d '{
    "agent_name": "EmailAssistant_CRM_Agent",
    "prompt": "Generate email for John at Acme Corp",
    "context_mode": "stateless"
  }'
```

### 2. Test Gateway
```bash
# List agents via Gateway
curl http://localhost:5006/api/agents

# Execute via Gateway
curl -X POST http://localhost:5006/api/execute \
  -H "Content-Type: application/json" \
  -d '{
    "agent_name": "EmailAssistant_CRM_Agent",
    "input_text": "Generate email for John at Acme Corp"
  }'
```

### 3. Test CRM AI Endpoints (After Implementation)
```bash
# Should work after AIOrchestrator is implemented
curl -X POST http://localhost:8001/api/v1/ai/email/generate \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "lead_id": "507f1f77bcf86cd799439011",
    "context": "initial outreach",
    "tone": "professional"
  }'
```

---

## 🎯 Success Criteria

Migration is complete when:

✅ Phase 1: Cleanup (DONE)
- [x] Internal agent code removed
- [x] Agent personas created
- [x] Endpoints marked as migrating
- [x] Docker compose configured

⬜ Phase 2: Implementation (PENDING)
- [ ] AIOrchestrator service implemented
- [ ] AI endpoints functional via Gateway
- [ ] Streaming support (SSE) working
- [ ] Error handling robust
- [ ] Tests passing

⬜ Phase 3: Integration (PENDING)
- [ ] Frontend consuming AI APIs
- [ ] Real-time streaming in UI
- [ ] Agent definitions loaded in Conductor
- [ ] Conversation history persisting

⬜ Phase 4: Documentation (PENDING)
- [ ] Updated all docs to reflect new architecture
- [ ] API documentation complete
- [ ] Deployment guide created
- [ ] Migration guide for users

---

## 💡 Benefits of New Architecture

### Before (Hardcoded Agents)
- ❌ AI logic tightly coupled to CRM
- ❌ No conversation history management
- ❌ Manual LLM provider switching
- ❌ No streaming support
- ❌ Difficult to test agents independently
- ❌ No agent reusability across projects

### After (Conductor Gateway)
- ✅ AI agents external, loosely coupled
- ✅ Automatic conversation history
- ✅ Multi-provider LLM support (Claude, Gemini, etc.)
- ✅ Native SSE streaming
- ✅ Easy agent testing via CLI or Gateway
- ✅ Agents reusable in other projects
- ✅ MCP server for tool integration
- ✅ Living Documents support (conductor-web)

---

## 📚 Additional Resources

- **Conductor Docs:** [Conductor GitHub](https://github.com/primoia/conductor)
- **Gateway Docs:** [Conductor Gateway](https://github.com/primoia/conductor-gateway)
- **Agent Personas:** See `conductor-agents/` directory
- **Docker Compose:** Root `docker-compose.yml`

---

**Next Action:** Implement AIOrchestrator service and integrate with Conductor Gateway

**Owner:** Development Team
**Priority:** High
**Estimated Effort:** 2-3 days
