'use client';

import { useVerifiedAdminProfile } from '@/components/providers/AdminProvider';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { UsersContent } from '@/components/rbac/UsersContent';

export function AdminUsersView() {
  const profile = useVerifiedAdminProfile();
  if (!profile || !(hasPermission(profile, PERMISSIONS.usersRead))) return null;
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Team &amp; Security</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Users
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review accounts and their assigned roles.
        </p>
      </div>
      <UsersContent />
    </div>
  );
}
