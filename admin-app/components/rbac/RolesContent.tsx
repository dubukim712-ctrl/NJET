import Link from 'next/link';
import { Plus, ShieldCheck } from 'lucide-react';
import { requirePermission } from '@/data/auth/guards';
import { getRoles } from '@/data/rbac/queries';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { RolesTable } from '@/components/rbac/RolesTable';
import { EmptyState } from '@/components/layout/EmptyState';

export async function RolesContent() {
  const { profile } = await requirePermission(PERMISSIONS.rolesRead, '/admin/roles');
  const { roles, error } = await getRoles();
  const canManage = hasPermission(profile, PERMISSIONS.rolesManage);

  return (
    <div className="space-y-6">
      {canManage && (
        <div className="flex justify-end">
          <Link
            href="/admin/roles/new"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New role
          </Link>
        </div>
      )}

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive" role="alert">
          We could not load roles. Please try again.
        </div>
      ) : roles.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No roles yet"
          description="Create a role to define what a group of users can access."
          actionHref={canManage ? '/admin/roles/new' : undefined}
          actionLabel={canManage ? 'Create a role' : undefined}
        />
      ) : (
        <RolesTable roles={roles} canManage={canManage} />
      )}
    </div>
  );
}
