import 'server-only';

import { z } from 'zod';
import { createServiceClient } from '@/data/supabase/service';

const graph = 'https://graph.facebook.com/v21.0/';
const fallbackName = 'Messenger customer';

function graphUrl(path: string, token: string) {
  const url = new URL(path, graph);
  url.searchParams.set('access_token', token);
  return url;
}

async function fetchProfile(psid: string) {
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  if (!token) return null;
  try {
    const url = graphUrl(encodeURIComponent(psid), token);
    url.searchParams.set('fields', 'first_name,last_name,profile_pic');
    const response = await fetch(url, { signal: AbortSignal.timeout(3000), cache: 'no-store' });
    if (!response.ok) return null;
    const profile = z.object({
      first_name: z.string().optional(),
      last_name: z.string().optional(),
      profile_pic: z.url({ protocol: /^https$/ }).optional(),
    }).safeParse(await response.json());
    return profile.success ? profile.data : null;
  } catch {
    return null;
  }
}

export async function receiveMessengerMessage(psid: string, mid: string, body: string) {
  const supabase = createServiceClient();
  const { data: existing, error: lookupError } = await supabase
    .from('support_chat_threads')
    .select('customer_name')
    .eq('messenger_psid', psid)
    .maybeSingle();
  if (lookupError) throw lookupError;

  const profile = !existing || existing.customer_name === fallbackName
    ? await fetchProfile(psid)
    : null;
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim();
  const { error } = await supabase.rpc('support_chat_receive_messenger', {
    p_psid: psid,
    p_mid: mid,
    p_body: body,
    p_name: name.slice(0, 120) || fallbackName,
    p_avatar: profile?.profile_pic ?? null,
  });
  if (error) throw error;
}

export async function sendMessengerReply(
  thread: { id: string; messenger_psid: string | null },
  staff: { id: string; full_name: string | null },
  body: string,
) {
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  if (!token || !thread.messenger_psid) {
    return { success: false, error: 'Messenger sending is not configured.' } as const;
  }
  if (Array.from(body).length > 2000) {
    return { success: false, error: 'Messenger replies can contain up to 2,000 characters.' } as const;
  }

  const supabase = createServiceClient();
  let mid: string;
  try {
    const response = await fetch(graphUrl('me/messages', token), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: thread.messenger_psid },
        messaging_type: 'RESPONSE',
        message: { text: body },
      }),
      signal: AbortSignal.timeout(8000),
    });
    const payload = z.object({
      message_id: z.string().min(1).optional(),
      error: z.object({ code: z.number().optional(), error_subcode: z.number().optional() }).optional(),
    }).safeParse(await response.json());
    if (payload.success && payload.data.error?.error_subcode === 2018278) {
      return {
        success: false,
        error: 'The Messenger 24-hour reply window has closed. Wait for the customer to message again.',
      } as const;
    }
    if (!response.ok || !payload.success || payload.data.error || !payload.data.message_id) {
      return { success: false, error: 'Messenger rejected the reply. Check the Page connection and reply window.' } as const;
    }
    mid = payload.data.message_id;
  } catch {
    return { success: false, error: 'Messenger did not confirm delivery. Check Messenger before resending.' } as const;
  }

  try {
    const { data, error } = await supabase
      .from('support_chat_messages')
      .insert({
        thread_id: thread.id,
        sender_role: 'staff',
        sender_user_id: staff.id,
        sender_name: staff.full_name?.trim().slice(0, 120) || 'Staff',
        body,
        external_message_id: mid,
      })
      .select('id')
      .single();
    if (error || !data) throw error;
    return { success: true, data: { messageId: data.id } } as const;
  } catch {
    return { success: false, error: 'Messenger accepted the reply, but it could not be saved in the inbox. Do not resend it.' } as const;
  }
}
