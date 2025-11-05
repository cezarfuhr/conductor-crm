# Marco 029: Dashboard Principal
> Frontend - Dashboard com métricas e insights | 4 dias

**Responsável**: Frontend Dev
**Revisor**: Product Manager
**Status**: 🔵 Planejado

---

## 🎯 Objetivo

Implementar dashboard principal do CRM com key metrics, pipeline chart, recent activities, top deals, e quick actions.

---

## 📋 Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ Dashboard                                    [Date Range ▼]      │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐                │
│ │Pipeline │ │ Open    │ │  Win    │ │ Avg Deal│                │
│ │ Value   │ │ Deals   │ │  Rate   │ │  Size   │                │
│ │ R$ 1.2M │ │   47    │ │  68%    │ │ R$ 25k  │                │
│ │ +12% ↗  │ │ +5 ↗    │ │  +3% ↗  │ │  -2% ↘  │                │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘                │
├──────────────────────────┬──────────────────────────────────────┤
│ Pipeline by Stage        │ Activity Feed                        │
│ ┌───────────────────┐   │ • Email sent to Acme Corp (2m ago)   │
│ │ [Bar Chart]       │   │ • Deal "TechCo" → Proposal (10m ago) │
│ │                   │   │ • New lead created (15m ago)         │
│ └───────────────────┘   │ [View All]                           │
├──────────────────────────┼──────────────────────────────────────┤
│ Top Deals (by value)     │ AI Insights                          │
│ 1. Acme Deal - R$ 150k   │ • 3 hot leads need contact          │
│ 2. TechCo - R$ 120k      │ • 2 deals at risk                   │
│ 3. Startup - R$ 80k      │ • Follow-up 5 leads this week       │
└──────────────────────────┴──────────────────────────────────────┘
```

---

## 💻 Component

```typescript
// src/app/features/dashboard/pages/dashboard/dashboard.component.ts

import { Component, OnInit } from '@angular/core';
import { DashboardService } from '@app/services/dashboard.service';
import { Observable } from 'rxjs';

interface DashboardMetrics {
  pipeline_value: number;
  pipeline_value_change: number;
  open_deals: number;
  open_deals_change: number;
  win_rate: number;
  win_rate_change: number;
  avg_deal_size: number;
  avg_deal_size_change: number;
}

interface PipelineStageData {
  stage: string;
  count: number;
  value: number;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  metrics$!: Observable<DashboardMetrics>;
  pipelineData$!: Observable<PipelineStageData[]>;
  recentActivities$!: Observable<any[]>;
  topDeals$!: Observable<any[]>;
  aiInsights$!: Observable<any[]>;

  // Chart config
  chartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false }
    }
  };

  dateRange: string = '30'; // days

  constructor(private dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.metrics$ = this.dashboardService.getMetrics(this.dateRange);
    this.pipelineData$ = this.dashboardService.getPipelineChart();
    this.recentActivities$ = this.dashboardService.getRecentActivities(10);
    this.topDeals$ = this.dashboardService.getTopDeals(5);
    this.aiInsights$ = this.dashboardService.getAIInsights();
  }

  onDateRangeChange(range: string): void {
    this.dateRange = range;
    this.loadDashboard();
  }

  formatValue(value: number): string {
    return `R$ ${(value / 100).toLocaleString('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`;
  }

  getChangeIcon(change: number): string {
    return change >= 0 ? 'trending_up' : 'trending_down';
  }

  getChangeColor(change: number): string {
    return change >= 0 ? '#4CAF50' : '#f44336';
  }
}
```

---

## 🔌 Backend API

```python
# src/api/routes/dashboard.py

