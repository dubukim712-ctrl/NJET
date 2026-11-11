'use server';

import { z } from 'zod';
import type { ActionResult } from '@/data/actions/auth';
import { requirePermission } from '@/data/auth/guards';
import {
  getPermissions,
  getRole,
  getRoles,
} from '@/data/rbac/queries';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { canManagePermissions } from '@/lib/rbac';
import type { Permission, Role } from '@/types/database';

export type AdminRolesData = {
  roles: Awaited<ReturnType<typeof getRoles>>['roles'];
  canManage: boolean;
  error: boolean;
};

export type AdminRoleDetailData = {
  role: Role | null;
  permissions: string[];
  userCount: number;
  canManage: boolean;
  error: boolean;
  catalog: Permission[];
  catalogError: boolean;
};

const roleIdSchema = z.string().uuid();

export async function getAdminRolesAction(): Promise<
  ActionResult<AdminRolesData>
> {
  const { profile } = await requirePermission(PERMISSIONS.rolesRead, '/admin/roles');
  const result = await getRoles();

  return {
    success: true,
    data: {
      roles: result.roles,
      canManage: hasPermission(profile, PERMISSIONS.rolesManage),
      error: Boolean(result.error),
    },
  };
}

export async function getAdminRoleDetailAction(
  roleId: unknown
): Promise<ActionResult<AdminRoleDetailData>> {
  const { profile } = await requirePermission(PERMISSIONS.rolesRead, '/admin/roles');
  const parsedRoleId = roleIdSchema.safeParse(roleId);
  if (!parsedRoleId.success) {
    return { success: false, error: 'Invalid role ID.' };
  }

  const [detail, catalog] = await Promise.all([
    getRole(parsedRoleId.data),
    getPermissions(),
  ]);
  const canManage = detail.role
    ? canManagePermissions(profile, {
        ...detail.role,
        permissions: detail.permissions,
      })
    : false;

  return {
    success: true,
    data: {
      role: detail.role,
      permissions: detail.permissions,
      userCount: detail.userCount,
      canManage,
      error: Boolean(detail.error),
      catalog: catalog.permissions,
      catalogError: Boolean(catalog.error),
    },
  };
}

export async function getAdminRoleCreationDataAction(): Promise<
  ActionResult<{ permissions: Permission[]; error: boolean }>
> {
  await requirePermission(PERMISSIONS.rolesManage, '/admin/roles/new');
  const result = await getPermissions();

  return {
    success: true,
    data: {
      permissions: result.permissions,
      error: Boolean(result.error),
    },
  };
}
