# Marco 031: Workflow Engine
> Backend - Sistema de automação de workflows | 5 dias

**Responsável**: Backend Dev
**Revisor**: Tech Lead
**Status**: 🔵 Planejado

---

## 🎯 Objetivo

Implementar sistema de workflows que automatiza processos repetitivos através de triggers (eventos) e actions (ações), com 3 workflows pré-configurados.

---

## 📋 Key Features

- **Trigger System**: Events (lead created, deal won, field updated)
- **Action Executor**: Send email, create task, update field, qualify lead
- **Condition Engine**: If-then logic
- **3 Pre-configured Workflows**
- **Execution History**: Logs de todas as execuções

---

## 🏗️ Workflow Structure

```javascript
{
  "name": "Auto-qualify new leads",
  "trigger": {
    "type": "entity_created",
    "entity_type": "lead"
  },
  "conditions": [
    {"field": "source", "operator": "equals", "value": "website_form"}
  ],
  "actions": [
    {
      "type": "qualify_lead",
      "delay": 0
    },
    {
      "type": "send_email",
      "template": "welcome_email",
      "delay": 300  // 5 minutes
    }
  ]
}
```

---

## 💻 Workflow Engine Implementation

```python
# src/services/workflow_engine.py

from typing import Dict, List, Optional
from datetime import datetime
from bson import ObjectId
from enum import Enum

class TriggerType(str, Enum):
    ENTITY_CREATED = "entity_created"
    FIELD_UPDATED = "field_updated"
    SCHEDULED = "scheduled"
    MANUAL = "manual"

class ActionType(str, Enum):
    QUALIFY_LEAD = "qualify_lead"
    SEND_EMAIL = "send_email"
    CREATE_TASK = "create_task"
    UPDATE_FIELD = "update_field"
    SEND_NOTIFICATION = "send_notification"
    ENRICH_LEAD = "enrich_lead"

class WorkflowEngine:
    """
    Engine que gerencia triggers e executa workflows
    """

    async def trigger_workflows(
        self,
        trigger_type: TriggerType,
        entity_type: str,
        entity_id: str,
        changes: Optional[Dict] = None
    ):
        """
        Dispara workflows baseados em trigger
        """
        # 1. Find matching workflows
        workflows = await db.workflows.find({
            "status": "active",
            "trigger.type": trigger_type,
            "trigger.entity_type": entity_type
        }).to_list(length=None)

        # 2. Get entity data
        entity = await self._get_entity(entity_type, entity_id)
        if not entity:
            return

        # 3. Execute each workflow
        for workflow in workflows:
            # Check conditions
            if not self._check_conditions(workflow.get('conditions', []), entity):
                continue

            # Create execution record
            execution_id = await self._create_execution(workflow['_id'], entity_type, entity_id)

            # Execute actions (async via Celery)
            from src.tasks.workflow_tasks import ExecuteWorkflowTask
            ExecuteWorkflowTask().delay(
                str(execution_id),
                str(workflow['_id']),
                entity_type,
                entity_id
            )

    def _check_conditions(self, conditions: List[Dict], entity: Dict) -> bool:
        """
        Verifica se entity satisfaz todas as condições
        """
        for condition in conditions:
            field = condition['field']
            operator = condition['operator']
            value = condition['value']

            entity_value = entity.get(field)

            if operator == 'equals' and entity_value != value:
                return False
            elif operator == 'not_equals' and entity_value == value:
                return False
            elif operator == 'contains' and value not in str(entity_value):
                return False
            elif operator == 'greater_than' and not (entity_value > value):
                return False
            elif operator == 'less_than' and not (entity_value < value):
                return False

        return True

    async def _get_entity(self, entity_type: str, entity_id: str) -> Optional[Dict]:
        """Get entity data"""
        collections = {
            'lead': db.leads,
            'deal': db.deals,
            'contact': db.contacts
        }

        collection = collections.get(entity_type)
        if not collection:
            return None

        return await collection.find_one({"_id": ObjectId(entity_id)})

    async def _create_execution(self, workflow_id: ObjectId, entity_type: str, entity_id: ObjectId) -> ObjectId:
        """Cria registro de execução"""
        execution = {
            'workflow_id': workflow_id,
            'triggered_by_entity_type': entity_type,
            'triggered_by_entity_id': entity_id,
            'triggered_at': datetime.utcnow(),
            'status': 'pending',
            'actions_executed': []
        }

        result = await db.workflow_executions.insert_one(execution)
        return result.inserted_id

    async def execute_actions(
        self,
        execution_id: str,
        workflow_id: str,
        entity_type: str,
        entity_id: str
    ):
        """
        Executa ações de um workflow
        """
        # Get workflow
        workflow = await db.workflows.find_one({"_id": ObjectId(workflow_id)})
        if not workflow:
            return

        # Update execution status
        await db.workflow_executions.update_one(
            {"_id": ObjectId(execution_id)},
            {"$set": {"status": "running", "started_at": datetime.utcnow()}}
        )

        # Execute each action
        for action in workflow['actions']:
            try:
                # Apply delay if specified
                if action.get('delay', 0) > 0:
                    import time
                    time.sleep(action['delay'])

                # Execute action
                result = await self._execute_action(action, entity_type, entity_id)

                # Log action
                await db.workflow_executions.update_one(
                    {"_id": ObjectId(execution_id)},
                    {
                        "$push": {
                            "actions_executed": {
                                "action_type": action['type'],
                                "status": "success",
                                "result": result,
                                "executed_at": datetime.utcnow()
                            }
                        }
                    }
                )

            except Exception as e:
                # Log failure
                await db.workflow_executions.update_one(
                    {"_id": ObjectId(execution_id)},
                    {
                        "$push": {
                            "actions_executed": {
                                "action_type": action['type'],
                                "status": "failed",
                                "error": str(e),
                                "executed_at": datetime.utcnow()
                            }
                        }
                    }
                )

        # Mark execution as completed
        await db.workflow_executions.update_one(
            {"_id": ObjectId(execution_id)},
            {"$set": {"status": "completed", "completed_at": datetime.utcnow()}}
        )

        # Update workflow statistics
        await db.workflows.update_one(
            {"_id": ObjectId(workflow_id)},
            {
                "$inc": {"execution_count": 1, "success_count": 1},
                "$set": {"last_executed_at": datetime.utcnow()}
            }
        )

    async def _execute_action(self, action: Dict, entity_type: str, entity_id: str) -> Dict:
        """
        Executa uma ação específica
        """
        action_type = action['type']

        if action_type == 'qualify_lead':
            return await self._action_qualify_lead(entity_id)

        elif action_type == 'send_email':
            return await self._action_send_email(action, entity_type, entity_id)

        elif action_type == 'create_task':
            return await self._action_create_task(action, entity_type, entity_id)

        elif action_type == 'update_field':
            return await self._action_update_field(action, entity_type, entity_id)

        elif action_type == 'enrich_lead':
            return await self._action_enrich_lead(entity_id)

        else:
            raise ValueError(f"Unknown action type: {action_type}")

    async def _action_qualify_lead(self, lead_id: str) -> Dict:
        """Action: Qualify lead with AI"""
        from src.tasks.qualification_tasks import QualifyLeadTask
        QualifyLeadTask().delay(lead_id)
        return {"status": "queued"}

    async def _action_send_email(self, action: Dict, entity_type: str, entity_id: str) -> Dict:
        """Action: Send email"""
        # Get entity
        entity = await self._get_entity(entity_type, entity_id)
        if not entity or not entity.get('email'):
            return {"status": "skipped", "reason": "no_email"}

        # Send email (via email service)
        # TODO: Implement email sending
        return {"status": "sent"}

    async def _action_create_task(self, action: Dict, entity_type: str, entity_id: str) -> Dict:
        """Action: Create task"""
        task = {
            'title': action.get('title', 'Follow-up'),
            'entity_type': entity_type,
            'entity_id': ObjectId(entity_id),
            'created_at': datetime.utcnow()
        }
        result = await db.tasks.insert_one(task)
        return {"task_id": str(result.inserted_id)}

    async def _action_update_field(self, action: Dict, entity_type: str, entity_id: str) -> Dict:
        """Action: Update field"""
        field = action.get('field')
        value = action.get('value')

        collections = {'lead': db.leads, 'deal': db.deals, 'contact': db.contacts}
        collection = collections.get(entity_type)

        if collection:
            await collection.update_one(
                {"_id": ObjectId(entity_id)},
                {"$set": {field: value}}
            )

        return {"field": field, "value": value}

    async def _action_enrich_lead(self, lead_id: str) -> Dict:
        """Action: Enrich lead"""
        from src.tasks.enrichment_tasks import EnrichLeadTask
        EnrichLeadTask().delay(lead_id)
        return {"status": "queued"}
```

