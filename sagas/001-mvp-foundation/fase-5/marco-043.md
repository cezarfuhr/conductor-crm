# Marco 043: Analytics & Feedback

**Fase:** 5 - Deploy, Testing & Launch
**Duração Estimada:** 2 dias
**Prioridade:** Alta
**Dependências:** Marco 041 (Deploy), Marco 042 (Monitoring)

---

## Objetivo

Implementar Google Analytics 4 (GA4) para rastreamento de uso da aplicação e métricas de produto, criar sistema in-app para coletar feedback dos usuários, garantir compliance com LGPD/GDPR através de consent management, e configurar dashboards para análise de comportamento e tomada de decisões baseadas em dados.

---

## Contexto

Analytics e feedback são essenciais para:
- **Entender comportamento**: Como usuários usam o produto
- **Medir engajamento**: Features mais/menos usadas
- **Detectar problemas**: Onde usuários travam/desistem
- **Validar hipóteses**: A/B tests, feature adoption
- **Coletar feedback**: Sugestões e bugs direto dos usuários

**Ferramentas:**
- **Google Analytics 4**: User analytics, events, funnels
- **In-app Feedback Widget**: Formulário simples
- **Cookie Consent**: Compliance LGPD/GDPR

**Métricas Chave:**
- DAU/MAU (Daily/Monthly Active Users)
- Feature adoption rate
- Retention (D1, D7, D30)
- Session duration
- Conversion funnels

---

## Implementação

### 1. Google Analytics 4 Setup

**Criar Property:**

1. Acesse https://analytics.google.com
2. Admin > Create Property
3. Nome: "Conductor CRM"
4. Timezone: America/Sao_Paulo
5. Currency: BRL
6. Create **Web** Data Stream
7. URL: https://conductor-crm.com
8. Copiar **Measurement ID** (ex: G-XXXXXXXXXX)

---

### 2. GA4 Integration - Frontend

**Instalar SDK:**

```bash
npm install @angular/fire
npm install firebase
```

**Configurar Firebase/GA4:**

**Arquivo:** `frontend/src/environments/environment.prod.ts`

```typescript
export const environment = {
  production: true,
  name: 'production',
  apiUrl: 'https://api.conductor-crm.com',

  // Firebase/GA4
  firebase: {
    measurementId: 'G-XXXXXXXXXX',
  },

  // Outras configs...
};
```

**Inicializar GA4:**

**Arquivo:** `frontend/src/app/core/analytics.service.ts`

```typescript
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

declare let gtag: Function;

@Injectable({
  providedIn: 'root',
})
export class AnalyticsService {
  private initialized = false;

  constructor() {
    this.initializeGA4();
  }

  private initializeGA4() {
    if (!environment.firebase.measurementId) {
      console.warn('⚠️  GA4 Measurement ID not configured');
      return;
    }

    // Carregar gtag.js dinamicamente
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${environment.firebase.measurementId}`;
    script.async = true;
    document.head.appendChild(script);

    // Inicializar gtag
    script.onload = () => {
      (window as any).dataLayer = (window as any).dataLayer || [];
      gtag = function () {
        (window as any).dataLayer.push(arguments);
      };
      gtag('js', new Date());
      gtag('config', environment.firebase.measurementId, {
        send_page_view: false, // Controle manual
      });

      this.initialized = true;
      console.log('✅ GA4 initialized');
    };
  }

  /**
   * Track page view
   */
  trackPageView(url: string, title?: string) {
    if (!this.initialized) return;

    gtag('event', 'page_view', {
      page_path: url,
      page_title: title,
    });
  }

  /**
   * Track custom event
   */
  trackEvent(
    eventName: string,
    parameters?: {
      [key: string]: any;
    }
  ) {
    if (!this.initialized) return;

    gtag('event', eventName, parameters);
  }

  /**
   * Set user properties
   */
  setUser(userId: string, properties?: { [key: string]: any }) {
    if (!this.initialized) return;

    gtag('config', environment.firebase.measurementId, {
      user_id: userId,
      ...properties,
    });
  }

  /**
   * Track timing (performance)
   */
  trackTiming(name: string, value: number, category?: string) {
    this.trackEvent('timing_complete', {
      name,
      value,
      event_category: category,
    });
  }
}
```

---

### 3. Eventos Customizados - Tracking

**Arquivo:** `frontend/src/app/core/analytics-events.ts`

```typescript
/**
 * Define todos os eventos customizados rastreados
 */

