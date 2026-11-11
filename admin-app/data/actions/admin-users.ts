'use server';

import { z } from 'zod';
import type { ActionResult } from '@/data/actions/auth';
import { requirePermission } from '@/data/auth/guards';
import { getUserBranchOptions } from '@/data/rbac/branch-options';
import { getRoleOptions, getUsers } from '@/data/rbac/queries';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { MAX_SEARCH_LENGTH } from '@/lib/rbac';
import type { ManagedUser, UserListActor } from '@/types/rbac';

const usersQuerySchema = z.object({
  search: z.string().max(MAX_SEARCH_LENGTH).optional(),
  roleId: z.string().uuid().optional(),
  page: z.number().int().min(1),
});

export type AdminUsersData = {
  users: ManagedUser[];
  total: number;
  page: number;
  pageSize: number;
  roles: Awaited<ReturnType<typeof getRoleOptions>>['roles'];
  branches: Awaited<ReturnType<typeof getUserBranchOptions>>['branches'];
  actor: UserListActor;
  canManage: boolean;
  errors: {
    users: boolean;
    roles: boolean;
    branches: boolean;
  };
};

export async function getAdminUsersAction(
  payload: unknown
): Promise<ActionResult<AdminUsersData>> {
  const { profile } = await requirePermission(PERMISSIONS.usersRead, '/admin/users');
  const parsed = usersQuerySchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: 'Invalid user list filters.' };
  }

  const canManage = hasPermission(profile, PERMISSIONS.usersManage);
  const [userResult, roleResult, branchResult] = await Promise.all([
    getUsers(parsed.data),
    getRoleOptions(),
    canManage
      ? getUserBranchOptions()
      : Promise.resolve({ branches: null, error: null }),
  ]);

  return {
    success: true,
    data: {
      users: userResult.users.map((user) => ({
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role_id: user.role_id,
        branch_id: user.branch_id,
        branch_name: user.branch_name,
        role_name: user.role_name,
        scope: user.scope,
        is_full_access: user.is_full_access,
        permissions: user.permissions,
        created_at: user.created_at,
      })),
      total: userResult.total,
      page: userResult.page,
      pageSize: userResult.pageSize,
      roles: roleResult.roles,
      branches: branchResult.branches,
      actor: {
        id: profile.id,
        scope: profile.scope,
        is_full_access: profile.is_full_access,
        permissions: profile.permissions,
      },
      canManage,
      errors: {
        users: Boolean(userResult.error),
        roles: Boolean(roleResult.error),
        branches: Boolean(branchResult.error),
      },
    },
  };
}
