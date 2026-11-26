export type DatabaseSupportChatFunctions = {
  support_chat_account_thread: {
    Args: Record<PropertyKey, never>;
    Returns: string;
  };
  support_chat_start_guest: {
    Args: {
      p_name: string;
      p_email: string | null;
      p_phone: string;
      p_token_hash: string;
      p_realtime_key: string;
    };
    Returns: {
      thread_id: string;
      guest_session_id: string | null;
      realtime_key: string;
    }[];
  };
  support_chat_guest_thread: {
    Args: { p_token_hash: string };
    Returns: {
      thread_id: string;
      customer_name: string;
      guest_email: string | null;
      guest_phone: string | null;
      status: 'open' | 'resolved';
      last_message_at: string;
      guest_session_id: string;
      realtime_key: string;
    }[];
  };
  support_chat_guest_messages: {
    Args: {
      p_token_hash: string;
      p_before_created_at: string | null;
      p_before_id: string | null;
      p_limit: number;
    };
    Returns: {
      id: string;
      sender_role: 'customer' | 'staff';
      sender_user_id: string | null;
      sender_name: string;
      body: string | null;
      deleted_at: string | null;
      created_at: string;
    }[];
  };
  support_chat_send_message: {
    Args: {
      p_thread_id: string;
      p_body: string;
      p_guest_token_hash?: string | null;
    };
    Returns: string;
  };
  support_chat_delete_message: {
    Args: {
      p_message_id: string;
      p_scope: string;
      p_guest_token_hash?: string | null;
    };
    Returns: boolean;
  };
  support_chat_set_status: {
    Args: { p_thread_id: string; p_status: string };
    Returns: undefined;
  };
  support_chat_list_threads: {
    Args: {
      p_status?: string | null;
      p_search?: string | null;
      p_before_last_message_at?: string | null;
      p_before_thread_id?: string | null;
      p_limit?: number;
    };
    Returns: {
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
    }[];
  };
  support_chat_receive_messenger: {
    Args: { p_psid: string; p_mid: string; p_body: string; p_name: string; p_avatar: string | null };
    Returns: undefined;
  };
  support_chat_unread_count: {
    Args: Record<PropertyKey, never>;
    Returns: number;
  };
  support_chat_mark_thread_read: {
    Args: { p_thread_id: string };
    Returns: undefined;
  };
  support_chat_request_guest_email_access: {
    Args: { p_name: string; p_email: string; p_code_hash: string };
    Returns: boolean;
  };
  support_chat_verify_guest_email_access: {
    Args: {
      p_email: string;
      p_code_hash: string;
      p_token_hash: string;
      p_realtime_key: string;
    };
    Returns: { thread_id: string; realtime_key: string }[];
  };
};