export const AnalyticsEvents = {
  // Autenticação
  LOGIN: 'login',
  LOGOUT: 'logout',
  SIGNUP: 'sign_up',

  // Leads
  LEAD_CREATED: 'lead_created',
  LEAD_VIEWED: 'lead_viewed',
  LEAD_UPDATED: 'lead_updated',
  LEAD_DELETED: 'lead_deleted',
  LEAD_QUALIFIED: 'lead_qualified',

  // Deals
  DEAL_CREATED: 'deal_created',
  DEAL_VIEWED: 'deal_viewed',
  DEAL_UPDATED: 'deal_updated',
  DEAL_STAGE_CHANGED: 'deal_stage_changed',
  DEAL_WON: 'deal_won',
  DEAL_LOST: 'deal_lost',

  // AI Features
  AI_EMAIL_GENERATED: 'ai_email_generated',
  AI_EMAIL_SENT: 'ai_email_sent',
  AI_DEAL_PREDICTION: 'ai_deal_prediction',
  AI_COPILOT_QUERY: 'ai_copilot_query',

  // Activities
  ACTIVITY_CREATED: 'activity_created',
  EMAIL_OPENED: 'email_opened',
  EMAIL_CLICKED: 'email_clicked',

  // Workflows
  WORKFLOW_CREATED: 'workflow_created',
  WORKFLOW_EXECUTED: 'workflow_executed',

  // Settings
  INTEGRATION_CONNECTED: 'integration_connected',
  INTEGRATION_DISCONNECTED: 'integration_disconnected',

  // Engagement
  SEARCH_PERFORMED: 'search',
  EXPORT_PERFORMED: 'export',
  FILTER_APPLIED: 'filter_applied',
} as const;
```

**Uso nos componentes:**

**Exemplo:** `frontend/src/app/pages/leads/leads.component.ts`

```typescript
import { Component } from '@angular/core';
import { AnalyticsService } from '../../core/analytics.service';
import { AnalyticsEvents } from '../../core/analytics-events';

@Component({
  selector: 'app-leads',
  templateUrl: './leads.component.html',
})
export class LeadsComponent {
  constructor(private analytics: AnalyticsService) {}

  createLead(leadData: any) {
    this.leadService.create(leadData).subscribe({
      next: (lead) => {
        // Track evento
        this.analytics.trackEvent(AnalyticsEvents.LEAD_CREATED, {
          lead_id: lead.id,
          source: lead.source,
          value_category: this.getValueCategory(lead.value),
        });

        this.toastService.success('Lead criado!');
      },
    });
  }

  private getValueCategory(value: number): string {
    if (value < 1000) return 'low';
    if (value < 10000) return 'medium';
    return 'high';
  }
}
```

---

### 4. Page View Tracking

**Auto-track navigation:**

**Arquivo:** `frontend/src/app/app.component.ts`

```typescript
import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AnalyticsService } from './core/analytics.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {
  constructor(
    private router: Router,
    private analytics: AnalyticsService
  ) {}

  ngOnInit() {
    // Track page views automaticamente
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.analytics.trackPageView(event.urlAfterRedirects);
      });
  }
}
```

---

### 5. In-App Feedback Widget

**Component:**

**Arquivo:** `frontend/src/app/shared/components/feedback-widget/feedback-widget.component.ts`

```typescript
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FeedbackService } from '../../../services/feedback.service';
import { AnalyticsService } from '../../../core/analytics.service';

@Component({
  selector: 'app-feedback-widget',
  templateUrl: './feedback-widget.component.html',
  styleUrls: ['./feedback-widget.component.scss'],
})
export class FeedbackWidgetComponent {
  isOpen = false;
  feedbackForm: FormGroup;
  submitted = false;

  feedbackTypes = [
    { value: 'bug', label: 'Reportar Bug' },
    { value: 'feature', label: 'Sugerir Feature' },
    { value: 'general', label: 'Feedback Geral' },
  ];

