# Marco 030: AI Copilot Chat
> Backend + Frontend - Assistente conversacional para queries e ações | 5 dias

**Responsável**: Tech Lead + Frontend Dev
**Revisor**: Product Manager
**Status**: 🔵 Planejado

---

## 🎯 Objetivo

Implementar chat widget com assistente conversacional que responde queries em linguagem natural e executa ações rápidas no CRM.

---

## 📋 Key Features

- **Natural Language Queries**: "Show me hot leads", "What deals are at risk?"
- **Quick Actions**: "Create a deal for Acme Corp", "Send email to John"
- **Context-Aware**: Entende página atual (ex: /deals/123)
- **Multi-turn Conversation**: Mantém contexto entre mensagens
- **WebSocket Real-time**: Streaming responses

---

## 🤖 Backend - Copilot Agent

```python
# src/agents/copilot_agent.py

from conductor import Agent, Tool
from conductor.llms import ClaudeLLM
from typing import Dict, List, Optional

class CopilotAgent:
    """
    Assistente conversacional do CRM

    Capabilities:
    - Answer queries (metrics, leads, deals)
    - Execute actions (create, update, search)
    - Provide insights
    - Navigate user
    """

    def __init__(self):
        self.llm = ClaudeLLM(
            model="claude-3-5-sonnet-20241022",
            temperature=0.3
        )

        # Define tools
        self.tools = [
            Tool(name="search_leads", func=self._search_leads, description="Search leads by criteria"),
            Tool(name="search_deals", func=self._search_deals, description="Search deals"),
            Tool(name="get_metrics", func=self._get_metrics, description="Get CRM metrics"),
            Tool(name="create_lead", func=self._create_lead, description="Create new lead"),
            Tool(name="create_deal", func=self._create_deal, description="Create new deal")
        ]

        self.agent = Agent(
            name="Copilot",
            role="AI Sales Assistant",
            goal="Help users work faster and smarter in the CRM",
            tools=self.tools,
            llm=self.llm
        )

    async def chat(
        self,
        message: str,
        conversation_history: List[Dict],
        context: Optional[Dict] = None
    ) -> Dict:
        """
        Process user message and return response
        """
        # Build context-aware prompt
        prompt = self._build_prompt(message, conversation_history, context)

        # Execute agent
        response = await self.agent.run(prompt)

        # Parse response
        return self._parse_response(response)

    def _build_prompt(self, message: str, history: List, context: Optional[Dict]) -> str:
        """Build prompt with context"""
        context_str = ""
        if context:
            context_str = f"""
Current Page: {context.get('current_page', 'Dashboard')}
Viewing: {context.get('entity_type', 'N/A')} {context.get('entity_id', '')}
"""

        history_str = "\n".join([
            f"{h['role']}: {h['content']}" for h in history[-5:]  # Last 5 messages
        ])

        return f"""
You are an AI assistant for a CRM system. Help the user with their request.

{context_str}

Conversation History:
{history_str}

User: {message}

Provide a helpful, concise response. If you need to query data or perform an action, use the available tools.
"""

    def _parse_response(self, response: str) -> Dict:
        """Parse agent response"""
        return {
            "message": response,
            "action_taken": None,  # TODO: Extract action from response
            "suggestions": []  # TODO: Generate suggestions
        }

    # Tool implementations
    async def _search_leads(self, criteria: str) -> List[Dict]:
        """Search leads"""
        # Parse criteria and query database
        pass

    async def _search_deals(self, criteria: str) -> List[Dict]:
        """Search deals"""
        pass

    async def _get_metrics(self) -> Dict:
        """Get metrics"""
        pass

    async def _create_lead(self, data: Dict) -> Dict:
        """Create lead"""
        pass

    async def _create_deal(self, data: Dict) -> Dict:
        """Create deal"""
        pass
```

---

## 🔌 WebSocket API

```python
# src/api/routes/copilot.py

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from src.agents.copilot_agent import CopilotAgent
import json

router = APIRouter()

@router.websocket("/ws/copilot")
async def copilot_websocket(websocket: WebSocket):
    """
    WebSocket endpoint for real-time chat
    """
    await websocket.accept()

    agent = CopilotAgent()
    conversation_history = []

    try:
        while True:
            # Receive message
            data = await websocket.receive_text()
            message_data = json.loads(data)

            user_message = message_data.get('message')
            context = message_data.get('context', {})

            # Add to history
            conversation_history.append({
                'role': 'user',
                'content': user_message
            })

            # Process with agent (stream response)
            response = await agent.chat(user_message, conversation_history, context)

            # Add to history
            conversation_history.append({
                'role': 'assistant',
                'content': response['message']
            })

            # Send response
            await websocket.send_text(json.dumps(response))

    except WebSocketDisconnect:
        print("Client disconnected")
```

---

