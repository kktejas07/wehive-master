export type NotificationKind =
  | 'status_update' | 'document_request' | 'payment_due'
  | 'message' | 'appointment' | 'general';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
  link?: string;
}
