# Marco 034: Notifications System
> Backend + Frontend - Sistema completo de notificações | 4 dias

**Responsável**: Backend Dev + Frontend Dev
**Revisor**: Tech Lead
**Status**: 🔵 Planejado

---

## 🎯 Objetivo

Implementar sistema completo de notificações com web push, email alerts, in-app notification center, preferências granulares, e AI prioritization.

---

## 📋 Key Features

- **Web Push Notifications**: Firebase Cloud Messaging (FCM)
- **Email Notifications**: Triggered emails
- **In-App Center**: Notification inbox
- **Smart Prioritization**: AI-determined urgency
- **Granular Preferences**: Control per notification type
- **Quiet Hours**: Do not disturb mode

---

## 🔔 Backend Implementation

```python
# src/services/notification_service.py

from typing import Dict, List, Optional
from firebase_admin import messaging
import firebase_admin

class NotificationService:
    """
    Serviço centralizado de notificações
    """

    def __init__(self):
        # Initialize Firebase (if not already)
        if not firebase_admin._apps:
            cred = firebase_admin.credentials.Certificate('firebase-credentials.json')
            firebase_admin.initialize_app(cred)

    async def send_notification(
        self,
        user_id: str,
        type: str,
        title: str,
        message: str,
        action_url: str = None,
        entity_type: str = None,
        entity_id: str = None,
        priority: str = 'medium'
    ):
        """
        Envia notificação através de todos os canais configurados
        """
        # 1. Get user preferences
        prefs = await self._get_user_preferences(user_id)

        # 2. Check quiet hours
        if self._is_quiet_hours(prefs):
            priority = 'low'  # Downgrade priority

        # 3. Calculate AI urgency score
        urgency_score = await self._calculate_urgency(type, entity_type, entity_id)

        # 4. Create notification record
        notification = {
            'user_id': ObjectId(user_id),
            'type': type,
            'title': title,
            'message': message,
            'action_url': action_url,
            'entity_type': entity_type,
            'entity_id': ObjectId(entity_id) if entity_id else None,
            'priority': priority,
            'urgency_score': urgency_score,
            'read': False,
            'channels': {
                'push_sent': False,
                'email_sent': False
            },
            'created_at': datetime.utcnow()
        }

        result = await db.notifications.insert_one(notification)
        notification_id = str(result.inserted_id)

        # 5. Send via channels (based on preferences)
        # Push notification
        if prefs.get('push', {}).get(type, True):
            await self._send_push(user_id, title, message, action_url, notification_id)

        # Email notification
        if prefs.get('email', {}).get(type, True) and urgency_score > 60:
            await self._send_email(user_id, title, message, action_url)

        return notification_id

    async def _send_push(
        self,
        user_id: str,
        title: str,
        body: str,
        action_url: str,
        notification_id: str
    ):
        """
        Envia push notification via FCM
        """
        # Get user's FCM token
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        fcm_token = user.get('fcm_token')

        if not fcm_token:
            return

        message = messaging.Message(
            notification=messaging.Notification(
                title=title,
                body=body
            ),
            data={
                'action_url': action_url or '',
                'notification_id': notification_id
            },
            token=fcm_token,
            webpush=messaging.WebpushConfig(
                notification=messaging.WebpushNotification(
                    icon='/assets/icons/icon-192x192.png',
                    badge='/assets/icons/badge-72x72.png',
                    vibrate=[200, 100, 200]
                ),
                fcm_options=messaging.WebpushFCMOptions(
                    link=action_url
                )
            )
        )

        try:
            response = messaging.send(message)

            # Mark as sent
            await db.notifications.update_one(
                {'_id': ObjectId(notification_id)},
                {
                    '$set': {
                        'channels.push_sent': True,
                        'channels.push_sent_at': datetime.utcnow()
                    }
                }
            )

        except Exception as e:
            print(f"Failed to send push: {e}")

    async def _send_email(
        self,
        user_id: str,
        title: str,
        message: str,
        action_url: str
    ):
        """
        Envia email notification
        """
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        email = user.get('email')

        # TODO: Implement email sending
        # Use template + SendGrid/AWS SES
        pass

    async def _calculate_urgency(
        self,
        type: str,
        entity_type: str,
        entity_id: str
    ) -> int:
        """
        Calcula urgency score (0-100) usando AI
        """
        # Base scores per type
        base_scores = {
            'deal_won': 90,
            'deal_lost': 70,
            'hot_lead': 80,
            'task_due': 85,
            'mention': 60,
            'new_lead': 50
        }

        score = base_scores.get(type, 50)

        # Adjust based on entity context (future: AI model)
        if entity_type == 'deal':
            deal = await db.deals.find_one({'_id': ObjectId(entity_id)})
            if deal and deal.get('value', 0) > 100000:  # High value
                score += 10

        return min(100, score)

    async def _get_user_preferences(self, user_id: str) -> Dict:
        """Get notification preferences"""
        prefs = await db.user_preferences.find_one({'user_id': user_id})
        if not prefs:
            return self._default_preferences()

        return prefs.get('notification_preferences', self._default_preferences())

    def _default_preferences(self) -> Dict:
        """Default notification preferences"""
        return {
            'email': {
                'new_lead': True,
                'deal_won': True,
                'deal_lost': True,
                'task_due': True,
                'mention': True
            },
            'push': {
                'new_lead': True,
                'deal_won': True,
                'deal_lost': True,
                'task_due': True,
                'mention': True
            },
            'quiet_hours': {
                'enabled': False,
                'start': '22:00',
                'end': '08:00'
            }
        }

    def _is_quiet_hours(self, prefs: Dict) -> bool:
        """Check if current time is in quiet hours"""
        quiet = prefs.get('quiet_hours', {})
        if not quiet.get('enabled'):
            return False

        now = datetime.now().time()
        start = datetime.strptime(quiet['start'], '%H:%M').time()
        end = datetime.strptime(quiet['end'], '%H:%M').time()

        if start < end:
            return start <= now <= end
        else:  # Overnight
            return now >= start or now <= end
```

