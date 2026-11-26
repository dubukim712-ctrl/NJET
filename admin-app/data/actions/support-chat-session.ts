'use server';

import { getAuthContext } from '@/data/auth/guards';
import { getGuestChatTokenHash } from '@/data/support-chat/guest-session';
import { createClient } from '@/data/supabase/server';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

export async function hasOpenWebChatAction(): Promise<boolean> {
  try {
    const context = await getAuthContext();
    if (context) {
      if (context.profile?.scope !== 'customer'
        || !hasPermission(context.profile, PERMISSIONS.storefrontAccess)) return false;

      const { data, error } = await context.supabase.from('support_chat_threads')
        .select('id')
        .eq('customer_user_id', context.user.id)
        .eq('channel', 'web')
        .eq('status', 'open')
        .maybeSingle();
      return !error && data !== null;
    }

    const tokenHash = await getGuestChatTokenHash();
    if (!tokenHash) return false;

    const supabase = await createClient();
    const { data, error } = await supabase.rpc('support_chat_guest_thread', {
      p_token_hash: tokenHash,
    });
    return !error && data?.[0]?.status === 'open';
  } catch {
    return false;
  }
}
