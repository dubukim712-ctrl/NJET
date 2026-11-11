'use server';

import { revalidatePath } from 'next/cache';
import { getAuthContext } from '@/data/auth/guards';
import {
  createRoleSchema,
  roleIdSchema,
  updateRoleSchema,
} from '@/lib/validations/rbac';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import type { ActionResult } from '@/data/actions/auth';

function roleErrorMessage(error: { code?: string; message: string }): string {
  if (error.code === '23505') {
    return 'A role with that slug already exists.';
  }
  if (error.code === '23514') {
    return 'The role details are not valid.';
  }
  if (error.code === '23503') {
    return 'This role is still assigned to users. Reassign them before deleting it.';
  }
  if (error.code === 'PGRST202') {
    return 'The permissions migration is missing. Run supabase/migrations/20240101000005_permissions_functions.sql, then refresh this page.';
  }
  if (error.code === 'P0001') {
    return error.message;
  }
  return 'Could not save the role. Please try again.';
}

function readPermissionKeys(formData: FormData): string[] {
  return formData
    .getAll('permissions')
    .filter((value): value is string => typeof value === 'string');
}

export async function createRoleAction(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const context = await getAuthContext();

  if (!context) {
    return { success: false, error: 'You must be signed in.' };
  }

  if (!hasPermission(context.profile, PERMISSIONS.rolesManage)) {
    return { success: false, error: 'You do not have permission to manage roles.' };
  }

  const validation = createRoleSchema.safeParse({
    slug: formData.get('slug'),
    name: formData.get('name'),
    description: formData.get('description') || undefined,
    scope: formData.get('scope'),
    permissionKeys: readPermissionKeys(formData),
  });

  if (!validation.success) {
    return {
      success: false,
      error: 'Please fix the highlighted fields.',
      fieldErrors: validation.error.flatten().fieldErrors,
    };
  }

  const { slug, name, description, scope, permissionKeys } = validation.data;

  try {
    const { data, error } = await context.supabase.rpc('create_role', {
      p_slug: slug,
      p_name: name,
      p_description: description || null,
      p_scope: scope,
      p_permission_keys: permissionKeys,
    });

    if (error) {
      return { success: false, error: roleErrorMessage(error) };
    }

    revalidatePath('/admin/roles');
    revalidatePath('/admin/users');
    return { success: true, data: { id: data } };
  } catch {
    return { success: false, error: 'Something went wrong. Please try again.' };
  }
}

export async function updateRoleAction(
  roleId: string,
  formData: FormData
): Promise<ActionResult> {
  const context = await getAuthContext();

  if (!context) {
    return { success: false, error: 'You must be signed in.' };
  }

  if (!hasPermission(context.profile, PERMISSIONS.rolesManage)) {
    return { success: false, error: 'You do not have permission to manage roles.' };
  }

  const idValidation = roleIdSchema.safeParse(roleId);
  if (!idValidation.success) {
    return { success: false, error: 'Invalid role.' };
  }

  const validation = updateRoleSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description') || undefined,
  });

  if (!validation.success) {
    return {
      success: false,
      error: 'Please fix the highlighted fields.',
      fieldErrors: validation.error.flatten().fieldErrors,
    };
  }

  const { name, description } = validation.data;

  try {
    const { error } = await context.supabase
      .from('roles')
      .update({
        name,
        description: description || null,
      })
      .eq('id', idValidation.data)
      .select('id')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, error: 'Role not found.' };
      }
      return { success: false, error: roleErrorMessage(error) };
    }

    revalidatePath('/admin/roles');
    revalidatePath(`/admin/roles/${idValidation.data}`);
    revalidatePath('/admin/users');
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: 'Something went wrong. Please try again.' };
  }
}

export async function deleteRoleAction(roleId: string): Promise<ActionResult> {
  const context = await getAuthContext();

  if (!context) {
    return { success: false, error: 'You must be signed in.' };
  }

  if (!hasPermission(context.profile, PERMISSIONS.rolesManage)) {
    return { success: false, error: 'You do not have permission to manage roles.' };
  }

  const idValidation = roleIdSchema.safeParse(roleId);
  if (!idValidation.success) {
    return { success: false, error: 'Invalid role.' };
  }

  try {
    const { data: role, error: loadError } = await context.supabase
      .from('roles')
      .select('id, is_system')
      .eq('id', idValidation.data)
      .single();

    if (loadError) {
      if (loadError.code === 'PGRST116') {
        return { success: false, error: 'Role not found.' };
      }
      return { success: false, error: 'Could not load the role.' };
    }

    if (role.is_system) {
      return { success: false, error: 'System roles cannot be deleted.' };
    }

    const { error } = await context.supabase
      .from('roles')
      .delete()
      .eq('id', idValidation.data);

    if (error) {
      return { success: false, error: roleErrorMessage(error) };
    }

    revalidatePath('/admin/roles');
    revalidatePath('/admin/users');
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: 'Something went wrong. Please try again.' };
  }
}