---

## 🔌 API Endpoints

```python
@router.get("/notifications")
async def list_notifications(
    read: Optional[bool] = None,
    skip: int = 0,
    limit: int = 20,
    current_user: str = Depends(get_current_user)
):
    """Lista notificações"""
    filter_query = {'user_id': ObjectId(current_user)}
    if read is not None:
        filter_query['read'] = read

    notifications = await db.notifications.find(filter_query)\
        .sort('created_at', -1)\
        .skip(skip)\
        .limit(limit)\
        .to_list(length=limit)

    return [
        {
            'id': str(n['_id']),
            'type': n['type'],
            'title': n['title'],
            'message': n['message'],
            'action_url': n.get('action_url'),
            'priority': n['priority'],
            'read': n['read'],
            'created_at': n['created_at']
        }
        for n in notifications
    ]

@router.put("/notifications/{id}/read")
async def mark_as_read(id: str):
    """Marca como lida"""
    await db.notifications.update_one(
        {'_id': ObjectId(id)},
        {
            '$set': {
                'read': True,
                'read_at': datetime.utcnow()
            }
        }
    )
    return {"status": "marked_as_read"}

@router.put("/notifications/read-all")
async def mark_all_as_read(current_user: str = Depends(get_current_user)):
    """Marca todas como lidas"""
    await db.notifications.update_many(
        {'user_id': ObjectId(current_user), 'read': False},
        {
            '$set': {
                'read': True,
                'read_at': datetime.utcnow()
            }
        }
    )
    return {"status": "all_marked_as_read"}

@router.post("/notifications/subscribe")
async def subscribe_push(
    fcm_token: str,
    current_user: str = Depends(get_current_user)
):
    """Subscribe to push notifications"""
    await db.users.update_one(
        {'_id': ObjectId(current_user)},
        {'$set': {'fcm_token': fcm_token}}
    )
    return {"status": "subscribed"}
```

---

## 🎨 Frontend - Notification Center

```typescript
// src/app/features/notifications/components/notification-center/notification-center.component.ts

@Component({
  selector: 'app-notification-center',
  template: `
    <button mat-icon-button [matMenuTriggerFor]="menu">
      <mat-icon [matBadge]="unreadCount" matBadgeColor="warn">
        notifications
      </mat-icon>
    </button>

    <mat-menu #menu="matMenu" class="notification-menu">
      <div class="menu-header">
        <h3>Notifications</h3>
        <button mat-button (click)="markAllAsRead()">Mark all read</button>
      </div>

      <div class="notifications-list">
        <div
          *ngFor="let notification of notifications"
          class="notification-item"
          [class.unread]="!notification.read"
          (click)="onNotificationClick(notification)">

          <mat-icon [class]="'priority-' + notification.priority">
            {{ getNotificationIcon(notification.type) }}
          </mat-icon>

          <div class="notification-content">
            <strong>{{ notification.title }}</strong>
            <p>{{ notification.message }}</p>
            <small>{{ notification.created_at | timeAgo }}</small>
          </div>
        </div>

        <div class="empty-state" *ngIf="notifications.length === 0">
          <mat-icon>notifications_none</mat-icon>
          <p>No notifications</p>
        </div>
      </div>

      <button mat-button class="view-all" [routerLink]="['/notifications']">
        View All
      </button>
    </mat-menu>
  `
})
export class NotificationCenterComponent implements OnInit {
  notifications: any[] = [];
  unreadCount: number = 0;

  ngOnInit(): void {
    this.loadNotifications();
    this.subscribeToRealtime();
  }

  loadNotifications(): void {
    this.notificationService.getNotifications(false, 5).subscribe(
      data => {
        this.notifications = data;
        this.unreadCount = data.filter(n => !n.read).length;
      }
    );
  }

  subscribeToRealtime(): void {
    // WebSocket or SSE for real-time notifications
    // TODO: Implement
  }

  onNotificationClick(notification: any): void {
    // Mark as read
    this.notificationService.markAsRead(notification.id).subscribe();

    // Navigate
    if (notification.action_url) {
      this.router.navigate([notification.action_url]);
    }
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe(() => {
      this.notifications.forEach(n => n.read = true);
      this.unreadCount = 0;
    });
  }
}
```

---

## ✅ Critérios de Aceitação

- [ ] Web push notifications funcionam
- [ ] Email notifications funcionam
- [ ] In-app notification center funciona
- [ ] Unread badge atualiza em real-time
- [ ] Mark as read/unread funciona
- [ ] Preferences são respeitadas
- [ ] Quiet hours funcionam
- [ ] AI prioritization calcula urgency
- [ ] Click em notification navega
- [ ] FCM token subscription funciona

---

## 🔗 Dependências

- Firebase Cloud Messaging (FCM)
- `firebase-admin` (Python)
- Email service (SendGrid ou AWS SES)

---

**Status**: 🔵 Pronto para Implementação
**Estimativa**: 4 dias
