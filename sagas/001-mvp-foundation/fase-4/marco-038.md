# Marco 038: Documentation
> Documentação completa para usuários e desenvolvedores | 3 dias

**Responsável**: Product Manager + Designer
**Revisor**: Tech Lead
**Status**: 🔵 Planejado

---

## 🎯 Objetivo

Criar documentação completa incluindo help center para usuários, API docs para desenvolvedores, onboarding guides, e video tutorials.

---

## 📋 Documentation Types

### 1. User Documentation (Help Center)

**Structure:**
```
help/
├── getting-started/
│   ├── quick-start.md
│   ├── first-steps.md
│   └── dashboard-overview.md
├── leads/
│   ├── creating-leads.md
│   ├── importing-leads.md
│   ├── qualifying-leads.md
│   └── converting-to-deals.md
├── deals/
│   ├── managing-pipeline.md
│   ├── deal-stages.md
│   └── forecasting.md
├── ai-features/
│   ├── email-assistant.md
│   ├── deal-predictor.md
│   └── copilot-chat.md
├── integrations/
│   ├── gmail-setup.md
│   ├── calendar-sync.md
│   └── api-keys.md
└── faq.md
```

**Example Article:**
```markdown
# Creating Your First Lead

Leads are potential customers who have shown interest in your product.

## Quick Steps

1. Click the **+ New Lead** button in the top right
2. Fill in the lead information:
   - Name (required)
   - Email (required)
   - Company
   - Job Title
3. Click **Save**

## Auto-Qualification

Once created, the AI will automatically:
- Qualify the lead (score 0-100)
- Assign a classification (Hot/Warm/Cold)
- Suggest next actions

## Video Tutorial

[▶️ Watch: Creating and Qualifying Leads (2:30)](video-url)

## Related Articles
- [Importing Leads from CSV](importing-leads.md)
- [Understanding Lead Scores](lead-scores.md)
```

---

### 2. API Documentation

**Auto-Generated with FastAPI/Swagger:**

```python
# main.py - OpenAPI configuration

app = FastAPI(
    title="Conductor CRM API",
    description="AI-First CRM API for managing leads, deals, and customer relationships",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# Add tags for organization
tags_metadata = [
    {
        "name": "leads",
        "description": "Operations with leads",
    },
    {
        "name": "deals",
        "description": "Manage deals and pipeline",
    },
    {
        "name": "ai",
        "description": "AI-powered features",
    }
]

app = FastAPI(openapi_tags=tags_metadata)
```

**Custom API Docs Page:**
```html
<!-- api-docs.component.html -->

<div class="api-docs">
  <h1>API Documentation</h1>

  <section class="auth-section">
    <h2>Authentication</h2>
    <p>All API requests require authentication using API keys.</p>
    <pre><code>
Authorization: Bearer YOUR_API_KEY
    </code></pre>
  </section>

  <section class="endpoints">
    <h2>Endpoints</h2>

    <div class="endpoint">
      <h3>GET /api/v1/leads</h3>
      <p>List all leads with filtering and pagination</p>
      <h4>Query Parameters</h4>
      <ul>
        <li><code>status</code> - Filter by status (new, contacted, qualified)</li>
        <li><code>classification</code> - Filter by classification (hot, warm, cold)</li>
        <li><code>skip</code> - Pagination offset (default: 0)</li>
        <li><code>limit</code> - Items per page (default: 50, max: 100)</li>
      </ul>

      <h4>Example Response</h4>
      <pre><code class="language-json">
{
  "leads": [
    {
      "id": "123",
      "name": "John Doe",
      "email": "john@acme.com",
      "qualification_score": 85,
      "classification": "hot"
    }
  ],
  "total": 42,
  "page": 1
}
      </code></pre>
    </div>
  </section>
</div>
```

---

### 3. Onboarding Guide

**In-App Onboarding:**
```typescript
// src/app/features/onboarding/onboarding.service.ts

export class OnboardingService {
  private steps = [
    {
      element: '#dashboard',
      title: 'Welcome to Conductor CRM! 👋',
      content: 'This is your dashboard where you see key metrics.',
      position: 'bottom'
    },
    {
      element: '#create-lead-btn',
      title: 'Create Your First Lead',
      content: 'Click here to add a new lead to your pipeline.',
      position: 'bottom'
    },
    {
      element: '#ai-copilot',
      title: 'Meet Your AI Copilot',
      content: 'Ask questions or get help anytime with our AI assistant.',
      position: 'left'
    }
  ];

  startTour(): void {
    // Use library like intro.js or shepherd.js
    const tour = new Shepherd.Tour({
      useModalOverlay: true
    });

    this.steps.forEach(step => {
      tour.addStep({
        id: step.element,
        text: `<h3>${step.title}</h3><p>${step.content}</p>`,
        attachTo: {
          element: step.element,
          on: step.position
        },
        buttons: [
          {
            text: 'Next',
            action: tour.next
          }
        ]
      });
    });

    tour.start();
  }
}
```