---

## 🔧 Pre-configured Workflows

### 1. Auto-qualify New Leads

```python
{
    "name": "Auto-qualify new leads from website",
    "description": "Automatically qualify leads that come from website forms",
    "trigger": {
        "type": "entity_created",
        "entity_type": "lead"
    },
    "conditions": [
        {"field": "source", "operator": "equals", "value": "website_form"}
    ],
    "actions": [
        {"type": "qualify_lead"},
        {"type": "enrich_lead", "delay": 60}
    ],
    "status": "active"
}
```

### 2. Follow-up Stale Deals

```python
{
    "name": "Follow-up on stale deals",
    "description": "Create task when deal has no activity for 7 days",
    "trigger": {
        "type": "scheduled",
        "schedule": "0 9 * * *"  # Daily at 9am
    },
    "conditions": [
        {"field": "last_activity_days_ago", "operator": "greater_than", "value": 7},
        {"field": "status", "operator": "equals", "value": "open"}
    ],
    "actions": [
        {
            "type": "create_task",
            "title": "Follow-up on stale deal",
            "priority": "high"
        }
    ],
    "status": "active"
}
```

### 3. Congratulate Won Deals

```python
{
    "name": "Congratulate on deal won",
    "description": "Send notification when deal is won",
    "trigger": {
        "type": "field_updated",
        "entity_type": "deal",
        "field": "status"
    },
    "conditions": [
        {"field": "status", "operator": "equals", "value": "won"}
    ],
    "actions": [
        {
            "type": "send_notification",
            "message": "🎉 Congratulations! Deal won!"
        }
    ],
    "status": "active"
}
```