  constructor(
    private fb: FormBuilder,
    private feedbackService: FeedbackService,
    private analytics: AnalyticsService
  ) {
    this.feedbackForm = this.fb.group({
      type: ['general', Validators.required],
      message: ['', [Validators.required, Validators.minLength(10)]],
      email: [''], // Opcional
    });
  }

  toggle() {
    this.isOpen = !this.isOpen;

    if (this.isOpen) {
      this.analytics.trackEvent('feedback_widget_opened');
    }
  }

  submit() {
    if (this.feedbackForm.invalid) return;

    const feedback = this.feedbackForm.value;

    this.feedbackService.submit(feedback).subscribe({
      next: () => {
        this.submitted = true;
        this.analytics.trackEvent('feedback_submitted', {
          feedback_type: feedback.type,
        });

        setTimeout(() => {
          this.isOpen = false;
          this.submitted = false;
          this.feedbackForm.reset({ type: 'general' });
        }, 2000);
      },
      error: (err) => {
        console.error('Failed to submit feedback', err);
      },
    });
  }
}
```

**Template:**

**Arquivo:** `frontend/src/app/shared/components/feedback-widget/feedback-widget.component.html`

```html
<!-- Floating button -->
<button
  class="feedback-button"
  (click)="toggle()"
  *ngIf="!isOpen"
  mat-fab
  color="primary"
>
  <mat-icon>feedback</mat-icon>
</button>

<!-- Feedback panel -->
<div class="feedback-panel" *ngIf="isOpen">
  <div class="feedback-header">
    <h3>Feedback</h3>
    <button mat-icon-button (click)="toggle()">
      <mat-icon>close</mat-icon>
    </button>
  </div>

  <div class="feedback-body" *ngIf="!submitted">
    <form [formGroup]="feedbackForm" (ngSubmit)="submit()">
      <!-- Type -->
      <mat-form-field appearance="outline">
        <mat-label>Tipo</mat-label>
        <mat-select formControlName="type">
          <mat-option *ngFor="let type of feedbackTypes" [value]="type.value">
            {{ type.label }}
          </mat-option>
        </mat-select>
      </mat-form-field>

      <!-- Message -->
      <mat-form-field appearance="outline">
        <mat-label>Mensagem</mat-label>
        <textarea
          matInput
          formControlName="message"
          rows="4"
          placeholder="Conte-nos o que você pensa..."
        ></textarea>
        <mat-error *ngIf="feedbackForm.get('message')?.hasError('required')">
          Mensagem é obrigatória
        </mat-error>
        <mat-error *ngIf="feedbackForm.get('message')?.hasError('minlength')">
          Mínimo 10 caracteres
        </mat-error>
      </mat-form-field>

      <!-- Email (opcional) -->
      <mat-form-field appearance="outline">
        <mat-label>Email (opcional)</mat-label>
        <input matInput formControlName="email" type="email" />
      </mat-form-field>

      <!-- Submit -->
      <button
        mat-raised-button
        color="primary"
        type="submit"
        [disabled]="feedbackForm.invalid"
      >
        Enviar Feedback
      </button>
    </form>
  </div>

  <div class="feedback-body" *ngIf="submitted">
    <div class="success-message">
      <mat-icon color="primary">check_circle</mat-icon>
      <p>Obrigado pelo seu feedback!</p>
    </div>
  </div>
</div>
```

**Styles:**

**Arquivo:** `feedback-widget.component.scss`

```scss
.feedback-button {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 1000;
}

.feedback-panel {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 400px;
  max-width: calc(100vw - 48px);
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  z-index: 1000;

  .feedback-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    border-bottom: 1px solid #eee;

    h3 {
      margin: 0;
      font-size: 18px;
    }
  }

  .feedback-body {
    padding: 16px;

    form {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .success-message {
      text-align: center;
      padding: 24px;

      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
      }

      p {
        margin-top: 16px;
        font-size: 16px;
      }
    }
  }
}
```

---

### 6. Backend - Feedback API

**Modelo:**

**Arquivo:** `backend/app/models/feedback.py`

```python
from pydantic import BaseModel, EmailStr
from typing import Literal
from datetime import datetime

