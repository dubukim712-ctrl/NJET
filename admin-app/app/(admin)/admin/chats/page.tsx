import { StaffChatInbox } from '@/components/support-chat/StaffChatInbox';
import { requirePermission } from '@/data/auth/guards';
import { PERMISSIONS } from '@/lib/permissions';

export const metadata = { title: 'Customer chats' };

export default async function AdminChatsPage() {
  const { profile } = await requirePermission(
    PERMISSIONS.supportChatManage,
    '/admin/chats',
  );
  return <StaffChatInbox userId={profile.id} />;
}
