# Marco 033: Mobile Responsive
> Frontend - Experiência completa mobile + PWA | 5 dias

**Responsável**: Frontend Dev
**Revisor**: Designer
**Status**: 🔵 Planejado

---

## 🎯 Objetivo

Adaptar todas as telas para dispositivos móveis com design responsivo, touch gestures, e transformar em PWA instalável com suporte offline básico.

---

## 📋 Key Features

- **Responsive Design**: 320px (mobile) até 1920px (desktop)
- **Mobile Navigation**: Bottom nav ou hamburger menu
- **Touch Gestures**: Swipe, long-press, pull-to-refresh
- **PWA**: Manifest, service worker, installable
- **Offline Support**: Cache de dados essenciais
- **Touch-Friendly**: Targets ≥ 44x44px

---

## 📱 Responsive Breakpoints

```scss
// src/styles/_variables.scss

$breakpoints: (
  xs: 320px,   // Mobile portrait
  sm: 576px,   // Mobile landscape
  md: 768px,   // Tablet portrait
  lg: 1024px,  // Tablet landscape / Desktop
  xl: 1440px,  // Desktop large
  xxl: 1920px  // Desktop extra large
);

@mixin respond-to($breakpoint) {
  @media (min-width: map-get($breakpoints, $breakpoint)) {
    @content;
  }
}
```

---

## 🎨 Mobile Navigation

### Bottom Navigation (Mobile)

```typescript
// src/app/layout/components/mobile-nav/mobile-nav.component.ts

@Component({
  selector: 'app-mobile-nav',
  template: `
    <nav class="mobile-nav" *ngIf="isMobile">
      <a
        *ngFor="let item of navItems"
        [routerLink]="item.route"
        routerLinkActive="active"
        class="nav-item">
        <mat-icon>{{ item.icon }}</mat-icon>
        <span>{{ item.label }}</span>
      </a>
    </nav>
  `,
  styles: [`
    .mobile-nav {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 60px;
      background: white;
      border-top: 1px solid #e0e0e0;
      display: flex;
      justify-content: space-around;
      align-items: center;
      z-index: 100;

      .nav-item {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        padding: 8px;
        text-decoration: none;
        color: rgba(0, 0, 0, 0.6);
        transition: color 0.2s;

        mat-icon {
          font-size: 24px;
          width: 24px;
          height: 24px;
        }

        span {
          font-size: 11px;
        }

        &.active {
          color: #2196F3;
        }
      }
    }
  `]
})
export class MobileNavComponent {
  isMobile = false;

  navItems = [
    { route: '/dashboard', icon: 'home', label: 'Home' },
    { route: '/deals', icon: 'trending_up', label: 'Deals' },
    { route: '/leads', icon: 'people', label: 'Leads' },
    { route: '/activities', icon: 'inbox', label: 'Activity' },
    { route: '/settings', icon: 'settings', label: 'More' }
  ];

  constructor(private breakpointObserver: BreakpointObserver) {
    this.breakpointObserver
      .observe(['(max-width: 768px)'])
      .subscribe(result => {
        this.isMobile = result.matches;
      });
  }
}
```

---

## 👆 Touch Gestures

### Swipe to Delete (Lead List)

```typescript
// src/app/features/leads/components/lead-list-item/lead-list-item.component.ts

@Component({
  selector: 'app-lead-list-item',
  template: `
    <div class="swipeable-item"
         (swipeleft)="onSwipeLeft()"
         (swiperight)="onSwipeRight()">

      <div class="item-content" [style.transform]="'translateX(' + swipeOffset + 'px)'">
        <!-- Lead content -->
      </div>

      <div class="swipe-actions">
        <button mat-icon-button color="warn" (click)="onDelete()">
          <mat-icon>delete</mat-icon>
        </button>
      </div>
    </div>
  `
})
export class LeadListItemComponent {
  swipeOffset = 0;

  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent) {
    this.startX = event.touches[0].clientX;
  }

  @HostListener('touchmove', ['$event'])
  onTouchMove(event: TouchEvent) {
    const currentX = event.touches[0].clientX;
    const diff = currentX - this.startX;

    if (diff < 0) {  // Swipe left
      this.swipeOffset = Math.max(diff, -80);  // Max 80px
    }
  }

  @HostListener('touchend', ['$event'])
  onTouchEnd(event: TouchEvent) {
    if (this.swipeOffset < -40) {
      this.swipeOffset = -80;  // Show actions
    } else {
      this.swipeOffset = 0;  // Reset
    }
  }
}
```

