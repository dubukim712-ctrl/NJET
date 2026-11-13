'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/data/supabase/server';
import { surfaceHome } from '@/lib/permissions';
import {
  resendSignupOtpSchema,
  SIGNUP_OTP_LENGTH,
  verifySignupOtpSchema,
} from '@/lib/validations/auth';
import type { ActionResult } from '@/data/actions/auth';

export async function verifySignupOtpAction(
  formData: FormData
): Promise<ActionResult<{ redirectTo: string }>> {
  const validation = verifySignupOtpSchema.safeParse({
    email: formData.get('email'),
    token: formData.get('token'),
  });

  if (!validation.success) {
    return {
      success: false,
      error: `Enter a valid email address and ${SIGNUP_OTP_LENGTH}-digit code.`,
      fieldErrors: validation.error.flatten().fieldErrors,
    };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({
      email: validation.data.email,
      token: validation.data.token,
      type: 'signup',
    });

    if (error || !data.user) {
      return {
        success: false,
        error: 'That code is invalid or expired. Request a new code and try again.',
      };
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('scope, is_full_access, permissions')
      .eq('id', data.user.id)
      .single();

    revalidatePath('/', 'layout');
    return {
      success: true,
      data: { redirectTo: surfaceHome(profile) },
    };
  } catch {
    return {
      success: false,
      error: 'Verification could not be completed. Please try again.',
    };
  }
}

export async function resendSignupOtpAction(
  formData: FormData
): Promise<ActionResult<{ message: string }>> {
  const validation = resendSignupOtpSchema.safeParse({
    email: formData.get('email'),
  });

  if (!validation.success) {
    return {
      success: false,
      error: 'Enter a valid email address before requesting another code.',
      fieldErrors: validation.error.flatten().fieldErrors,
    };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: validation.data.email,
    });

    if (error) {
      return {
        success: false,
        error: 'Could not send a code right now. Please wait and try again.',
      };
    }

    return {
      success: true,
      data: {
        message: 'If this address is awaiting verification, a new code is on its way.',
      },
    };
  } catch {
    return {
      success: false,
      error: 'Could not send a code right now. Please try again later.',
    };
  }
}
