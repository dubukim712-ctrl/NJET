'use server';

import { createHmac, randomInt, randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { ActionResult } from '@/data/actions/auth';
import { getAuthContext, requirePermission } from '@/data/auth/guards';
import { createServiceClient } from '@/data/supabase/service';
import { sendPhoneVerificationSms } from '@/data/sms-gateway/phone-verification-sms';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { PHILIPPINE_MOBILE_ERROR } from '@/lib/validations/philippine-mobile';
import { formatSavedPhilippineMobileNumber, toPhilippineMobileE164 } from '@/lib/phone-number';
import {
  requestPhoneVerificationSchema,
  verifyPhoneVerificationSchema,
} from '@/lib/validations/phone-verification';

function hashVerificationCode(userId: string, challengeId: string, code: string) {
  const secret = process.env.PHONE_VERIFICATION_HMAC_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('Phone verification HMAC secret is missing or too short.');
  }
  return createHmac('sha256', secret)
    .update(`${userId}:${challengeId}:${code}`)
    .digest('hex');
}

async function getCustomerContext() {
  const context = await getAuthContext();
  if (
    !context?.profile ||
    !hasPermission(context.profile, PERMISSIONS.storefrontAccess)
  ) {
    return null;
  }
  return context;
}

export async function requestPhoneVerificationAction(
  payload: unknown
): Promise<ActionResult<{ challengeId: string }>> {
  const context = await getCustomerContext();
  if (!context) {
    return { success: false, error: 'Sign in with a customer account to verify your phone.' };
  }

  const validation = requestPhoneVerificationSchema.safeParse(payload);
  if (!validation.success) {
    return {
      success: false,
      error: PHILIPPINE_MOBILE_ERROR,
      fieldErrors: validation.error.flatten().fieldErrors,
    };
  }

  const phoneNumber = toPhilippineMobileE164(validation.data.phoneNumber);

  const challengeId = randomUUID();
  const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
  let challengeCreated = false;
  try {
    const serviceClient = createServiceClient();
    const { data: accepted, error } = await serviceClient.rpc(
      'create_phone_verification_challenge',
      {
        p_user_id: context.user.id,
        p_challenge_id: challengeId,
        p_phone_number: phoneNumber,
        p_code_hash: hashVerificationCode(context.user.id, challengeId, code),
      }
    );
    if (error) throw error;
    if (accepted !== true) {
      return {
        success: false,
        error: 'Too many code requests. Wait before requesting another code.',
      };
    }
    challengeCreated = true;
    await sendPhoneVerificationSms(phoneNumber, code);
    return { success: true, data: { challengeId } };
  } catch (error) {
    if (challengeCreated) {
      try {
        const serviceClient = createServiceClient();
        const { error: invalidateError } = await serviceClient.rpc(
          'invalidate_phone_verification_challenge',
          { p_user_id: context.user.id, p_challenge_id: challengeId }
        );
        if (invalidateError) throw invalidateError;
      } catch (invalidateError) {
        console.error('Could not invalidate an unsent phone challenge.', invalidateError);
      }
    }
    console.error('Could not send a phone verification code.', error);
    return {
      success: false,
      error: 'A verification code could not be sent. Please try again later.',
    };
  }
}

export async function verifyPhoneVerificationAction(
  payload: unknown
): Promise<ActionResult<{ phoneNumber: string }>> {
  const context = await getCustomerContext();
  if (!context) {
    return { success: false, error: 'Sign in with a customer account to verify your phone.' };
  }
  const validation = verifyPhoneVerificationSchema.safeParse(payload);
  if (!validation.success) {
    return { success: false, error: 'Enter the 6-digit code from your text message.' };
  }

  try {
    const serviceClient = createServiceClient();
    const { data: result, error } = await serviceClient.rpc(
      'verify_phone_verification_challenge',
      {
        p_user_id: context.user.id,
        p_challenge_id: validation.data.challengeId,
        p_code_hash: hashVerificationCode(
          context.user.id,
          validation.data.challengeId,
          validation.data.code
        ),
      }
    );
    if (error) throw error;
    const verification = result?.[0];
    if (verification?.verification_status === 'locked') {
      return {
        success: false,
        error: 'Too many incorrect attempts. Request a new code.',
      };
    }
    if (
      verification?.verification_status !== 'verified' ||
      !verification.verified_phone_number
    ) {
      return {
        success: false,
        error: 'That code is invalid or expired. Request a new one and try again.',
      };
    }

    const phoneNumber = formatSavedPhilippineMobileNumber(
      verification.verified_phone_number
    );
    if (!phoneNumber) {
      throw new Error('Verified phone number was not returned by the verification service.');
    }
    return { success: true, data: { phoneNumber } };
  } catch (error) {
    console.error('Could not verify the customer phone number.', error);
    return {
      success: false,
      error: 'Phone verification is temporarily unavailable. Please try again.',
    };
  }
}

export async function markOrderPhoneManuallyVerifiedAction(
  payload: unknown
): Promise<ActionResult> {
  const { supabase } = await requirePermission(PERMISSIONS.ordersManage, '/admin/orders');
  const parsed = z.object({ orderId: z.string().uuid() }).strict().safeParse(payload);
  if (!parsed.success) return { success: false, error: 'Select a valid order.' };
  try {
    const { error } = await supabase.rpc('mark_order_phone_manually_verified', {
      p_order_id: parsed.data.orderId,
    });
    if (error) throw error;
    revalidatePath('/admin/orders');
    revalidatePath('/dashboard/orders');
    return { success: true, data: undefined };
  } catch (error) {
    console.error('Could not manually verify an order contact number.', error);
    return {
      success: false,
      error: 'Could not verify this order contact number.',
    };
  }
}
