export type NotificationEventType =
  | 'new_order'
  | 'service_request'
  | 'technician_assignment'
  | 'low_stock'
  | 'out_of_stock';

export type AdminNotification = {
  id: string;
  recipient_user_id: string;
  event_type: NotificationEventType;
  title: string;
  message: string;
  href: string;
  entity_type: 'order' | 'service_appointment' | 'product_variant';
  entity_id: string;
  branch_id: string | null;
  read_at: string | null;
  resolved_at: string | null;
  created_at: string;
};

type Table<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export type AdminNotificationTables = {
  notifications: Table<AdminNotification>;
};
