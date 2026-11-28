import { AdminChatsView } from '@/components/support-chat/AdminChatsView';
import { requirePermission } from '@/data/auth/guards';
import { PERMISSIONS } from '@/lib/permissions';

export const metadata = { title: 'Customer chats' };

export default async function Page() {
  await requirePermission(PERMISSIONS.supportChatManage, '/admin/chats');
  return <AdminChatsView />;
}
