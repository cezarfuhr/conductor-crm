# Marco 040: Testes E2E & Carga

**Fase:** 5 - Deploy, Testing & Launch
**Duração Estimada:** 5 dias
**Prioridade:** Alta
**Dependências:** Marco 039 (Containerização)

---

## Objetivo

Implementar suite completa de testes end-to-end usando Playwright para validar fluxos críticos do usuário, e testes de carga usando Locust para garantir que a aplicação suporta o tráfego esperado (100+ usuários concorrentes) com performance aceitável.

---

## Contexto

Testes E2E e de carga são essenciais antes do lançamento:
- **E2E Tests**: Validam fluxos completos do ponto de vista do usuário
- **Load Tests**: Garantem que a aplicação aguenta tráfego real
- **Regression**: Detectam bugs antes de chegarem em produção
- **CI/CD**: Automatizam validação em cada deploy
- **Confidence**: Time e stakeholders confiam na qualidade

**Targets:**
- Cobertura E2E: >80% dos fluxos críticos
- Load capacity: 100 concurrent users
- Response time: P95 < 500ms
- Error rate: <0.1%

---

## Implementação

### 1. Setup do Playwright

**Arquivo:** `tests/e2e/playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results.json' }],
    ['junit', { outputFile: 'junit.xml' }]
  ],

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:4200',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  // Configurar múltiplos browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  // Web Server para testes
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env.CI,
  },
});
```

---

### 2. Testes E2E - Autenticação

**Arquivo:** `tests/e2e/auth.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Autenticação', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('deve fazer login com credenciais válidas', async ({ page }) => {
    // Preencher formulário de login
    await page.fill('[data-testid="email-input"]', 'user@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');

    // Clicar em entrar
    await page.click('[data-testid="login-button"]');

    // Verificar redirecionamento para dashboard
    await expect(page).toHaveURL('/dashboard');

    // Verificar que o nome do usuário aparece
    await expect(page.locator('[data-testid="user-name"]'))
      .toContainText('User Name');
  });

  test('deve mostrar erro com credenciais inválidas', async ({ page }) => {
    await page.fill('[data-testid="email-input"]', 'wrong@example.com');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');
    await page.click('[data-testid="login-button"]');

    // Verificar mensagem de erro
    await expect(page.locator('[data-testid="error-message"]'))
      .toContainText('Credenciais inválidas');

    // Verificar que permanece na página de login
    await expect(page).toHaveURL('/login');
  });

  test('deve fazer logout corretamente', async ({ page }) => {
    // Login primeiro
    await page.fill('[data-testid="email-input"]', 'user@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Esperar dashboard carregar
    await page.waitForURL('/dashboard');

    // Fazer logout
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');

    // Verificar redirecionamento para login
    await expect(page).toHaveURL('/login');
  });

  test('deve redirecionar para login se não autenticado', async ({ page }) => {
    // Tentar acessar rota protegida
    await page.goto('/leads');

    // Deve redirecionar para login
    await expect(page).toHaveURL('/login');
  });

  test('deve fazer login via Google OAuth', async ({ page }) => {
    // Clicar no botão Google
    await page.click('[data-testid="google-login-button"]');

    // Esperar popup do Google
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      page.click('[data-testid="google-login-button"]')
    ]);

    // Mock Google OAuth (em testes, usar mock)
    // Em produção, este teste seria mais complexo

    await expect(page).toHaveURL('/dashboard');
  });
});
```

---

### 3. Testes E2E - Gestão de Leads

