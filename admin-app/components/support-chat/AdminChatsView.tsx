'use client';

import { useVerifiedAdminProfile } from '@/components/providers/AdminProvider';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { StaffChatInbox } from '@/components/support-chat/StaffChatInbox';

export function AdminChatsView() {
  const profile = useVerifiedAdminProfile();
  if (!profile || !(hasPermission(profile, PERMISSIONS.supportChatManage))) return null;
  return <StaffChatInbox userId={profile.id} />;
}