## 🎨 Frontend Widget

```typescript
// src/app/features/copilot/components/copilot-widget/copilot-widget.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { WebSocketSubject } from 'rxjs/webSocket';

@Component({
  selector: 'app-copilot-widget',
  template: `
    <div class="copilot-widget" [class.open]="isOpen">
      <!-- Toggle Button -->
      <button
        mat-fab
        color="primary"
        class="copilot-toggle"
        (click)="toggleChat()">
        <mat-icon>{{ isOpen ? 'close' : 'chat' }}</mat-icon>
      </button>

      <!-- Chat Window -->
      <div class="chat-window" *ngIf="isOpen">
        <div class="chat-header">
          <mat-icon>auto_awesome</mat-icon>
          <h3>AI Copilot</h3>
        </div>

        <div class="chat-messages" #messagesContainer>
          <div
            *ngFor="let msg of messages"
            class="message"
            [class.user]="msg.role === 'user'"
            [class.assistant]="msg.role === 'assistant'">
            <div class="message-content" [innerHTML]="msg.content"></div>
            <small class="timestamp">{{ msg.timestamp | date:'short' }}</small>
          </div>

          <div class="typing-indicator" *ngIf="typing">
            <span></span><span></span><span></span>
          </div>
        </div>

        <div class="chat-input">
          <mat-form-field appearance="outline" class="full-width">
            <input
              matInput
              [(ngModel)]="inputMessage"
              (keyup.enter)="sendMessage()"
              placeholder="Ask me anything..."
              [disabled]="typing">
          </mat-form-field>
          <button
            mat-icon-button
            color="primary"
            (click)="sendMessage()"
            [disabled]="!inputMessage || typing">
            <mat-icon>send</mat-icon>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .copilot-widget {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 1000;

      .copilot-toggle {
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
      }

      .chat-window {
        position: absolute;
        bottom: 80px;
        right: 0;
        width: 350px;
        height: 500px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 8px 16px rgba(0,0,0,0.3);
        display: flex;
        flex-direction: column;

        .chat-header {
          padding: 16px;
          background: #2196F3;
          color: white;
          border-radius: 8px 8px 0 0;
          display: flex;
          align-items: center;
          gap: 8px;

          h3 { margin: 0; }
        }

        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;

          .message {
            max-width: 80%;
            padding: 8px 12px;
            border-radius: 8px;

            &.user {
              align-self: flex-end;
              background: #2196F3;
              color: white;
            }

            &.assistant {
              align-self: flex-start;
              background: #f5f5f5;
            }
          }
        }

        .chat-input {
          display: flex;
          padding: 12px;
          border-top: 1px solid #e0e0e0;
        }
      }
    }
  `]
})
export class CopilotWidgetComponent implements OnInit, OnDestroy {
  isOpen: boolean = false;
  messages: any[] = [];
  inputMessage: string = '';
  typing: boolean = false;

  private ws$!: WebSocketSubject<any>;

  ngOnInit(): void {
    this.connectWebSocket();
  }

  connectWebSocket(): void {
    this.ws$ = new WebSocketSubject('ws://localhost:8000/ws/copilot');

    this.ws$.subscribe(
      (response) => {
        this.messages.push({
          role: 'assistant',
          content: response.message,
          timestamp: new Date()
        });
        this.typing = false;
      },
      (err) => console.error(err)
    );
  }

  toggleChat(): void {
    this.isOpen = !this.isOpen;
  }

  sendMessage(): void {
    if (!this.inputMessage.trim()) return;

    // Add user message
    this.messages.push({
      role: 'user',
      content: this.inputMessage,
      timestamp: new Date()
    });

    // Send to backend
    this.typing = true;
    this.ws$.next({
      message: this.inputMessage,
      context: this.getCurrentContext()
    });

    this.inputMessage = '';
  }

  getCurrentContext(): any {
    // Extract context from router
    return {
      current_page: window.location.pathname,
      entity_type: null,  // TODO: Extract from route
      entity_id: null
    };
  }

  ngOnDestroy(): void {
    this.ws$.complete();
  }
}
```

---

## ✅ Critérios de Aceitação

- [ ] Chat widget funciona (open/close)
- [ ] WebSocket connection estabelecida
- [ ] Messages são enviadas e recebidas
- [ ] Natural language queries funcionam
- [ ] Quick actions executam (create lead/deal)
- [ ] Context awareness funciona
- [ ] Typing indicator enquanto processa
- [ ] Conversation history mantida
- [ ] Markdown rendering em mensagens
- [ ] Mobile responsive

---

## 🔗 Dependências

- ✅ Marco 004: Conductor Core
- ✅ Marco 009, 017: Lead, Deal APIs
- WebSocket support (FastAPI)

---

**Status**: 🔵 Pronto para Implementação
**Estimativa**: 5 dias