---

## 📦 PWA Configuration

### Angular PWA Setup

```bash
ng add @angular/pwa
```

### Manifest (generated)

```json
// src/manifest.webmanifest

{
  "name": "Conductor CRM",
  "short_name": "CRM",
  "theme_color": "#2196F3",
  "background_color": "#ffffff",
  "display": "standalone",
  "scope": "/",
  "start_url": "/",
  "icons": [
    {
      "src": "assets/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "assets/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "assets/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable any"
    }
  ]
}
```

### Service Worker (ngsw-config.json)

```json
{
  "index": "/index.html",
  "assetGroups": [
    {
      "name": "app",
      "installMode": "prefetch",
      "resources": {
        "files": [
          "/favicon.ico",
          "/index.html",
          "/manifest.webmanifest",
          "/*.css",
          "/*.js"
        ]
      }
    },
    {
      "name": "assets",
      "installMode": "lazy",
      "updateMode": "prefetch",
      "resources": {
        "files": [
          "/assets/**",
          "/*.(eot|svg|cur|jpg|png|webp|gif|otf|ttf|woff|woff2|ani)"
        ]
      }
    }
  ],
  "dataGroups": [
    {
      "name": "api-cache",
      "urls": [
        "/api/v1/leads",
        "/api/v1/deals",
        "/api/v1/dashboard/metrics"
      ],
      "cacheConfig": {
        "maxSize": 100,
        "maxAge": "1h",
        "timeout": "5s",
        "strategy": "freshness"
      }
    }
  ]
}
```

---

## 📱 Mobile-Specific Components

### Pull to Refresh

```typescript
@Component({
  selector: 'app-pull-to-refresh',
  template: `
    <div class="pull-to-refresh" [class.refreshing]="refreshing">
      <div class="refresh-indicator">
        <mat-spinner *ngIf="refreshing" diameter="24"></mat-spinner>
        <mat-icon *ngIf="!refreshing">refresh</mat-icon>
      </div>
      <ng-content></ng-content>
    </div>
  `
})
export class PullToRefreshComponent {
  @Output() refresh = new EventEmitter<void>();
  refreshing = false;
  startY = 0;
  pullDistance = 0;

  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent) {
    if (window.scrollY === 0) {
      this.startY = event.touches[0].clientY;
    }
  }

  @HostListener('touchmove', ['$event'])
  onTouchMove(event: TouchEvent) {
    if (this.startY > 0) {
      const currentY = event.touches[0].clientY;
      this.pullDistance = currentY - this.startY;

      if (this.pullDistance > 80 && !this.refreshing) {
        this.refreshing = true;
        this.refresh.emit();
      }
    }
  }

  @HostListener('touchend')
  onTouchEnd() {
    this.startY = 0;
    this.pullDistance = 0;
    setTimeout(() => this.refreshing = false, 1000);
  }
}
```

---

## 📐 Responsive Components

### Responsive Lead List

```scss
.lead-list {
  // Desktop: Table
  @include respond-to(lg) {
    display: table;
    width: 100%;

    .lead-item {
      display: table-row;
    }
  }

  // Mobile: Cards
  @media (max-width: 767px) {
    .lead-item {
      display: block;
      margin-bottom: 16px;
      padding: 16px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
  }
}
```

---

## 🎯 Touch Targets

```scss
// Minimum touch target size
.touch-target {
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

// Increase spacing in mobile
@media (max-width: 768px) {
  .action-buttons button {
    margin: 8px;  // More spacing
  }

  mat-form-field {
    margin-bottom: 24px;  // More space between inputs
  }
}
```

---

## ✅ Critérios de Aceitação

- [ ] Todas as páginas responsivas (320px-1920px)
- [ ] Bottom navigation funciona em mobile
- [ ] Touch gestures funcionam (swipe, pull-to-refresh)
- [ ] PWA instalável (Add to Home Screen)
- [ ] Service Worker caching funciona
- [ ] Offline mode básico funciona
- [ ] Touch targets ≥ 44x44px
- [ ] Texto legível sem zoom (>= 16px)
- [ ] Forms funcionam em mobile
- [ ] Landscape mode funciona
- [ ] Lighthouse PWA score > 90

---

## 🔗 Dependências

- @angular/pwa
- @angular/cdk (gestures)
- HammerJS (touch events)

---

**Status**: 🔵 Pronto para Implementação
**Estimativa**: 5 dias