---

## 🔌 API Endpoints

```python
# src/api/routes/workflows.py

@router.get("/workflows")
async def list_workflows():
    """List all workflows"""
    workflows = await db.workflows.find().to_list(length=None)
    return [
        {
            "id": str(w['_id']),
            "name": w['name'],
            "status": w['status'],
            "execution_count": w.get('execution_count', 0)
        }
        for w in workflows
    ]

@router.post("/workflows")
async def create_workflow(workflow: Dict):
    """Create workflow"""
    result = await db.workflows.insert_one(workflow)
    return {"id": str(result.inserted_id)}

@router.put("/workflows/{id}/activate")
async def activate_workflow(id: str):
    """Activate workflow"""
    await db.workflows.update_one(
        {"_id": ObjectId(id)},
        {"$set": {"status": "active"}}
    )
    return {"status": "activated"}

@router.put("/workflows/{id}/pause")
async def pause_workflow(id: str):
    """Pause workflow"""
    await db.workflows.update_one(
        {"_id": ObjectId(id)},
        {"$set": {"status": "paused"}}
    )
    return {"status": "paused"}

@router.get("/workflows/{id}/executions")
async def get_workflow_executions(id: str, limit: int = 20):
    """Get execution history"""
    executions = await db.workflow_executions.find({
        "workflow_id": ObjectId(id)
    }).sort("triggered_at", -1).limit(limit).to_list(length=limit)

    return [
        {
            "id": str(e['_id']),
            "status": e['status'],
            "triggered_at": e['triggered_at'],
            "actions_count": len(e.get('actions_executed', []))
        }
        for e in executions
    ]
```

---

## ✅ Critérios de Aceitação

- [ ] Workflow engine funciona
- [ ] Triggers detectam eventos corretamente
- [ ] Conditions são avaliadas
- [ ] Actions são executadas
- [ ] 3 workflows pré-configurados ativos
- [ ] Execution history é salva
- [ ] Delay entre actions funciona
- [ ] Error handling robusto
- [ ] API CRUD de workflows funciona
- [ ] Testes unitários

---

## 🔗 Dependências

- ✅ Marco 012: LeadQualifier_Agent (qualify_lead action)
- ✅ Marco 013: Enrichment Pipeline (enrich_lead action)
- ✅ Celery para background tasks

---

**Status**: 🔵 Pronto para Implementação
**Estimativa**: 5 dias
**Prioridade**: 🔥 Alta (Automação core)