class Feedback(BaseModel):
    id: str
    type: Literal["bug", "feature", "general"]
    message: str
    email: EmailStr | None = None
    user_id: str | None = None
    user_agent: str | None = None
    url: str | None = None
    created_at: datetime = datetime.utcnow()

    class Config:
        json_schema_extra = {
            "example": {
                "type": "bug",
                "message": "Botão de salvar não funciona na página de leads",
                "email": "user@example.com"
            }
        }
```

**Endpoint:**

**Arquivo:** `backend/app/api/v1/endpoints/feedback.py`

```python
from fastapi import APIRouter, Depends, Request, BackgroundTasks
from app.models.feedback import Feedback
from app.database import get_database
from app.dependencies import get_current_user_optional
import uuid

router = APIRouter()

@router.post("/feedback", status_code=201)
async def submit_feedback(
    feedback_data: dict,
    request: Request,
    background_tasks: BackgroundTasks,
    db = Depends(get_database),
    current_user = Depends(get_current_user_optional)
):
    """
    Submete feedback do usuário
    """

    # Criar feedback
    feedback = Feedback(
        id=str(uuid.uuid4()),
        type=feedback_data["type"],
        message=feedback_data["message"],
        email=feedback_data.get("email"),
        user_id=str(current_user.id) if current_user else None,
        user_agent=request.headers.get("user-agent"),
        url=request.headers.get("referer"),
    )

    # Salvar no MongoDB
    await db.feedback.insert_one(feedback.model_dump())

    # Notificar time (background task)
    background_tasks.add_task(
        notify_team_about_feedback,
        feedback
    )

    return {"message": "Feedback recebido com sucesso"}

async def notify_team_about_feedback(feedback: Feedback):
    """
    Notifica o time via Slack ou email
    """

    # Enviar para Slack
    slack_webhook = os.getenv("SLACK_FEEDBACK_WEBHOOK")
    if slack_webhook:
        import httpx

        message = f"""
🗣️ *Novo Feedback*

*Tipo:* {feedback.type}
*Mensagem:* {feedback.message}
*Usuário:* {feedback.email or feedback.user_id or "Anônimo"}
*URL:* {feedback.url}
        """

        async with httpx.AsyncClient() as client:
            await client.post(
                slack_webhook,
                json={"text": message}
            )
```

---

### 7. Cookie Consent (LGPD/GDPR)

**Component:**

**Arquivo:** `frontend/src/app/shared/components/cookie-consent/cookie-consent.component.ts`

```typescript
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-cookie-consent',
  templateUrl: './cookie-consent.component.html',
  styleUrls: ['./cookie-consent.component.scss'],
})
export class CookieConsentComponent implements OnInit {
  showBanner = false;

  ngOnInit() {
    // Verificar se usuário já aceitou
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      this.showBanner = true;
    }
  }

  accept() {
    localStorage.setItem('cookie_consent', 'true');
    localStorage.setItem('cookie_consent_date', new Date().toISOString());
    this.showBanner = false;

    // Inicializar analytics apenas após aceite
    this.initializeAnalytics();
  }

  reject() {
    localStorage.setItem('cookie_consent', 'false');
    this.showBanner = false;
  }

  private initializeAnalytics() {
    // Analytics já inicializado, mas poderia ser lazy aqui
    console.log('✅ Analytics authorized by user');
  }
}
```

**Template:**

```html
<div class="cookie-banner" *ngIf="showBanner">
  <div class="cookie-content">
    <p>
      Usamos cookies para melhorar sua experiência. Ao continuar navegando, você concorda com nossa
      <a href="/privacy-policy" target="_blank">Política de Privacidade</a>.
    </p>

    <div class="cookie-actions">
      <button mat-button (click)="reject()">Recusar</button>
      <button mat-raised-button color="primary" (click)="accept()">
        Aceitar
      </button>
    </div>
  </div>
</div>
```

---

### 8. Analytics Dashboard (Admin)

**Arquivo:** `frontend/src/app/pages/admin/analytics/analytics.component.ts`

```typescript
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-analytics-dashboard',
  templateUrl: './analytics.component.html',
})
export class AnalyticsDashboardComponent implements OnInit {
  // Embedar GA4 reports
  gaEmbedUrl: string;

