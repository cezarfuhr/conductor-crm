# Marco 025: Email Composer UI
> Frontend - Interface de composição de emails com IA | 4 dias

**Responsável**: Frontend Dev
**Revisor**: Designer
**Status**: 🔵 Planejado

---

## 🎯 Objetivo

Implementar interface completa para compor emails com assistência de IA, permitindo seleção entre 3 variações geradas, edição manual, preview e envio via Gmail.

---

## 📋 Key Features

- **AI Generation**: Botão "✨ Generate with AI"
- **3 Tabs**: Variações (Professional, Casual, Direct)
- **WYSIWYG Editor**: Edição rica de texto
- **Preview Mode**: Visualizar antes de enviar
- **Send via Gmail**: Integração com Marco 023
- **Save Draft**: Salvar para depois
- **Variables**: Suporte a {{name}}, {{company}} templates

---

## 💻 Component Implementation

```typescript
// src/app/features/email/components/email-composer/email-composer.component.ts

import { Component, OnInit, Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { EmailService } from '@app/services/email.service';
import { AIService } from '@app/services/ai.service';

interface EmailVariation {
  tone: string;
  subject: string;
  body: string;
  reasoning: string;
}

@Component({
  selector: 'app-email-composer',
  templateUrl: './email-composer.component.html',
  styleUrls: ['./email-composer.component.scss']
})
export class EmailComposerComponent implements OnInit {
  @Input() entityType!: string;  // 'lead', 'deal', 'contact'
  @Input() entityId!: string;
  @Input() recipientEmail?: string;
  @Input() recipientName?: string;

  emailForm!: FormGroup;

  // AI Generation
  variations: EmailVariation[] = [];
  selectedVariationIndex: number = 0;
  generating: boolean = false;

  // Editor
  editorModules = {
    toolbar: [
      ['bold', 'italic', 'underline'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link'],
      ['clean']
    ]
  };

  // Preview
  previewMode: boolean = false;

  // Sending
  sending: boolean = false;

  constructor(
    private fb: FormBuilder,
    private emailService: EmailService,
    private aiService: AIService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.emailForm = this.fb.group({
      to: [this.recipientEmail || '', [Validators.required, Validators.email]],
      subject: ['', Validators.required],
      body: ['', Validators.required],
      purpose: ['introduction'],  // For AI context
      tone: ['professional']
    });
  }

  async generateWithAI(): Promise<void> {
    this.generating = true;

    try {
      const result = await this.aiService.generateEmail({
        entity_type: this.entityType,
        entity_id: this.entityId,
        recipient_email: this.emailForm.value.to,
        recipient_name: this.recipientName,
        purpose: this.emailForm.value.purpose,
        tone: this.emailForm.value.tone
      }).toPromise();

      this.variations = result.variations;
      this.selectedVariationIndex = 0;

      // Apply first variation
      this.applyVariation(0);

    } catch (error) {
      console.error('Email generation failed:', error);
      alert('Failed to generate email. Please try again.');
    } finally {
      this.generating = false;
    }
  }

  applyVariation(index: number): void {
    this.selectedVariationIndex = index;
    const variation = this.variations[index];

    this.emailForm.patchValue({
      subject: variation.subject,
      body: variation.body
    });
  }

  togglePreview(): void {
    this.previewMode = !this.previewMode;
  }

  async sendEmail(): Promise<void> {
    if (this.emailForm.invalid) {
      alert('Please fill all required fields');
      return;
    }

    const confirmSend = confirm(`Send email to ${this.emailForm.value.to}?`);
    if (!confirmSend) return;

    this.sending = true;

    try {
      await this.emailService.sendEmail({
        to: this.emailForm.value.to,
        subject: this.emailForm.value.subject,
        body: this.emailForm.value.body,
        entity_type: this.entityType,
        entity_id: this.entityId
      }).toPromise();

      alert('Email sent successfully! ✉️');
      this.emailForm.reset();
      this.variations = [];

    } catch (error) {
      console.error('Email send failed:', error);
      alert('Failed to send email. Please try again.');
    } finally {
      this.sending = false;
    }
  }

  saveDraft(): void {
    // Save to local storage or backend
    const draft = this.emailForm.value;
    localStorage.setItem(`email_draft_${this.entityId}`, JSON.stringify(draft));
    alert('Draft saved! 💾');
  }

  loadDraft(): void {
    const draft = localStorage.getItem(`email_draft_${this.entityId}`);
    if (draft) {
      this.emailForm.patchValue(JSON.parse(draft));
    }
  }
}
```

