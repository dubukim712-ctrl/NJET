'use server';

import { toUserFriendlyError } from '@/data/supabase/user-friendly-errors';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/data/supabase/server';
import { updateProfileSchema, changePasswordSchema } from '@/lib/validations/auth';
import type { ActionResult } from '@/data/actions/auth';
import { requireCustomer } from '@/data/auth/guards';
import { profileContactSchema } from '@/lib/validations/profile-contact';
import type { Database, UserProfile } from '@/types/database';

type CustomerContact = Pick<Database['public']['Tables']['users']['Row'],
  'phone_number' | 'phone_verified_at' | 'street_address' | 'province_code' | 'province_name'
  | 'city_code' | 'city_name' | 'barangay_code' | 'barangay_name' | 'postal_code'>;

export type CustomerProfile = Pick<
  UserProfile,
  'id' | 'email' | 'full_name' | 'avatar_url' | 'role_name'
> & CustomerContact;

export async function getCustomerProfileAction(): Promise<
  ActionResult<CustomerProfile>
> {
  const { profile, supabase } = await requireCustomer('/dashboard/profile');
  const { data: contact, error } = await supabase
    .from('users')
    .select('phone_number, phone_verified_at, street_address, province_code, province_name, city_code, city_name, barangay_code, barangay_name, postal_code')
    .eq('id', profile.id)
    .single();
  if (error) {
    return { success: false, error: toUserFriendlyError(error, 'Could not load your saved profile details.') };
  }
  return {
    success: true,
    data: {
      ...contact,
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
      role_name: profile.role_name,
    },
  };
}

export async function updateCustomerProfileAction(payload: unknown): Promise<ActionResult> {
  const { supabase } = await requireCustomer('/dashboard/profile');
  const validation = profileContactSchema.safeParse(payload);
  const identity = updateProfileSchema.safeParse(payload);
  if (!identity.success) {
    return { success: false, error: 'Please fix the highlighted fields.', fieldErrors: identity.error.flatten().fieldErrors };
  }
  if (!validation.success) {
    return { success: false, error: 'Please fix the highlighted fields.', fieldErrors: validation.error.flatten().fieldErrors };
  }
  const input = validation.data;
  const fallback = 'Could not save your profile. Please try again.';

  try {
    const { data, error } = await supabase.rpc('save_customer_profile', {
      p_full_name: identity.data.fullName || null,
      p_avatar_url: identity.data.avatarUrl || null,
      p_phone_number: input.phoneNumber,
      p_street_address: input.addressLine1 || null,
      p_province_code: input.provinceCode || null,
      p_province_name: input.province || null,
      p_city_code: input.cityCode || null,
      p_city_name: input.city || null,
      p_barangay_code: input.barangayCode || null,
      p_barangay_name: input.barangay || null,
      p_postal_code: input.postalCode || null,
    });
    if (error || !data) return { success: false, error: toUserFriendlyError(error, fallback) };
    revalidatePath('/dashboard', 'layout');
    revalidatePath('/checkout');
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: toUserFriendlyError(error, fallback) };
  }
}

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
      return { success: false, error: toUserFriendlyError(error, 'Could not update your profile. Please try again.') };
    }

    revalidatePath('/dashboard', 'layout');
    revalidatePath('/admin', 'layout');
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
      return { success: false, error: toUserFriendlyError(error, 'Could not change your password. Please try again.') };
    }

    revalidatePath('/', 'layout');
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: 'Something went wrong. Please try again.' };
  }
}