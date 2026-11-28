import type { ManagedUser, UserListActor } from '@/types/rbac';
import type { RoleOption } from '@/data/rbac/queries';
import type { UserBranchOption } from '@/data/rbac/branch-options';
import { formatRbacDate } from '@/lib/rbac';
import { RoleBadges } from '@/components/rbac/RoleBadges';
import { UserBranchForm } from '@/components/rbac/UserBranchForm';
import { UserRoleForm } from '@/components/rbac/UserRoleForm';

interface UsersTableProps {
  users: ManagedUser[];
  roles: RoleOption[];
  branches: UserBranchOption[] | null;
  actor: UserListActor;
  canManage: boolean;
}

function initials(user: ManagedUser): string {
  const source = user.full_name?.trim() || user.email;
  return source.charAt(0).toUpperCase();
}

export function UsersTable({
  users,
  roles,
  branches,
  actor,
  canManage,
}: UsersTableProps) {
  return (
    <>
      <div className="hidden min-w-0 max-w-full overflow-x-auto rounded-xl border xl:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-3 font-medium">
                User
              </th>
              <th scope="col" className="px-3 py-3 font-medium">
                Role
              </th>
              <th scope="col" className="px-3 py-3 font-medium">
                Joined
              </th>
              <th scope="col" className="px-3 py-3 font-medium">
                Branch
              </th>
              <th scope="col" className="px-3 py-3 font-medium">
                Change role
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((user) => (
              <tr key={user.id} className="transition-colors hover:bg-muted/30">
                <td className="px-3 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                      {initials(user)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {user.full_name ?? 'Unnamed user'}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <p className="mb-1 text-sm">{user.role_name}</p>
                  <RoleBadges
                    scope={user.scope}
                    isFullAccess={user.is_full_access}
                  />
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">
                  <time dateTime={user.created_at}>
                    {formatRbacDate(user.created_at)}
                  </time>
                </td>
                <td className="px-3 py-3">
                  {canManage ? (
                    <UserBranchForm
                      key={`${user.id}-${user.branch_id ?? ''}`}
                      user={user}
                      branches={branches}
                    />
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {user.branch_name ?? '—'}
                    </span>
                  )}
                </td>
                <td className="px-3 py-3">
                  {canManage ? (
                    <UserRoleForm
                      key={`${user.id}-${user.role_id}`}
                      user={user}
                      roles={roles}
                      actor={actor}
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Read only
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 xl:hidden">
        {users.map((user) => (
          <li key={user.id} className="space-y-3 rounded-xl border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
                  {initials(user)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {user.full_name ?? 'Unnamed user'}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </div>
              <RoleBadges scope={user.scope} isFullAccess={user.is_full_access} roleName={user.role_name} />
            </div>

            <div className="grid min-w-0 grid-cols-1 gap-3 rounded-xl border border-border/60 bg-background/60 p-3 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Joined</p>
                <time className="text-sm" dateTime={user.created_at}>{formatRbacDate(user.created_at)}</time>
              </div>
              <div className="min-w-0">
                <p className="mb-1 text-xs font-medium text-muted-foreground">Branch</p>
                {canManage ? (
                  <UserBranchForm
                    key={`${user.id}-${user.branch_id ?? ''}`}
                    user={user}
                    branches={branches}
                    compact
                  />
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {user.branch_name ?? '—'}
                  </span>
                )}
              </div>
            </div>

            <div>
              {canManage ? (
                <UserRoleForm
                  key={`${user.id}-${user.role_id}`}
                  user={user}
                  roles={roles}
                  actor={actor}
                  compact
                />
              ) : (
                <span className="text-xs text-muted-foreground">Read only</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