**Arquivo:** `tests/e2e/leads.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Gestão de Leads', () => {

  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'user@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');

    // Navegar para leads
    await page.click('[data-testid="nav-leads"]');
    await page.waitForURL('/leads');
  });

  test('deve criar novo lead', async ({ page }) => {
    // Clicar em criar lead
    await page.click('[data-testid="create-lead-button"]');

    // Preencher formulário
    await page.fill('[data-testid="lead-name"]', 'John Doe');
    await page.fill('[data-testid="lead-email"]', 'john@example.com');
    await page.fill('[data-testid="lead-phone"]', '+1234567890');
    await page.fill('[data-testid="lead-company"]', 'Acme Corp');
    await page.selectOption('[data-testid="lead-source"]', 'website');

    // Salvar
    await page.click('[data-testid="save-lead-button"]');

    // Verificar toast de sucesso
    await expect(page.locator('[data-testid="toast-success"]'))
      .toContainText('Lead criado com sucesso');

    // Verificar que aparece na lista
    await expect(page.locator('[data-testid="lead-list"]'))
      .toContainText('John Doe');
  });

  test('deve validar campos obrigatórios', async ({ page }) => {
    await page.click('[data-testid="create-lead-button"]');

    // Tentar salvar sem preencher
    await page.click('[data-testid="save-lead-button"]');

    // Verificar mensagens de erro
    await expect(page.locator('[data-testid="name-error"]'))
      .toContainText('Nome é obrigatório');
    await expect(page.locator('[data-testid="email-error"]'))
      .toContainText('Email é obrigatório');
  });

  test('deve buscar leads', async ({ page }) => {
    // Digitar no campo de busca
    await page.fill('[data-testid="search-input"]', 'john');

    // Esperar resultados
    await page.waitForTimeout(500); // Debounce

    // Verificar que filtra corretamente
    const items = page.locator('[data-testid="lead-item"]');
    await expect(items).toHaveCount(1);
    await expect(items.first()).toContainText('John');
  });

  test('deve editar lead existente', async ({ page }) => {
    // Clicar no primeiro lead
    await page.click('[data-testid="lead-item"]:first-child');

    // Abrir modal de edição
    await page.click('[data-testid="edit-lead-button"]');

    // Alterar dados
    await page.fill('[data-testid="lead-phone"]', '+9876543210');

    // Salvar
    await page.click('[data-testid="save-lead-button"]');

    // Verificar toast
    await expect(page.locator('[data-testid="toast-success"]'))
      .toContainText('Lead atualizado');
  });

  test('deve qualificar lead para deal', async ({ page }) => {
    // Clicar no lead
    await page.click('[data-testid="lead-item"]:first-child');

    // Clicar em qualificar
    await page.click('[data-testid="qualify-lead-button"]');

    // Preencher dados do deal
    await page.fill('[data-testid="deal-title"]', 'Enterprise Deal');
    await page.fill('[data-testid="deal-value"]', '50000');
    await page.selectOption('[data-testid="deal-stage"]', 'negotiation');

    // Salvar
    await page.click('[data-testid="save-deal-button"]');

    // Verificar que foi para deals
    await expect(page).toHaveURL(/\/deals\/\d+/);

    // Verificar que lead está qualificado
    await page.goto('/leads');
    await expect(page.locator('[data-testid="lead-item"]:first-child'))
      .toHaveAttribute('data-status', 'qualified');
  });

  test('deve deletar lead', async ({ page }) => {
    // Clicar no lead
    await page.click('[data-testid="lead-item"]:first-child');

    // Clicar em deletar
    await page.click('[data-testid="delete-lead-button"]');

    // Confirmar
    await page.click('[data-testid="confirm-delete-button"]');

    // Verificar toast
    await expect(page.locator('[data-testid="toast-success"]'))
      .toContainText('Lead deletado');

    // Verificar que sumiu da lista
    await expect(page.locator('[data-testid="lead-list"]'))
      .not.toContainText('John Doe');
  });
});
```

---

### 4. Testes E2E - Deals e Pipeline