---

## 📄 Template

```html
<!-- email-composer.component.html -->

<div class="email-composer">

  <!-- Header -->
  <div class="composer-header">
    <h3>
      <mat-icon>email</mat-icon>
      Compose Email
    </h3>
    <button
      mat-icon-button
      mat-dialog-close
      *ngIf="isDialog">
      <mat-icon>close</mat-icon>
    </button>
  </div>

  <!-- Form -->
  <form [formGroup]="emailForm" class="composer-form">

    <!-- To Field -->
    <mat-form-field appearance="outline" class="full-width">
      <mat-label>To</mat-label>
      <input matInput formControlName="to" placeholder="recipient@company.com">
      <mat-icon matPrefix>person</mat-icon>
      <mat-error *ngIf="emailForm.get('to')?.hasError('required')">
        Recipient email is required
      </mat-error>
      <mat-error *ngIf="emailForm.get('to')?.hasError('email')">
        Invalid email format
      </mat-error>
    </mat-form-field>

    <!-- AI Generation Controls -->
    <div class="ai-controls" *ngIf="!previewMode">
      <mat-form-field appearance="outline">
        <mat-label>Purpose</mat-label>
        <mat-select formControlName="purpose">
          <mat-option value="introduction">Introduction</mat-option>
          <mat-option value="follow_up">Follow-up</mat-option>
          <mat-option value="proposal">Proposal</mat-option>
          <mat-option value="meeting_request">Meeting Request</mat-option>
          <mat-option value="check_in">Check-in</mat-option>
        </mat-select>
      </mat-form-field>

      <button
        mat-raised-button
        color="primary"
        type="button"
        (click)="generateWithAI()"
        [disabled]="generating || !emailForm.get('to')?.valid">
        <mat-icon>auto_awesome</mat-icon>
        {{ generating ? 'Generating...' : 'Generate with AI' }}
        <mat-spinner diameter="20" *ngIf="generating"></mat-spinner>
      </button>
    </div>

    <!-- Variations Tabs (if generated) -->
    <mat-tab-group
      *ngIf="variations.length > 0 && !previewMode"
      [(selectedIndex)]="selectedVariationIndex"
      (selectedIndexChange)="applyVariation($event)">

      <mat-tab *ngFor="let variation of variations; let i = index">
        <ng-template mat-tab-label>
          <mat-icon>{{ getVariationIcon(variation.tone) }}</mat-icon>
          {{ variation.tone | titlecase }}
        </ng-template>

        <div class="variation-info">
          <p class="reasoning">
            <mat-icon>tips_and_updates</mat-icon>
            {{ variation.reasoning }}
          </p>
        </div>
      </mat-tab>

    </mat-tab-group>

    <!-- Subject Field -->
    <mat-form-field appearance="outline" class="full-width">
      <mat-label>Subject</mat-label>
      <input matInput formControlName="subject" placeholder="Email subject">
      <mat-hint align="end">
        {{ emailForm.get('subject')?.value?.length || 0 }} / 60 characters
      </mat-hint>
    </mat-form-field>

    <!-- Body Editor (Edit Mode) -->
    <div class="email-body" *ngIf="!previewMode">
      <label>Message</label>
      <quill-editor
        formControlName="body"
        [modules]="editorModules"
        placeholder="Write your email here..."
        class="email-editor">
      </quill-editor>
    </div>

    <!-- Preview Mode -->
    <div class="email-preview" *ngIf="previewMode">
      <mat-card>
        <mat-card-header>
          <mat-card-title>{{ emailForm.get('subject')?.value }}</mat-card-title>
          <mat-card-subtitle>
            From: You → To: {{ emailForm.get('to')?.value }}
          </mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div [innerHTML]="emailForm.get('body')?.value"></div>
        </mat-card-content>
      </mat-card>
    </div>

  </form>

  <!-- Actions -->
  <div class="composer-actions">
    <div class="left-actions">
      <button
        mat-button
        type="button"
        (click)="saveDraft()">
        <mat-icon>save</mat-icon>
        Save Draft
      </button>

      <button
        mat-button
        type="button"
        (click)="togglePreview()">
        <mat-icon>{{ previewMode ? 'edit' : 'visibility' }}</mat-icon>
        {{ previewMode ? 'Edit' : 'Preview' }}
      </button>
    </div>

    <div class="right-actions">
      <button
        mat-raised-button
        color="primary"
        type="button"
        (click)="sendEmail()"
        [disabled]="emailForm.invalid || sending">
        <mat-icon>send</mat-icon>
        {{ sending ? 'Sending...' : 'Send Email' }}
        <mat-spinner diameter="20" *ngIf="sending"></mat-spinner>
      </button>
    </div>
  </div>

</div>
```