**Welcome Checklist:**
```html
<mat-card class="onboarding-checklist" *ngIf="!completed">
  <mat-card-header>
    <mat-card-title>Get Started with Conductor CRM</mat-card-title>
    <mat-icon (click)="dismiss()">close</mat-icon>
  </mat-card-header>

  <mat-card-content>
    <mat-checkbox [checked]="tasks.profile" (change)="completeTask('profile')">
      Complete your profile
    </mat-checkbox>
    <mat-checkbox [checked]="tasks.firstLead" (change)="completeTask('firstLead')">
      Create your first lead
    </mat-checkbox>
    <mat-checkbox [checked]="tasks.gmailConnect" (change)="completeTask('gmailConnect')">
      Connect Gmail
    </mat-checkbox>
    <mat-checkbox [checked]="tasks.firstDeal" (change)="completeTask('firstDeal')">
      Create your first deal
    </mat-checkbox>
    <mat-checkbox [checked]="tasks.aiEmail" (change)="completeTask('aiEmail')">
      Generate an email with AI
    </mat-checkbox>
  </mat-card-content>

  <mat-card-actions>
    <mat-progress-bar [value]="completionPercentage"></mat-progress-bar>
    <span>{{ completedCount }}/5 completed</span>
  </mat-card-actions>
</mat-card>
```

---

### 4. Video Tutorials

**Tutorial Topics:**
1. **Getting Started (5 min)**
   - Overview of Conductor CRM
   - Creating your first lead
   - Understanding the dashboard

2. **AI Features (7 min)**
   - Using the Email Assistant
   - Understanding lead qualification
   - Working with AI predictions

3. **Integrations (4 min)**
   - Connecting Gmail
   - Syncing Google Calendar
   - Email tracking

4. **Pipeline Management (6 min)**
   - Creating and managing deals
   - Using the Kanban board
   - Forecasting with AI

**Embedding Videos:**
```html
<div class="video-container">
  <h2>Getting Started with Conductor CRM</h2>
  <iframe
    width="560"
    height="315"
    src="https://www.youtube.com/embed/VIDEO_ID"
    frameborder="0"
    allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
    allowfullscreen>
  </iframe>

  <div class="video-description">
    <p>Learn the basics of Conductor CRM in under 5 minutes.</p>
    <ul>
      <li>0:00 - Dashboard overview</li>
      <li>1:30 - Creating leads</li>
      <li>3:00 - AI qualification</li>
      <li>4:00 - Next steps</li>
    </ul>
  </div>
</div>
```

---

### 5. FAQ Section

**Common Questions:**

```markdown
# Frequently Asked Questions

## General

**Q: What is Conductor CRM?**
A: Conductor is an AI-first CRM designed for small and medium businesses,
   featuring intelligent lead qualification, email generation, and sales forecasting.

**Q: Is my data secure?**
A: Yes, all data is encrypted at rest and in transit. We use industry-standard
   security practices.

## AI Features

**Q: How does AI lead qualification work?**
A: Our AI analyzes multiple signals (job title, company size, engagement)
   to score leads 0-100 and classify them as Hot, Warm, or Cold.

**Q: Can I override AI suggestions?**
A: Absolutely! AI provides recommendations, but you always have final control.

## Integrations

**Q: Which email providers are supported?**
A: Currently Gmail. Outlook support coming soon.

**Q: Does calendar sync work both ways?**
A: Yes! Events created in the CRM appear in Google Calendar and vice versa.

## Pricing

**Q: Is there a free trial?**
A: Yes! 14-day free trial, no credit card required.

**Q: Can I cancel anytime?**
A: Yes, cancel anytime from your account settings.
```

---

## 📁 Documentation Structure

```
docs/
├── user-guide/
│   ├── index.md
│   ├── getting-started/
│   ├── features/
│   └── integrations/
├── api/
│   ├── overview.md
│   ├── authentication.md
│   ├── endpoints/
│   └── examples/
├── videos/
│   ├── getting-started.md
│   ├── ai-features.md
│   └── integrations.md
└── faq.md
```

---

## ✅ Deliverables

- [ ] Help center com 20+ artigos
- [ ] API documentation (Swagger/Redoc)
- [ ] In-app onboarding tour
- [ ] Welcome checklist
- [ ] 4 video tutorials
- [ ] FAQ section
- [ ] Search functionality em docs
- [ ] Mobile-friendly docs

---

**Status**: 🔵 Pronto para Implementação
**Estimativa**: 3 dias
