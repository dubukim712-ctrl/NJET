'use server';

import { toUserFriendlyError } from '@/data/supabase/user-friendly-errors';

import { createClient } from '@/data/supabase/server';
import {
  createGuestChatToken,
  getGuestChatTokenHash,
  setGuestChatToken,
} from '@/data/support-chat/guest-session';
import { getAuthContext } from '@/data/auth/guards';
import { sendMessengerReply } from '@/data/support-chat/messenger';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import {
  startGuestPhoneChatSchema,
  supportChatDeleteSchema,
  supportChatInboxSchema,
  supportChatMessageSchema,
  supportChatMessagesSchema,
  supportChatReadSchema,
  supportChatStatusSchema,
} from '@/lib/validations/support-chat';
import type { ActionResult } from '@/data/actions/auth';
import type { SupportChatMessage, SupportChatThread } from '@/types/support-chat';

export type StartGuestChatResult = { threadId: string; realtimeKey: string };

export async function startGuestChatAction(
  input: unknown,
): Promise<ActionResult<StartGuestChatResult>> {
  const validation = startGuestPhoneChatSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.flatten().fieldErrors.phone?.[0] ?? 'Enter your name to start a chat.',
      fieldErrors: validation.error.flatten().fieldErrors,
    };
  }

  try {
    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    if (authData.user) {
      return { success: false, error: 'Sign out before starting a guest chat.' };
    }

    const { token, tokenHash, realtimeKey } = createGuestChatToken();
    const { data, error } = await supabase.rpc('support_chat_start_guest', {
      p_name: validation.data.name,
      p_email: null,
      p_phone: validation.data.phone,
      p_token_hash: tokenHash,
      p_realtime_key: realtimeKey,
    });
    if (error || !data?.[0]) {
      return { success: false, error: 'Chat could not be started. Please try again.' };
    }
    await setGuestChatToken(token);
    return {
      success: true,
      data: {
        threadId: data[0].thread_id,
        realtimeKey: data[0].realtime_key,
      },
    };
  } catch {
    return { success: false, error: 'Chat could not be started. Please try again.' };
  }
}

export async function loadSupportChatMessagesAction(
  input: unknown,
): Promise<ActionResult<SupportChatMessage[]>> {
  const validation = supportChatMessagesSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: 'The chat history request is invalid.' };
  }

  try {
    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    const guestTokenHash = authData.user ? null : await getGuestChatTokenHash();

    if (!authData.user && !guestTokenHash) {
      return { success: false, error: 'Start a chat or recover guest access first.' };
    }

    if (guestTokenHash) {
      const { data, error } = await supabase.rpc('support_chat_guest_messages', {
        p_token_hash: guestTokenHash,
        p_before_created_at: validation.data.beforeCreatedAt ?? null,
        p_before_id: validation.data.beforeId ?? null,
        p_limit: 50,
      });
      if (error) {
        return { success: false, error: 'Chat history could not be loaded.' };
      }
      return { success: true, data: data ?? [] };
    }

    let query = supabase
      .from('support_chat_messages')
      .select('id, sender_role, sender_user_id, sender_name, body, deleted_at, created_at, external_message_id')
      .eq('thread_id', validation.data.threadId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(50);

    if (validation.data.beforeCreatedAt && validation.data.beforeId) {
      query = query.or(
        `created_at.lt.${validation.data.beforeCreatedAt},and(created_at.eq.${validation.data.beforeCreatedAt},id.lt.${validation.data.beforeId})`,
      );
    }

    const { data, error } = await query;
    if (error) {
      return { success: false, error: 'Chat history could not be loaded.' };
    }
    return { success: true, data: data ?? [] };
  } catch {
    return { success: false, error: 'Chat history could not be loaded.' };
  }
}

export async function sendSupportChatMessageAction(
  input: unknown,
): Promise<ActionResult<{ messageId: string }>> {
  const validation = supportChatMessageSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      error: 'Enter a message between 1 and 4000 characters.',
      fieldErrors: validation.error.flatten().fieldErrors,
    };
  }

  try {
    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    const guestTokenHash = authData.user ? null : await getGuestChatTokenHash();
    if (!authData.user && !guestTokenHash) {
      return { success: false, error: 'Start a chat or recover guest access first.' };
    }

    if (authData.user) {
      const context = await getAuthContext();
      if (context?.profile && hasPermission(context.profile, PERMISSIONS.supportChatManage)) {
        const { data: thread, error } = await context.supabase.from('support_chat_threads')
          .select('id, channel, messenger_psid').eq('id', validation.data.threadId).maybeSingle();
        if (error) return { success: false, error: 'The conversation could not be loaded.' };
        if (thread?.channel === 'messenger') {
          return await sendMessengerReply(thread, context.profile, validation.data.body);
        }
      }
    }

    const { data, error } = await supabase.rpc('support_chat_send_message', {
      p_thread_id: validation.data.threadId,
      p_body: validation.data.body,
      ...(guestTokenHash ? { p_guest_token_hash: guestTokenHash } : {}),
    });
    if (error || !data) {
      return { success: false, error: toUserFriendlyError(error, 'Message could not be sent.') };
    }
    return { success: true, data: { messageId: data } };
  } catch {
    return { success: false, error: 'Message could not be sent. Please try again.' };
  }
}