**Arquivo:** `tests/e2e/deals.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Gestão de Deals', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'user@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.click('[data-testid="nav-deals"]');
  });

  test('deve criar novo deal', async ({ page }) => {
    await page.click('[data-testid="create-deal-button"]');

    await page.fill('[data-testid="deal-title"]', 'Big Enterprise Deal');
    await page.fill('[data-testid="deal-value"]', '100000');
    await page.selectOption('[data-testid="deal-stage"]', 'prospecting');
    await page.fill('[data-testid="deal-expected-close"]', '2025-12-31');

    await page.click('[data-testid="save-deal-button"]');

    await expect(page.locator('[data-testid="toast-success"]'))
      .toContainText('Deal criado com sucesso');
  });

  test('deve mover deal entre stages (drag and drop)', async ({ page }) => {
    // Encontrar deal
    const deal = page.locator('[data-testid="deal-card"]:first-child');

    // Drag do prospecting para qualification
    await deal.dragTo(page.locator('[data-testid="stage-qualification"]'));

    // Verificar que moveu
    await expect(page.locator('[data-testid="stage-qualification"]'))
      .toContainText('Big Enterprise Deal');

    // Verificar que API foi chamada (opcional)
    await page.waitForResponse(resp =>
      resp.url().includes('/api/v1/deals/') &&
      resp.request().method() === 'PATCH'
    );
  });

  test('deve filtrar deals por stage', async ({ page }) => {
    // Clicar no filtro
    await page.click('[data-testid="filter-stage"]');
    await page.click('[data-testid="filter-negotiation"]');

    // Verificar que mostra apenas negotiation
    const deals = page.locator('[data-testid="deal-card"]');
    const count = await deals.count();

    for (let i = 0; i < count; i++) {
      await expect(deals.nth(i)).toHaveAttribute('data-stage', 'negotiation');
    }
  });

  test('deve visualizar detalhes do deal', async ({ page }) => {
    await page.click('[data-testid="deal-card"]:first-child');

    // Verificar que modal/página abre
    await expect(page.locator('[data-testid="deal-details"]')).toBeVisible();

    // Verificar seções
    await expect(page.locator('[data-testid="deal-info"]')).toBeVisible();
    await expect(page.locator('[data-testid="deal-activities"]')).toBeVisible();
    await expect(page.locator('[data-testid="deal-ai-insights"]')).toBeVisible();
  });
});
```

---

### 5. Testes E2E - AI Features

**Arquivo:** `tests/e2e/ai.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Features de AI', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'user@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
  });

  test('deve gerar email com AI', async ({ page }) => {
    // Ir para lead
    await page.goto('/leads');
    await page.click('[data-testid="lead-item"]:first-child');

    // Clicar em enviar email
    await page.click('[data-testid="send-email-button"]');

    // Clicar em gerar com AI
    await page.click('[data-testid="generate-ai-email"]');

    // Esperar loading
    await expect(page.locator('[data-testid="ai-loading"]')).toBeVisible();

    // Esperar resultado (timeout 15s)
    await expect(page.locator('[data-testid="ai-email-variation-1"]'))
      .toBeVisible({ timeout: 15000 });

    // Verificar que gerou 3 variações
    await expect(page.locator('[data-testid^="ai-email-variation-"]'))
      .toHaveCount(3);

    // Selecionar variação
    await page.click('[data-testid="select-variation-1"]');

    // Verificar que populou o editor
    const editorContent = await page.locator('[data-testid="email-editor"]')
      .textContent();
    expect(editorContent).toBeTruthy();
    expect(editorContent.length).toBeGreaterThan(50);
  });

  test('deve mostrar AI insights no deal', async ({ page }) => {
    await page.goto('/deals');
    await page.click('[data-testid="deal-card"]:first-child');

    // Verificar painel de AI
    await expect(page.locator('[data-testid="ai-win-probability"]'))
      .toBeVisible();

    // Verificar health score
    const healthScore = await page.locator('[data-testid="health-score"]')
      .textContent();
    expect(parseInt(healthScore)).toBeGreaterThanOrEqual(0);
    expect(parseInt(healthScore)).toBeLessThanOrEqual(100);

    // Verificar recommended actions
    await expect(page.locator('[data-testid="recommended-action"]'))
      .toHaveCount.greaterThan(0);
  });

  test('deve usar AI Copilot Chat', async ({ page }) => {
    await page.goto('/dashboard');

    // Abrir copilot
    await page.click('[data-testid="copilot-button"]');

    // Digitar pergunta
    await page.fill('[data-testid="copilot-input"]',
      'Quantos deals temos em negotiation?');
    await page.press('[data-testid="copilot-input"]', 'Enter');

    // Esperar resposta
    await expect(page.locator('[data-testid="copilot-message"]:last-child'))
      .toBeVisible({ timeout: 10000 });

    // Verificar que resposta contém número
    const response = await page.locator('[data-testid="copilot-message"]:last-child')
      .textContent();
    expect(response).toMatch(/\d+/);
  });
});
```