@router.get("/dashboard/metrics")
async def get_dashboard_metrics(
    days: int = Query(30, ge=1, le=365),
    current_user: str = Depends(get_current_user)
):
    """Get key metrics for dashboard"""
    from datetime import timedelta

    # Current period
    now = datetime.utcnow()
    period_start = now - timedelta(days=days)

    # Previous period (for comparison)
    prev_period_start = period_start - timedelta(days=days)

    # Pipeline value (current)
    pipeline_value = await db.deals.aggregate([
        {"$match": {"status": "open", "created_at": {"$gte": period_start}}},
        {"$group": {"_id": None, "total": {"$sum": "$value"}}}
    ]).to_list(length=1)

    # Pipeline value (previous)
    pipeline_value_prev = await db.deals.aggregate([
        {
            "$match": {
                "status": "open",
                "created_at": {"$gte": prev_period_start, "$lt": period_start}
            }
        },
        {"$group": {"_id": None, "total": {"$sum": "$value"}}}
    ]).to_list(length=1)

    current_value = pipeline_value[0]['total'] if pipeline_value else 0
    prev_value = pipeline_value_prev[0]['total'] if pipeline_value_prev else 1
    value_change = ((current_value - prev_value) / prev_value * 100) if prev_value > 0 else 0

    # Open deals count
    open_deals = await db.deals.count_documents({"status": "open"})
    open_deals_prev = await db.deals.count_documents({
        "status": "open",
        "created_at": {"$lt": period_start}
    })
    deals_change = ((open_deals - open_deals_prev) / max(open_deals_prev, 1) * 100)

    # Win rate
    won = await db.deals.count_documents({"status": "won", "actual_close_date": {"$gte": period_start}})
    lost = await db.deals.count_documents({"status": "lost", "actual_close_date": {"$gte": period_start}})
    win_rate = (won / max(won + lost, 1)) * 100

    # Calculate previous win rate
    won_prev = await db.deals.count_documents({
        "status": "won",
        "actual_close_date": {"$gte": prev_period_start, "$lt": period_start}
    })
    lost_prev = await db.deals.count_documents({
        "status": "lost",
        "actual_close_date": {"$gte": prev_period_start, "$lt": period_start}
    })
    win_rate_prev = (won_prev / max(won_prev + lost_prev, 1)) * 100
    win_rate_change = win_rate - win_rate_prev

    # Avg deal size
    avg_deal = current_value / max(open_deals, 1)

    return {
        "pipeline_value": current_value,
        "pipeline_value_change": value_change,
        "open_deals": open_deals,
        "open_deals_change": deals_change,
        "win_rate": win_rate,
        "win_rate_change": win_rate_change,
        "avg_deal_size": avg_deal,
        "avg_deal_size_change": 0  # Calculate if needed
    }

@router.get("/dashboard/pipeline-chart")
async def get_pipeline_chart():
    """Get pipeline data by stage"""
    pipeline = await db.deals.aggregate([
        {"$match": {"status": "open"}},
        {
            "$group": {
                "_id": "$stage",
                "count": {"$sum": 1},
                "value": {"$sum": "$value"}
            }
        }
    ]).to_list(length=None)

    return [
        {
            "stage": p['_id'],
            "count": p['count'],
            "value": p['value']
        }
        for p in pipeline
    ]

@router.get("/dashboard/recent-activities")
async def get_recent_activities(limit: int = 10):
    """Get recent activities"""
    activities = await db.activities.find().sort("created_at", -1).limit(limit).to_list(length=limit)

    return [
        {
            "id": str(a['_id']),
            "type": a['type'],
            "title": a['title'],
            "created_at": a['created_at'],
            "entity_type": a.get('entity_type'),
            "entity_id": a.get('entity_id')
        }
        for a in activities
    ]

@router.get("/dashboard/top-deals")
async def get_top_deals(limit: int = 5):
    """Get top deals by value"""
    deals = await db.deals.find({"status": "open"}).sort("value", -1).limit(limit).to_list(length=limit)

    return [
        {
            "id": str(d['_id']),
            "title": d['title'],
            "value": d['value'],
            "stage": d['stage'],
            "probability": d.get('probability')
        }
        for d in deals
    ]
```

---

## ✅ Critérios de Aceitação

- [ ] 4 metric cards com valores e trends
- [ ] Pipeline chart exibido (bar/funnel)
- [ ] Recent activities listadas (10 itens)
- [ ] Top deals por value (5 itens)
- [ ] Date range selector funciona
- [ ] Auto-refresh a cada 60s
- [ ] Responsive em mobile
- [ ] Loading states
- [ ] Click em deal/activity navega para detail

---

## 🔗 Dependências

- ✅ Marco 017: Deal Model & API
- ✅ Marco 022: Activity Logging
- Chart.js

---

**Status**: 🔵 Pronto para Implementação
**Estimativa**: 4 dias