export async function deleteSupportChatMessageAction(
  input: unknown,
): Promise<ActionResult> {
  const validation = supportChatDeleteSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: 'The delete request is invalid.' };
  }

  try {
    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    const guestTokenHash = authData.user ? null : await getGuestChatTokenHash();
    if (!authData.user && !guestTokenHash) {
      return { success: false, error: 'Start a chat or recover guest access first.' };
    }

    const { error } = await supabase.rpc('support_chat_delete_message', {
      p_message_id: validation.data.messageId,
      p_scope: validation.data.scope,
      ...(guestTokenHash ? { p_guest_token_hash: guestTokenHash } : {}),
    });
    if (error) {
      return { success: false, error: toUserFriendlyError(error, 'Message could not be deleted.') };
    }
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: 'Message could not be deleted. Please try again.' };
  }
}

export async function listSupportChatThreadsAction(
  input: unknown,
  userId: string,
): Promise<ActionResult<SupportChatThread[]>> {
  const validation = supportChatInboxSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: 'The chat inbox request is invalid.' };
  }

  try {
    const context = await getAuthContext();
    if (!context || context.user.id !== userId || !hasPermission(context.profile, PERMISSIONS.supportChatManage)) {
      return { success: false, error: 'You do not have permission to view customer chats.' };
    }

    const { supabase } = context;
    const { data, error } = await supabase.rpc('support_chat_list_threads', {
      p_status: validation.data.status === 'all' ? null : validation.data.status,
      p_search: validation.data.search || null,
      p_before_last_message_at: validation.data.beforeLastMessageAt ?? null,
      p_before_thread_id: validation.data.beforeThreadId ?? null,
      p_limit: 50,
    });
    if (error) {
      return { success: false, error: 'The chat inbox could not be loaded.' };
    }
    return { success: true, data: data ?? [] };
  } catch {
    return { success: false, error: 'The chat inbox could not be loaded.' };
  }
}

export async function setSupportChatStatusAction(
  input: unknown,
): Promise<ActionResult> {
  const validation = supportChatStatusSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: 'The chat status request is invalid.' };
  }

  try {
    const context = await getAuthContext();
    if (!context || !hasPermission(context.profile, PERMISSIONS.supportChatManage)) {
      return { success: false, error: 'You do not have permission to manage customer chats.' };
    }

    const { supabase } = context;
    const { error } = await supabase.rpc('support_chat_set_status', {
      p_thread_id: validation.data.threadId,
      p_status: validation.data.status,
    });
    if (error) {
      return { success: false, error: 'Chat status could not be updated.' };
    }
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: 'Chat status could not be updated.' };
  }
}

export async function getSupportChatUnreadCountAction(): Promise<ActionResult<number>> {
  try {
    const context = await getAuthContext();
    if (!context || !hasPermission(context.profile, PERMISSIONS.supportChatManage)) {
      return { success: false, error: 'You do not have permission to view customer chats.' };
    }

    const { data, error } = await context.supabase.rpc('support_chat_unread_count');
    if (error || data === null) {
      return { success: false, error: 'Unread chats could not be loaded.' };
    }
    return { success: true, data };
  } catch {
    return { success: false, error: 'Unread chats could not be loaded.' };
  }
}

export async function markSupportChatThreadReadAction(input: unknown): Promise<ActionResult> {
  const validation = supportChatReadSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: 'The chat read request is invalid.' };
  }

  try {
    const context = await getAuthContext();
    if (!context || !hasPermission(context.profile, PERMISSIONS.supportChatManage)) {
      return { success: false, error: 'You do not have permission to manage customer chats.' };
    }

    const { error } = await context.supabase.rpc('support_chat_mark_thread_read', {
      p_thread_id: validation.data.threadId,
      p_message_id: validation.data.messageId,
    });
    if (error) {
      return { success: false, error: 'The chat could not be marked as read.' };
    }
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: 'The chat could not be marked as read.' };
  }
}
