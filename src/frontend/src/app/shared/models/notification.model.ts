export type NotificationType =
  | 'lead_qualified'
  | 'lead_updated'
  | 'deal_won'
  | 'deal_lost'
  | 'deal_stage_changed'
  | 'activity_created'
  | 'ai_email_generated'
  | 'ai_prediction_updated'
  | 'system_notification';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  entity_type?: string;
  entity_id?: string;
  read: boolean;
  delivered_email: boolean;
  delivered_push: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
  unread_count: number;
}
