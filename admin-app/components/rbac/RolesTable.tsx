import Link from 'next/link';
import type { RoleWithUsage } from '@/data/rbac/queries';
import { RoleBadges } from '@/components/rbac/RoleBadges';
import { DeleteRoleButton } from '@/components/rbac/DeleteRoleButton';

interface RolesTableProps {
  roles: RoleWithUsage[];
  canManage: boolean;
}

function permissionSummary(role: RoleWithUsage): string {
  if (role.is_full_access) return 'All permissions';
  const count = role.permissions.length;
  return `${count} permission${count === 1 ? '' : 's'}`;
}

export function RolesTable({ roles, canManage }: RolesTableProps) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-xl border md:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                Role
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Access
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Permissions
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Users
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {roles.map((role) => {
              const deleteDisabled =
                !canManage || role.is_system || role.userCount > 0;
              const deleteReason = !canManage
                ? 'You do not have permission to manage roles.'
                : role.is_system
                  ? 'System roles cannot be deleted.'
                  : 'Reassign users before deleting this role.';

              return (
                <tr key={role.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <p className="font-medium">{role.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {role.slug}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <RoleBadges
                      scope={role.scope}
                      isFullAccess={role.is_full_access}
                      isSystem={role.is_system}
                    />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {permissionSummary(role)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {role.userCount}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/admin/roles/${role.id}`}
                        className="inline-flex h-9 items-center rounded-md px-3 text-sm font-medium text-primary transition-colors hover:bg-accent"
                      >
                        {canManage ? 'Edit' : 'View'}
                      </Link>
                      {canManage && (
                        <DeleteRoleButton
                          roleId={role.id}
                          roleName={role.name}
                          disabled={deleteDisabled}
                          disabledReason={deleteReason}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 md:hidden">
        {roles.map((role) => {
          const deleteDisabled =
            !canManage || role.is_system || role.userCount > 0;
          const deleteReason = !canManage
            ? 'You do not have permission to manage roles.'
            : role.is_system
              ? 'System roles cannot be deleted.'
              : 'Reassign users before deleting this role.';

          return (
            <li key={role.id} className="rounded-xl border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{role.name}</p>
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    {role.slug}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {role.userCount} user{role.userCount === 1 ? '' : 's'}
                </span>
              </div>

              <div className="mt-3">
                <RoleBadges
                  scope={role.scope}
                  isFullAccess={role.is_full_access}
                  isSystem={role.is_system}
                />
              </div>

              <p className="mt-2 text-xs text-muted-foreground">
                {permissionSummary(role)}
              </p>

              <div className="mt-3 flex items-center gap-1">
                <Link
                  href={`/admin/roles/${role.id}`}
                  className="inline-flex h-9 items-center rounded-md px-3 text-sm font-medium text-primary transition-colors hover:bg-accent"
                >
                  {canManage ? 'Edit' : 'View'}
                </Link>
                {canManage && (
                  <DeleteRoleButton
                    roleId={role.id}
                    roleName={role.name}
                    disabled={deleteDisabled}
                    disabledReason={deleteReason}
                  />
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
