'use server';

import { revalidatePath } from 'next/cache';
import { getAuthContext } from '@/data/auth/guards';
import {
  assignRoleSchema,
  assignUserBranchSchema,
} from '@/lib/validations/rbac';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import type { ActionResult } from '@/data/actions/auth';

function assignmentErrorMessage(error: {
  code?: string;
  message: string;
}): string {
  if (error.code === 'PGRST202') {
    return 'The permissions migration is missing. Run supabase/migrations/20240101000005_permissions_functions.sql, then refresh this page.';
  }
  if (error.code === 'P0001') {
    return error.message;
  }
  return 'Could not update the role. Please try again.';
}

export async function assignUserRoleAction(
  formData: FormData
): Promise<ActionResult> {
  const context = await getAuthContext();

  if (!context) {
    return { success: false, error: 'You must be signed in.' };
  }

  if (!hasPermission(context.profile, PERMISSIONS.usersManage)) {
    return {
      success: false,
      error: 'You do not have permission to manage users.',
    };
  }

  const validation = assignRoleSchema.safeParse({
    userId: formData.get('userId'),
    roleId: formData.get('roleId'),
  });

  if (!validation.success) {
    return { success: false, error: 'Invalid role assignment request.' };
  }

  try {
    const { error } = await context.supabase.rpc('assign_user_role', {
      p_user_id: validation.data.userId,
      p_role_id: validation.data.roleId,
    });

    if (error) {
      return { success: false, error: assignmentErrorMessage(error) };
    }

    revalidatePath('/admin/users');
    revalidatePath('/admin/roles');
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: 'Something went wrong. Please try again.' };
  }
}

export async function assignUserBranchAction(
  formData: FormData
): Promise<ActionResult> {
  const context = await getAuthContext();

  if (!context) {
    return { success: false, error: 'You must be signed in.' };
  }

  if (!hasPermission(context.profile, PERMISSIONS.usersManage)) {
    return {
      success: false,
      error: 'You do not have permission to manage users.',
    };
  }

  const branchValue = formData.get('branchId');
  const validation = assignUserBranchSchema.safeParse({
    userId: formData.get('userId'),
    branchId: branchValue === '' ? null : branchValue,
  });

  if (!validation.success) {
    return { success: false, error: 'Invalid branch assignment request.' };
  }

  try {
    const { error } = await context.supabase.rpc('assign_user_branch', {
      p_user_id: validation.data.userId,
      p_branch_id: validation.data.branchId,
    });

    if (error) {
      if (error.code === 'PGRST202') {
        return {
          success: false,
          error: 'The branch assignment migration is missing. Run supabase/migrations/20240101000024_user_branch_assignment.sql, then refresh this page.',
        };
      }
      if (error.code === 'P0001') {
        return { success: false, error: error.message };
      }
      console.error('Could not update user branch:', error.message);
      return { success: false, error: 'Could not update the branch. Please try again.' };
    }

    revalidatePath('/admin/users');
    return { success: true, data: undefined };
  } catch (error) {
    console.error('Could not update user branch:', error);
    return { success: false, error: 'Could not update the branch. Please try again.' };
  }
}