---

### 6. Setup do Locust (Load Testing)

**Arquivo:** `tests/load/locustfile.py`

```python
from locust import HttpUser, task, between
import random
import json

class ConductorUser(HttpUser):
    """
    Simula usuário típico do Conductor CRM
    """

    wait_time = between(1, 5)  # Espera entre 1-5s entre requests

    def on_start(self):
        """Executado uma vez por usuário ao iniciar"""
        # Login
        response = self.client.post("/api/v1/auth/login", json={
            "email": f"loadtest{random.randint(1, 1000)}@example.com",
            "password": "password123"
        })

        if response.status_code == 200:
            self.token = response.json()["access_token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            self.token = None
            self.headers = {}

    @task(3)
    def list_leads(self):
        """Lista leads (peso 3 - mais frequente)"""
        self.client.get(
            "/api/v1/leads",
            headers=self.headers,
            name="/api/v1/leads [LIST]"
        )

    @task(3)
    def list_deals(self):
        """Lista deals (peso 3)"""
        self.client.get(
            "/api/v1/deals",
            headers=self.headers,
            name="/api/v1/deals [LIST]"
        )

    @task(2)
    def get_dashboard(self):
        """Carrega dashboard (peso 2)"""
        self.client.get(
            "/api/v1/dashboard/metrics",
            headers=self.headers,
            name="/api/v1/dashboard/metrics [GET]"
        )

    @task(1)
    def create_lead(self):
        """Cria lead (peso 1 - menos frequente)"""
        lead_data = {
            "name": f"Load Test Lead {random.randint(1, 10000)}",
            "email": f"lead{random.randint(1, 10000)}@example.com",
            "phone": f"+1234567{random.randint(1000, 9999)}",
            "company": "Load Test Corp",
            "source": random.choice(["website", "referral", "cold_call"])
        }

        self.client.post(
            "/api/v1/leads",
            json=lead_data,
            headers=self.headers,
            name="/api/v1/leads [CREATE]"
        )

    @task(1)
    def create_activity(self):
        """Cria atividade (peso 1)"""
        activity_data = {
            "type": random.choice(["call", "email", "meeting"]),
            "description": "Load test activity",
            "entity_type": "lead",
            "entity_id": f"{random.randint(1, 100)}"
        }

        self.client.post(
            "/api/v1/activities",
            json=activity_data,
            headers=self.headers,
            name="/api/v1/activities [CREATE]"
        )

    @task(1)
    def generate_ai_email(self):
        """Gera email com AI (peso 1 - operação pesada)"""
        self.client.post(
            "/api/v1/ai/email/generate",
            json={
                "lead_id": f"{random.randint(1, 100)}",
                "context": "Follow-up after demo"
            },
            headers=self.headers,
            name="/api/v1/ai/email/generate [POST]"
        )

    @task(1)
    def predict_deal(self):
        """Predição de deal com AI (peso 1 - operação pesada)"""
        self.client.post(
            "/api/v1/ai/deal/predict",
            json={
                "deal_id": f"{random.randint(1, 100)}"
            },
            headers=self.headers,
            name="/api/v1/ai/deal/predict [POST]"
        )

class AdminUser(HttpUser):
    """
    Simula usuário admin fazendo operações mais pesadas
    """

    wait_time = between(3, 10)

    def on_start(self):
        response = self.client.post("/api/v1/auth/login", json={
            "email": "admin@conductor.com",
            "password": "admin123"
        })
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    @task
    def export_leads(self):
        """Exportar leads (CSV)"""
        self.client.get(
            "/api/v1/leads/export",
            headers=self.headers,
            name="/api/v1/leads/export [GET]"
        )

    @task
    def bulk_update(self):
        """Update em massa"""
        self.client.post(
            "/api/v1/leads/bulk-update",
            json={
                "ids": [str(i) for i in range(1, 11)],
                "updates": {"owner_id": "admin123"}
            },
            headers=self.headers,
            name="/api/v1/leads/bulk-update [POST]"
        )
```

