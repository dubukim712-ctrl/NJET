import type { UserProfile } from '@/types/database';
import type { RoleOption } from '@/data/rbac/queries';
import type { UserBranchOption } from '@/data/rbac/branch-options';
import { formatRbacDate } from '@/lib/rbac';
import { RoleBadges } from '@/components/rbac/RoleBadges';
import { UserBranchForm } from '@/components/rbac/UserBranchForm';
import { UserRoleForm } from '@/components/rbac/UserRoleForm';

interface UsersTableProps {
  users: UserProfile[];
  roles: RoleOption[];
  branches: UserBranchOption[] | null;
  actor: UserProfile;
  canManage: boolean;
}

function initials(user: UserProfile): string {
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
      <div className="hidden overflow-hidden rounded-xl border md:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                User
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Role
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Joined
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Branch
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Change role
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((user) => (
              <tr key={user.id} className="transition-colors hover:bg-muted/30">
                <td className="px-4 py-3">
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
                <td className="px-4 py-3">
                  <p className="mb-1 text-sm">{user.role_name}</p>
                  <RoleBadges
                    scope={user.scope}
                    isFullAccess={user.is_full_access}
                  />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                  <time dateTime={user.created_at}>
                    {formatRbacDate(user.created_at)}
                  </time>
                </td>
                <td className="px-4 py-3">
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
                <td className="px-4 py-3">
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

      <ul className="space-y-3 md:hidden">
        {users.map((user) => (
          <li key={user.id} className="rounded-xl border bg-card p-4">
            <div className="flex items-start gap-3">
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

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {user.role_name}
              </span>
              <RoleBadges
                scope={user.scope}
                isFullAccess={user.is_full_access}
              />
            </div>

            <p className="mt-2 text-xs text-muted-foreground">
              Joined{' '}
              <time dateTime={user.created_at}>
                {formatRbacDate(user.created_at)}
              </time>
            </p>
            <div className="mt-3">
              <p className="mb-1 text-xs font-medium text-muted-foreground">Branch</p>
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
            </div>

            <div className="mt-3">
              {canManage ? (
                <UserRoleForm
                  key={`${user.id}-${user.role_id}`}
                  user={user}
                  roles={roles}
                  actor={actor}
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