---

## 🎨 Styles

```scss
// email-composer.component.scss

.email-composer {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 600px;

  .composer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 24px;
    border-bottom: 1px solid #e0e0e0;

    h3 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
    }
  }

  .composer-form {
    flex: 1;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    overflow-y: auto;

    .full-width {
      width: 100%;
    }

    .ai-controls {
      display: flex;
      gap: 16px;
      align-items: center;
      padding: 16px;
      background: rgba(33, 150, 243, 0.05);
      border-radius: 8px;

      mat-form-field {
        flex: 1;
      }
    }

    .variation-info {
      padding: 12px;
      background: rgba(33, 150, 243, 0.05);
      border-radius: 4px;
      margin-bottom: 16px;

      .reasoning {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        margin: 0;
        font-size: 13px;
        color: rgba(0, 0, 0, 0.7);

        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
          color: #2196F3;
        }
      }
    }

    .email-body {
      display: flex;
      flex-direction: column;
      gap: 8px;

      label {
        font-size: 12px;
        font-weight: 500;
        color: rgba(0, 0, 0, 0.6);
        text-transform: uppercase;
      }

      .email-editor {
        min-height: 300px;
        border: 1px solid #e0e0e0;
        border-radius: 4px;
      }
    }

    .email-preview {
      mat-card {
        background: #fafafa;
      }
    }
  }

  .composer-actions {
    display: flex;
    justify-content: space-between;
    padding: 16px 24px;
    border-top: 1px solid #e0e0e0;
    background: white;

    .left-actions,
    .right-actions {
      display: flex;
      gap: 8px;
    }

    button {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    mat-spinner {
      display: inline-block;
      margin-left: 8px;
    }
  }
}
```

---

## 🔌 Services

```typescript
// src/app/services/ai.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AIService {

  constructor(private http: HttpClient) {}

  generateEmail(params: any): Observable<any> {
    return this.http.post('/api/v1/ai/email/generate', params);
  }

  improveEmail(draft: string, instructions: string): Observable<any> {
    return this.http.post('/api/v1/ai/email/improve', { draft, instructions });
  }
}
```

---

## ✅ Critérios de Aceitação

- [ ] Botão "Generate with AI" funciona
- [ ] 3 variações são exibidas em tabs
- [ ] Variações podem ser selecionadas e aplicadas
- [ ] WYSIWYG editor funciona (bold, italic, lists, links)
- [ ] Subject field valida comprimento (<60 chars)
- [ ] Preview mode exibe email formatado
- [ ] Send email funciona (via Gmail API)
- [ ] Save draft funciona (localStorage)
- [ ] Load draft funciona
- [ ] Loading states durante geração e envio
- [ ] Validação de campos obrigatórios
- [ ] Responsive em mobile

---

## 🔗 Dependências

- ✅ Marco 024: EmailAssistant_Agent
- ✅ Marco 023: Gmail Integration (send)
- `quill` (WYSIWYG editor)
- `ngx-quill`

---

**Status**: 🔵 Pronto para Implementação
**Estimativa**: 4 dias
