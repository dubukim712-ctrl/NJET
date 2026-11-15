export type SupportChatTables = {
  support_chat_threads: {
    Row: {
      id: string;
      customer_kind: 'account' | 'guest';
      customer_user_id: string | null;
      customer_name: string;
      guest_email: string | null;
      guest_email_verified_at: string | null;
      guest_phone: string | null;
      status: 'open' | 'resolved';
      last_message_at: string;
      resolved_at: string | null;
      resolved_by: string | null;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      customer_kind: 'account' | 'guest';
      customer_user_id?: string | null;
      customer_name: string;
      guest_email?: string | null;
      guest_email_verified_at?: string | null;
      guest_phone?: string | null;
      status?: 'open' | 'resolved';
      last_message_at?: string;
      resolved_at?: string | null;
      resolved_by?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      customer_kind?: 'account' | 'guest';
      customer_user_id?: string | null;
      customer_name?: string;
      guest_email?: string | null;
      guest_email_verified_at?: string | null;
      guest_phone?: string | null;
      status?: 'open' | 'resolved';
      last_message_at?: string;
      resolved_at?: string | null;
      resolved_by?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Relationships: [];
  };
  support_chat_messages: {
    Row: {
      id: string;
      thread_id: string;
      sender_role: 'customer' | 'staff';
      sender_user_id: string | null;
      sender_name: string;
      body: string | null;
      deleted_at: string | null;
      deleted_by_user_id: string | null;
      created_at: string;
    };
    Insert: {
      id?: string;
      thread_id: string;
      sender_role: 'customer' | 'staff';
      sender_user_id?: string | null;
      sender_name: string;
      body?: string | null;
      deleted_at?: string | null;
      deleted_by_user_id?: string | null;
      created_at?: string;
    };
    Update: {
      id?: string;
      thread_id?: string;
      sender_role?: 'customer' | 'staff';
      sender_user_id?: string | null;
      sender_name?: string;
      body?: string | null;
      deleted_at?: string | null;
      deleted_by_user_id?: string | null;
      created_at?: string;
    };
    Relationships: [
      {
        foreignKeyName: 'support_chat_messages_thread_id_fkey';
        columns: ['thread_id'];
        isOneToOne: false;
        referencedRelation: 'support_chat_threads';
        referencedColumns: ['id'];
      },
    ];
  };
  support_chat_message_hides: {
    Row: {
      id: number;
      message_id: string;
      user_id: string | null;
      guest_thread_id: string | null;
      created_at: string;
    };
    Insert: {
      id?: number;
      message_id: string;
      user_id?: string | null;
      guest_thread_id?: string | null;
      created_at?: string;
    };
    Update: {
      id?: number;
      message_id?: string;
      user_id?: string | null;
      guest_thread_id?: string | null;
      created_at?: string;
    };
    Relationships: [];
  };
  support_chat_guest_sessions: {
    Row: {
      id: string;
      thread_id: string;
      token_hash: string;
      realtime_key: string;
      expires_at: string;
      last_used_at: string;
      created_at: string;
    };
    Insert: {
      id?: string;
      thread_id: string;
      token_hash: string;
      realtime_key: string;
      expires_at: string;
      last_used_at?: string;
      created_at?: string;
    };
    Update: {
      id?: string;
      thread_id?: string;
      token_hash?: string;
      realtime_key?: string;
      expires_at?: string;
      last_used_at?: string;
      created_at?: string;
    };
    Relationships: [];
  };
  support_chat_recovery_challenges: {
    Row: {
      id: string;
      thread_id: string | null;
      guest_email: string;
      customer_name: string;
      code_hash: string;
      attempt_count: number;
      expires_at: string;
      consumed_at: string | null;
      created_at: string;
    };
    Insert: {
      id?: string;
      thread_id?: string | null;
      guest_email: string;
      customer_name: string;
      code_hash: string;
      attempt_count?: number;
      expires_at: string;
      consumed_at?: string | null;
      created_at?: string;
    };
    Update: {
      id?: string;
      thread_id?: string | null;
      guest_email?: string;
      customer_name?: string;
      code_hash?: string;
      attempt_count?: number;
      expires_at?: string;
      consumed_at?: string | null;
      created_at?: string;
    };
    Relationships: [];
  };
  support_chat_staff_readers: {
    Row: {
      user_id: string;
      available_since: string;
    };
    Insert: {
      user_id: string;
      available_since?: string;
    };
    Update: {
      user_id?: string;
      available_since?: string;
    };
    Relationships: [];
  };
  support_chat_thread_reads: {
    Row: {
      thread_id: string;
      user_id: string;
      last_read_at: string;
    };
    Insert: {
      thread_id: string;
      user_id: string;
      last_read_at?: string;
    };
    Update: {
      thread_id?: string;
      user_id?: string;
      last_read_at?: string;
    };
    Relationships: [];
  };
};