---

### 7. Cenários de Load Testing

**Arquivo:** `tests/load/scenarios/spike_test.py`

```python
"""
Spike Test: Testa comportamento com pico súbito de tráfego
"""

from locust import HttpUser, task, between, LoadTestShape

class SpikeTestShape(LoadTestShape):
    """
    Simula pico de tráfego:
    - 0-60s: 10 usuários
    - 60-120s: 100 usuários (SPIKE)
    - 120-180s: 10 usuários (volta ao normal)
    """

    stages = [
        {"duration": 60, "users": 10, "spawn_rate": 1},
        {"duration": 120, "users": 100, "spawn_rate": 10},
        {"duration": 180, "users": 10, "spawn_rate": 5},
    ]

    def tick(self):
        run_time = self.get_run_time()

        for stage in self.stages:
            if run_time < stage["duration"]:
                return (stage["users"], stage["spawn_rate"])

        return None
```

**Arquivo:** `tests/load/scenarios/stress_test.py`

```python
"""
Stress Test: Aumenta carga progressivamente até breaking point
"""

from locust import LoadTestShape

class StressTestShape(LoadTestShape):
    """
    Aumenta usuários gradualmente:
    - A cada 60s, aumenta +20 usuários
    - Máximo: 200 usuários
    """

    step_time = 60
    step_load = 20
    max_users = 200

    def tick(self):
        run_time = self.get_run_time()

        current_step = run_time // self.step_time
        users = min(self.step_load * (current_step + 1), self.max_users)

        if users < self.max_users:
            return (users, self.step_load)

        return None
```

---

### 8. CI/CD Integration

**Arquivo:** `.github/workflows/e2e-tests.yml`

```yaml
name: E2E Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  e2e:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: |
          cd frontend
          npm ci

      - name: Install Playwright
        run: |
          cd tests/e2e
          npm ci
          npx playwright install --with-deps

      - name: Start Docker Compose
        run: |
          docker-compose up -d
          sleep 30  # Esperar serviços iniciarem

      - name: Run E2E tests
        run: |
          cd tests/e2e
          npx playwright test

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: tests/e2e/playwright-report/

      - name: Stop Docker Compose
        if: always()
        run: docker-compose down
```

**Arquivo:** `.github/workflows/load-tests.yml`

```yaml
name: Load Tests

on:
  schedule:
    - cron: '0 2 * * 0'  # Todo domingo às 2am
  workflow_dispatch:  # Manual trigger

jobs:
  load:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Install Locust
        run: |
          pip install locust

      - name: Run Load Test
        run: |
          cd tests/load
          locust -f locustfile.py \
            --headless \
            --users 100 \
            --spawn-rate 10 \
            --run-time 5m \
            --host https://api.conductor-crm.com \
            --html report.html

      - name: Upload report
        uses: actions/upload-artifact@v3
        with:
          name: load-test-report
          path: tests/load/report.html

      - name: Check thresholds
        run: |
          python tests/load/check_thresholds.py report.html
```

---

### 9. Threshold Checker

**Arquivo:** `tests/load/check_thresholds.py`

```python
"""
Valida se load tests atendem thresholds definidos
"""

import json
import sys

def check_thresholds(report_file):
    """
    Thresholds:
    - P95 response time < 500ms
    - Error rate < 0.1%
    - RPS > 50
    """

    with open(report_file) as f:
        data = json.load(f)

    failures = []

    # Check P95
    p95 = data['stats']['response_time_percentile_95']
    if p95 > 500:
        failures.append(f"P95 response time too high: {p95}ms > 500ms")

    # Check error rate
    total_requests = data['stats']['num_requests']
    total_failures = data['stats']['num_failures']
    error_rate = (total_failures / total_requests) * 100

    if error_rate > 0.1:
        failures.append(f"Error rate too high: {error_rate}% > 0.1%")

    # Check RPS
    rps = data['stats']['requests_per_second']
    if rps < 50:
        failures.append(f"RPS too low: {rps} < 50")

    if failures:
        print("❌ Load test FAILED:")
        for failure in failures:
            print(f"  - {failure}")
        sys.exit(1)
    else:
        print("✅ Load test PASSED!")
        print(f"  - P95: {p95}ms")
        print(f"  - Error rate: {error_rate}%")
        print(f"  - RPS: {rps}")
        sys.exit(0)

if __name__ == "__main__":
    check_thresholds(sys.argv[1])
```

---

## Documentação

**Arquivo:** `docs/TESTING.md`

```markdown
# Testing Guide - Conductor CRM

## E2E Tests (Playwright)

### Rodar localmente

```bash
# Instalar Playwright
cd tests/e2e
npm install
npx playwright install

# Rodar todos os testes
npx playwright test

# Rodar em modo UI (interativo)
npx playwright test --ui

# Rodar específico
npx playwright test auth.spec.ts

# Rodar em browser específico
npx playwright test --project=chromium
```

### Ver relatórios

```bash
npx playwright show-report
```

### Debug

```bash
# Modo debug
npx playwright test --debug

# Com headed browser
npx playwright test --headed
```

## Load Tests (Locust)

### Rodar localmente

```bash
# Instalar Locust
pip install locust

# Rodar com UI
cd tests/load
locust -f locustfile.py --host http://localhost:8000

# Abrir http://localhost:8089
# Definir: 100 users, spawn rate 10
```

### Rodar headless

```bash
locust -f locustfile.py \
  --headless \
  --users 100 \
  --spawn-rate 10 \
  --run-time 5m \
  --host http://localhost:8000 \
  --html report.html
```

### Cenários específicos

```bash
# Spike test
locust -f scenarios/spike_test.py

# Stress test
locust -f scenarios/stress_test.py
```

## CI/CD

Testes rodam automaticamente:
- **E2E**: A cada push/PR
- **Load**: Todo domingo às 2am (scheduled)

Ver resultados em GitHub Actions > Workflows
```

---

## Critérios de Aceite

### E2E Tests
- [ ] 20+ cenários implementados
- [ ] Cobertura >80% dos fluxos críticos
- [ ] Testes passando em Chrome, Firefox, Safari
- [ ] Testes passando em mobile (iOS/Android)
- [ ] Screenshots on failure configurado
- [ ] Video recording on failure configurado
- [ ] Relatórios HTML gerados
- [ ] CI/CD integration funcionando

### Load Tests
- [ ] Locust configurado
- [ ] Cenários: normal, spike, stress
- [ ] 100 concurrent users suportados
- [ ] P95 < 500ms alcançado
- [ ] Error rate < 0.1% alcançado
- [ ] RPS > 50 alcançado
- [ ] Threshold checker automatizado
- [ ] Relatórios HTML gerados

### Infraestrutura
- [ ] Testes rodam em Docker
- [ ] Fácil rodar localmente
- [ ] GitHub Actions workflows configurados
- [ ] Artifacts salvos (reports)
- [ ] Documentação completa

---

## Riscos

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| **Testes flaky (intermitentes)** | Alto | Waits explícitos; retries; selectors estáveis |
| **Load tests não passam** | Alto | Otimizar antes; caching; indexes; profiling |
| **CI muito lento** | Médio | Paralelizar testes; usar matrix builds |
| **Cobertura insuficiente** | Médio | Priorizar fluxos críticos; incrementar aos poucos |

---

## Dependências

- Marco 039: Docker setup funcionando
- Frontend e backend deployados
- Test data seeding configurado

---

**Estimativa:** 5 dias
**Assignee:** QA Engineer + Senior Developer
**Tags:** `testing`, `e2e`, `load`, `quality`
