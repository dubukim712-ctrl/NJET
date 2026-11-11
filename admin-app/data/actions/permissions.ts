'use server';

import { revalidatePath } from 'next/cache';
import { getAuthContext } from '@/data/auth/guards';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { rolePermissionsSchema } from '@/lib/validations/rbac';
import type { ActionResult } from '@/data/actions/auth';

function permissionErrorMessage(error: {
  code?: string;
  message: string;
}): string {
  if (error.code === 'PGRST202') {
    return 'The permissions migration is missing. Run supabase/migrations/20240101000005_permissions_functions.sql, then refresh this page.';
  }
  if (error.code === 'P0001') {
    return error.message;
  }
  return 'Could not save permissions. Please try again.';
}

export async function updateRolePermissionsAction(
  roleId: string,
  permissionKeys: string[]
): Promise<ActionResult> {
  const context = await getAuthContext();

  if (!context) {
    return { success: false, error: 'You must be signed in.' };
  }

  if (!hasPermission(context.profile, PERMISSIONS.rolesManage)) {
    return {
      success: false,
      error: 'You do not have permission to manage roles.',
    };
  }

  const validation = rolePermissionsSchema.safeParse({
    roleId,
    permissionKeys,
  });

  if (!validation.success) {
    return { success: false, error: 'Invalid permission selection.' };
  }

  try {
    const { error } = await context.supabase.rpc('set_role_permissions', {
      p_role_id: validation.data.roleId,
      p_permission_keys: validation.data.permissionKeys,
    });

    if (error) {
      return { success: false, error: permissionErrorMessage(error) };
    }

    revalidatePath('/admin/roles');
    revalidatePath(`/admin/roles/${validation.data.roleId}`);
    revalidatePath('/admin/users');
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: 'Something went wrong. Please try again.' };
  }
}
