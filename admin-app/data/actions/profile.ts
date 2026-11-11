'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/data/supabase/server';
import { updateProfileSchema, changePasswordSchema } from '@/lib/validations/auth';
import type { ActionResult } from '@/data/actions/auth';

export async function updateProfileAction(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'You must be signed in.' };
  }

  const validation = updateProfileSchema.safeParse({
    fullName: formData.get('fullName') || undefined,
    avatarUrl: formData.get('avatarUrl') || '',
  });

  if (!validation.success) {
    return {
      success: false,
      error: 'Please fix the highlighted fields.',
      fieldErrors: validation.error.flatten().fieldErrors,
    };
  }

  try {
    const { error } = await supabase
      .from('users')
      .update({
        full_name: validation.data.fullName ?? null,
        avatar_url: validation.data.avatarUrl || null,
      })
      .eq('id', user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard', 'layout');
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: 'Something went wrong. Please try again.' };
  }
}

export async function changePasswordAction(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return { success: false, error: 'You must be signed in.' };
  }

  const validation = changePasswordSchema.safeParse({
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
    confirmPassword: formData.get('confirmPassword'),
  });

  if (!validation.success) {
    return {
      success: false,
      error: 'Please fix the highlighted fields.',
      fieldErrors: validation.error.flatten().fieldErrors,
    };
  }

  try {
    // Re-authenticate before allowing a password change.
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: validation.data.currentPassword,
    });

    if (signInError) {
      return { success: false, error: 'Current password is incorrect.' };
    }

    const { error } = await supabase.auth.updateUser({
      password: validation.data.newPassword,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/', 'layout');
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: 'Something went wrong. Please try again.' };
  }
}