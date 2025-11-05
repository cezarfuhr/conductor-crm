# CRM Plugins for Conductor

This directory contains private CRM-specific agents and tools that extend Conductor's capabilities.

## Structure

```
plugins/crm/
├── plugin.yaml           # Plugin metadata
├── agents/               # CRM AI Agents
│   ├── lead_qualifier.py
│   ├── email_assistant.py
│   └── deal_predictor.py
└── tools/                # CRM Tools
    ├── database.py
    ├── enrichment.py
    └── email_sender.py
```

## Available Agents

### 1. LeadQualifier_Agent
Automatically qualifies leads using AI based on:
- Company information
- Lead behavior
- Historical data

### 2. EmailAssistant_Agent
Composes personalized emails using:
- Contact context
- Deal stage
- Previous interactions

### 3. DealPredictor_Agent
Predicts deal outcomes using:
- Historical patterns
- Current engagement
- Competitor analysis

## Available Tools

### 1. CRMDatabaseTool
Access to CRM database operations

### 2. EnrichmentTool
Enriches lead data from external sources

### 3. EmailSenderTool
Sends emails through configured email service

## Development

To add a new agent:

1. Create file in `agents/`
2. Add to `plugin.yaml`
3. Restart conductor-api container

See `/project-management/new-features/CRM_IMPLEMENTATION_EXAMPLES.md` for detailed examples.
