import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Info, Lock } from 'lucide-react';
import { requirePermission } from '@/data/auth/guards';
import { getPermissions, getRole } from '@/data/rbac/queries';
import { PERMISSIONS } from '@/lib/permissions';
import {
  canManagePermissions,
  formatRbacDate,
  isValidUuid,
} from '@/lib/rbac';
import { RoleBadges } from '@/components/rbac/RoleBadges';
import { EditRoleForm } from '@/components/rbac/EditRoleForm';
import { RolePermissionsForm } from '@/components/rbac/RolePermissionsForm';

export async function RoleDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { profile } = await requirePermission(PERMISSIONS.rolesRead, '/admin/roles');
  const { id } = await params;
  if (!isValidUuid(id)) notFound();

  const [{ role, permissions: rolePermissions, userCount, error }, catalog] =
    await Promise.all([getRole(id), getPermissions()]);

  if (error) {
    return (
      <div className="space-y-6">
        <BackLink />
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive" role="alert">
          We could not load this role. Please try again.
        </div>
      </div>
    );
  }
  if (!role) notFound();

  const canManage = canManagePermissions(profile, {
    ...role,
    permissions: rolePermissions,
  });

  return (
    <div className="space-y-6">
      <BackLink />
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{role.name}</h1>
          <RoleBadges
            scope={role.scope}
            isFullAccess={role.is_full_access}
            isSystem={role.is_system}
          />
        </div>
        <p className="mt-1 font-mono text-sm text-muted-foreground">{role.slug}</p>
      </div>

      {catalog.error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive" role="alert">
          We could not load the permission catalog. Refresh the page before editing permissions.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <div className="space-y-6">
          {role.is_system ? (
            <div className="space-y-4 rounded-xl border bg-card p-5">
              <div>
                <h2 className="text-lg font-semibold">System role</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  This role is part of the platform. Its name, slug, and scope are read-only; its permissions can still be edited.
                </p>
              </div>
              <dl className="grid gap-4 sm:grid-cols-2">
                <Detail label="Description">{role.description ?? 'No description.'}</Detail>
                <Detail label="Scope" className="capitalize">{role.scope}</Detail>
                <Detail label="Assigned users">{userCount}</Detail>
                <Detail label="Created">{formatRbacDate(role.created_at)}</Detail>
                <Detail label="Updated">{formatRbacDate(role.updated_at)}</Detail>
              </dl>
            </div>
          ) : canManage ? (
            <EditRoleForm role={role} />
          ) : (
            <div className="rounded-xl border bg-card p-5">
              <h2 className="text-lg font-semibold">Role details</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {role.description ?? 'No description.'}
              </p>
            </div>
          )}

          {role.is_full_access ? (
            <div className="space-y-3 rounded-xl border bg-card p-5">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                <h2 className="text-lg font-semibold">Full access</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                This role automatically receives every current and future permission, including storefront preview. It cannot be edited.
              </p>
            </div>
          ) : catalog.error ? null : (
            <RolePermissionsForm
              roleId={role.id}
              permissions={catalog.permissions}
              scope={role.scope}
              initialKeys={rolePermissions}
              canManage={canManage}
            />
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border bg-card p-4">
            <p className="text-sm font-medium">Role usage</p>
            <p className="mt-2 text-3xl font-bold">{userCount}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              user{userCount === 1 ? '' : 's'} currently assigned
            </p>
          </div>
          {!role.is_full_access && (
            <div className="flex gap-2 rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>Changing this role&apos;s permissions affects all assigned users immediately.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Detail({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={`mt-1 text-sm ${className ?? ''}`}>{children}</dd>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/admin/roles"
      className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Back to roles
    </Link>
  );
}
