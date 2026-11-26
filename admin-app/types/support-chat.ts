export type SupportChatMessage = {
  id: string;
  external_message_id?: string | null;
  sender_role: 'customer' | 'staff';
  sender_user_id: string | null;
  sender_name: string;
  body: string | null;
  deleted_at: string | null;
  created_at: string;
};

export type SupportChatThread = {
  id: string;
  channel: 'web' | 'messenger';
  customer_kind: 'account' | 'guest';
  customer_name: string;
  guest_email: string | null;
  guest_phone: string | null;
  status: 'open' | 'resolved';
  last_message_at: string;
  last_message_body: string | null;
  last_message_deleted: boolean | null;
  last_sender_role: 'customer' | 'staff' | null;
  last_sender_name: string | null;
};

export type SupportChatCursor = {
  createdAt: string;
  id: string;
};

export type SupportChatResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };
