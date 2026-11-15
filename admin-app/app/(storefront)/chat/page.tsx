import { redirect } from 'next/navigation';
import { createClient } from '@/data/supabase/server';
import { getAuthContext } from '@/data/auth/guards';
import {
  getPendingGuestChatRecovery,
  getGuestChatTokenHash,
} from '@/data/support-chat/guest-session';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { CustomerSupportChat } from '@/components/support-chat/CustomerSupportChat';

export const metadata = { title: 'Customer chat' };

export default async function CustomerChatPage() {
  const context = await getAuthContext();

  if (context?.user) {
    if (!context.profile) redirect('/no-access');
    if (context.profile.scope === 'staff') {
      redirect(
        hasPermission(context.profile, PERMISSIONS.supportChatManage)
          ? '/admin/chats'
          : '/no-access',
      );
    }
    if (
      context.profile.scope !== 'customer' ||
      !hasPermission(context.profile, PERMISSIONS.storefrontAccess)
    ) {
      redirect('/no-access');
    }

    const { data: threadId, error } = await context.supabase.rpc(
      'support_chat_account_thread',
    );
    return (
      <CustomerSupportChat
        mode="account"
        userId={context.user.id}
        initialThreadId={error ? null : threadId}
        initialRealtimeKey={null}
        initialError={error ? 'Your account chat could not be opened. Please try again.' : null}
      />
    );
  }

  const guestTokenHash = await getGuestChatTokenHash();
  const pendingRecovery = await getPendingGuestChatRecovery();
  if (!guestTokenHash) {
    return (
      <CustomerSupportChat
        mode="guest"
        userId={null}
        initialThreadId={null}
        initialRealtimeKey={null}
        initialRecovery={pendingRecovery}
      />
    );
  }

  let initialThreadId: string | null = null;
  let initialRealtimeKey: string | null = null;
  let initialError: string | null = null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('support_chat_guest_thread', {
      p_token_hash: guestTokenHash,
    });
    if (error) initialError = 'Your chat could not be loaded. Please refresh and try again.';
    else {
      initialThreadId = data?.[0]?.thread_id ?? null;
      initialRealtimeKey = data?.[0]?.realtime_key ?? null;
    }
  } catch {
    initialError = 'Your chat could not be loaded. Please refresh and try again.';
  }

  return (
    <CustomerSupportChat
      mode="guest"
      userId={null}
      initialThreadId={initialThreadId}
      initialRealtimeKey={initialRealtimeKey}
      initialError={initialError}
    />
  );
}