  constructor() {
    // GA4 embed URL (configurar no Google Analytics)
    this.gaEmbedUrl = 'https://lookerstudio.google.com/embed/reporting/...';
  }

  ngOnInit() {}
}
```

**Template:**

```html
<div class="analytics-container">
  <h1>Analytics Dashboard</h1>

  <!-- Embed GA4 Looker Studio -->
  <iframe
    [src]="gaEmbedUrl | safe:'resourceUrl'"
    width="100%"
    height="800px"
    frameborder="0"
    style="border:0"
  ></iframe>
</div>
```

---

### 9. Key Metrics para Rastrear

**Product Metrics:**
```typescript
// DAU/MAU
trackEvent('session_start', { user_id });

// Feature Adoption
trackEvent('feature_used', {
  feature_name: 'ai_email_generator',
  user_id,
});

// Retention
trackEvent('user_returned', {
  days_since_signup: 7,
});

// Engagement
trackEvent('action_performed', {
  action: 'lead_created',
  session_duration: 300, // seconds
});
```

**Business Metrics:**
```typescript
// Conversions
trackEvent('trial_started', { user_id });
trackEvent('trial_converted', { user_id, plan: 'pro' });

// Revenue (se houver)
trackEvent('purchase', {
  transaction_id: '123',
  value: 99.90,
  currency: 'BRL',
});
```

---

## Documentação

**Arquivo:** `docs/ANALYTICS.md`

```markdown
# Analytics & Tracking Guide

## Eventos Rastreados

Ver lista completa em: `frontend/src/app/core/analytics-events.ts`

## Como Adicionar Novo Evento

```typescript
// 1. Adicionar em analytics-events.ts
export const AnalyticsEvents = {
  // ...
  NEW_EVENT: 'new_event',
};

// 2. Rastrear no componente
this.analytics.trackEvent(AnalyticsEvents.NEW_EVENT, {
  param1: 'value1',
  param2: 'value2',
});
```

## Ver Dados

- **GA4 Dashboard**: https://analytics.google.com
- **Admin Panel**: /admin/analytics (embed)

## Compliance (LGPD)

- Cookie consent obrigatório
- Dados anonimizados
- IP anonymization ativado
- Usuários podem opt-out
```

---

## Critérios de Aceite

### Google Analytics
- [ ] GA4 property criada
- [ ] Measurement ID configurado
- [ ] SDK integrado no frontend
- [ ] Page views rastreados automaticamente
- [ ] 15+ custom events implementados
- [ ] User properties setadas (user_id)
- [ ] Conversions configuradas

### Feedback System
- [ ] Feedback widget criado
- [ ] 3 tipos de feedback (bug, feature, general)
- [ ] Backend endpoint criado
- [ ] Feedback salvo no MongoDB
- [ ] Notificação Slack configurada (opcional)
- [ ] Admin panel para ver feedbacks

### Privacy & Compliance
- [ ] Cookie consent banner
- [ ] Privacy policy página criada
- [ ] Opt-out funcional
- [ ] IP anonymization ativo
- [ ] Data retention configurado (GA4)

### Analytics Dashboard
- [ ] Looker Studio report criado (opcional)
- [ ] Admin pode visualizar métricas
- [ ] Key metrics definidos
- [ ] Funnels configurados

### Documentation
- [ ] ANALYTICS.md completo
- [ ] Eventos documentados
- [ ] Como adicionar novos eventos
- [ ] Privacy policy atualizada

---

## Riscos

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| **Tracking excessivo (performance)** | Baixo | Lazy load; sample rate |
| **Dados sensíveis rastreados** | Alto | Sanitizar dados; nunca enviar PII |
| **LGPD non-compliance** | Alto | Cookie consent; privacy policy; opt-out |
| **Feedback spam** | Baixo | Rate limiting; captcha se necessário |

---

## Dependências

- Google Analytics account
- Frontend deployado
- Cookie consent implementado

---

**Estimativa:** 2 dias
**Assignee:** Frontend Developer
**Tags:** `analytics`, `ga4`, `feedback`, `privacy`
