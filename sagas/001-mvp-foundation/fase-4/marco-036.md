# Marco 036: Performance Optimization
> Backend + Frontend - Otimizações de performance | 3 dias

**Responsável**: Tech Lead
**Revisor**: Product Manager
**Status**: 🔵 Planejado

---

## 🎯 Objetivo

Otimizar performance backend e frontend para garantir experiência rápida: query optimization, caching, lazy loading, code splitting, e image optimization.

**Target**: Lighthouse Score > 80

---

## 📋 Optimization Areas

### Backend Optimizations

**1. Database Query Optimization**
```python
# Bad: N+1 queries
deals = await db.deals.find().to_list()
for deal in deals:
    contact = await db.contacts.find_one({"_id": deal['contact_id']})

# Good: Aggregation pipeline
deals = await db.deals.aggregate([
    {
        "$lookup": {
            "from": "contacts",
            "localField": "contact_id",
            "foreignField": "_id",
            "as": "contact"
        }
    },
    {"$unwind": "$contact"}
]).to_list()
```

**2. Redis Caching**
```python
# src/services/cache_service.py

import redis
import json

class CacheService:
    def __init__(self):
        self.redis = redis.Redis(
            host='localhost',
            port=6379,
            db=0,
            decode_responses=True
        )

    async def get_cached_or_fetch(
        self,
        key: str,
        fetch_fn,
        ttl: int = 300  # 5 minutes
    ):
        """Get from cache or fetch and cache"""
        cached = self.redis.get(key)
        if cached:
            return json.loads(cached)

        data = await fetch_fn()
        self.redis.setex(key, ttl, json.dumps(data))
        return data

# Usage
@router.get("/dashboard/metrics")
async def get_metrics():
    cache = CacheService()
    return await cache.get_cached_or_fetch(
        'dashboard:metrics',
        fetch_fn=lambda: calculate_metrics(),
        ttl=300
    )
```

**3. Database Indexes**
```python
# Ensure indexes exist
await db.leads.create_index([("status", 1), ("created_at", -1)])
await db.deals.create_index([("stage", 1), ("value", -1)])
await db.activities.create_index([("entity_type", 1), ("entity_id", 1), ("created_at", -1)])
```

---

### Frontend Optimizations

**1. Lazy Loading Routes**
```typescript
// app-routing.module.ts

const routes: Routes = [
  {
    path: 'leads',
    loadChildren: () => import('./features/leads/leads.module').then(m => m.LeadsModule)
  },
  {
    path: 'deals',
    loadChildren: () => import('./features/deals/deals.module').then(m => m.DealsModule)
  }
];
```

**2. Code Splitting**
```typescript
// angular.json - Budget configuration

"budgets": [
  {
    "type": "initial",
    "maximumWarning": "500kb",
    "maximumError": "1mb"
  },
  {
    "type": "anyComponentStyle",
    "maximumWarning": "2kb",
    "maximumError": "4kb"
  }
]
```

**3. Image Optimization**
```html
<!-- Lazy loading images -->
<img
  [lazyLoad]="imageUrl"
  [defaultImage]="placeholder"
  alt="Lead avatar" />

<!-- Responsive images -->
<img
  srcset="image-320w.jpg 320w,
          image-640w.jpg 640w,
          image-1024w.jpg 1024w"
  sizes="(max-width: 640px) 100vw, 640px"
  src="image-640w.jpg"
  alt="Company logo" />
```

**4. Virtual Scrolling (Large Lists)**
```typescript
// Lead list with virtual scroll

<cdk-virtual-scroll-viewport itemSize="100" class="list-viewport">
  <div *cdkVirtualFor="let lead of leads" class="lead-item">
    <!-- Lead content -->
  </div>
</cdk-virtual-scroll-viewport>
```

**5. OnPush Change Detection**
```typescript
@Component({
  selector: 'app-lead-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `...`
})
export class LeadCardComponent {
  @Input() lead!: Lead;
}
```

**6. Track By Function**
```typescript
trackByLeadId(index: number, lead: Lead): string {
  return lead.id;
}
```

```html
<div *ngFor="let lead of leads; trackBy: trackByLeadId">
  <!-- Content -->
</div>
```

---

## 🚀 Build Optimization

**Production Build**
```bash
ng build --configuration production --optimization --build-optimizer
```

**Webpack Bundle Analyzer**
```bash
npm install -g webpack-bundle-analyzer
ng build --stats-json
webpack-bundle-analyzer dist/stats.json
```

---

## 📊 Performance Monitoring

```typescript
// src/app/services/performance.service.ts

export class PerformanceService {
  logPageLoad(pageName: string): void {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

    console.log(`${pageName} Performance:`, {
      DNS: navigation.domainLookupEnd - navigation.domainLookupStart,
      TCP: navigation.connectEnd - navigation.connectStart,
      Request: navigation.responseStart - navigation.requestStart,
      Response: navigation.responseEnd - navigation.responseStart,
      DOM: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      Total: navigation.loadEventEnd - navigation.fetchStart
    });
  }

  measureApiCall(endpoint: string, duration: number): void {
    // Send to monitoring service
    console.log(`API ${endpoint}: ${duration}ms`);
  }
}
```

---

## ✅ Performance Targets

- [ ] **Lighthouse Performance**: > 80
- [ ] **First Contentful Paint**: < 1.5s
- [ ] **Time to Interactive**: < 3s
- [ ] **Initial Bundle Size**: < 500KB
- [ ] **API Response (p95)**: < 500ms
- [ ] **Database Queries**: < 100ms

---

## 🔧 Optimization Checklist

### Backend
- [ ] Add Redis caching for frequently accessed data
- [ ] Optimize database queries (remove N+1)
- [ ] Add database indexes on filtered/sorted fields
- [ ] Implement pagination on all list endpoints
- [ ] Compress API responses (gzip)
- [ ] Use connection pooling (MongoDB)

### Frontend
- [ ] Lazy load all feature modules
- [ ] Implement virtual scrolling for long lists
- [ ] Use OnPush change detection where possible
- [ ] Add trackBy functions to *ngFor
- [ ] Lazy load images
- [ ] Code split large dependencies
- [ ] Minify and compress assets
- [ ] Use CDN for static assets

---

**Status**: 🔵 Pronto para Implementação
**Estimativa**: 3 dias
