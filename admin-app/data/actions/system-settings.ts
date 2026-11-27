'use server';

import { toUserFriendlyError } from '@/data/supabase/user-friendly-errors';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { ActionResult } from '@/data/actions/auth';
import { requireFullAccess } from '@/data/auth/guards';
import {
  removeStoredObject,
  validateSettingsImage,
} from '@/data/commerce/system-settings-assets';
import {
  paymentRecipientSettingsSchema,
  phoneVerificationSettingsSchema,
  settingsAssetPathSchema,
} from '@/lib/validations/system-settings';

const PAYMENT_MEDIA_BUCKET = 'njet-payment-recipient-media';

export async function savePhoneVerificationSettingsAction(
  payload: unknown
): Promise<ActionResult> {
  const { supabase } = await requireFullAccess('/admin/settings');
  const parsed = phoneVerificationSettingsSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: 'Choose a valid checkout verification setting.' };
  }

  try {
    const { error } = await supabase
      .from('business_settings')
      .update({
        phone_verification_required: parsed.data.phoneVerificationRequired,
      })
      .eq('id', 1)
      .select('id')
      .single();
    if (error) throw error;

    revalidatePath('/admin/settings');
    revalidatePath('/checkout');
    return { success: true, data: undefined };
  } catch (error) {
    console.error('Could not save phone verification settings.', error);
    return {
      success: false,
      error: toUserFriendlyError(error, 'Could not save the checkout verification setting. Please try again.'),
    };
  }
}

export async function savePaymentRecipientAction(
  payload: unknown
): Promise<ActionResult<{ warning?: string }>> {
  const { supabase } = await requireFullAccess('/admin/settings');
  const parsed = paymentRecipientSettingsSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Review the payment recipient details and images.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await validateSettingsImage(
      supabase,
      PAYMENT_MEDIA_BUCKET,
      parsed.data.paymentQrPath,
      'payment QR image'
    );
    let previousQrPath: string | null = null;
    if (parsed.data.id) {
      const { data: previous, error: previousError } = await supabase
        .from('payment_recipients')
        .select('provider, payment_qr_path')
        .eq('id', parsed.data.id)
        .maybeSingle();
      if (previousError) throw previousError;
      if (!previous) {
        return { success: false, error: 'This payment recipient no longer exists. Refresh and try again.' };
      }
      if (previous.provider !== parsed.data.provider) {
        return { success: false, error: 'A payment recipient cannot be moved to another provider.' };
      }
      previousQrPath = previous.payment_qr_path;
    }

    const recipientId = parsed.data.id ?? randomUUID();
    const { error } = await supabase.from('payment_recipients').upsert({
      id: recipientId,
      provider: parsed.data.provider,
      recipient_name: parsed.data.recipientName,
      account_details: parsed.data.accountDetails,
      payment_qr_path: parsed.data.paymentQrPath,
      active: parsed.data.active,
    }, { onConflict: 'id' });
    if (error) throw error;

    const obsoletePaths = [previousQrPath].filter(
      (path): path is string => Boolean(path) && path !== parsed.data.paymentQrPath
    );
    const cleanupResults = await Promise.all(
      obsoletePaths.map((path) =>
        removeStoredObject(supabase, PAYMENT_MEDIA_BUCKET, path)
      )
    );
    revalidatePath('/admin/settings');
    revalidatePath('/checkout');
    return {
      success: true,
      data: cleanupResults.some((removed) => !removed)
        ? { warning: 'The recipient was saved, but an unused previous image could not be removed.' }
        : {},
    };
  } catch (error) {
    console.error('Could not save payment recipient details.', error);
    return { success: false, error: toUserFriendlyError(error, 'Could not save payment recipient details.') };
  }
}

export async function deletePaymentRecipientAction(
  payload: unknown
): Promise<ActionResult<{ warning?: string }>> {
  const { supabase } = await requireFullAccess('/admin/settings');
  const parsed = z.string().uuid().safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: 'Select a valid payment recipient.' };
  }

  try {
    const { data: recipient, error: readError } = await supabase
      .from('payment_recipients')
      .select('payment_qr_path')
      .eq('id', parsed.data)
      .maybeSingle();
    if (readError) throw readError;
    if (!recipient) {
      return { success: false, error: 'This payment recipient no longer exists.' };
    }

    const { error: deleteError } = await supabase
      .from('payment_recipients')
      .delete()
      .eq('id', parsed.data);
    if (deleteError?.code === '23503') {
      return {
        success: false,
        error: 'This recipient is linked to an order. Deactivate it instead.',
      };
    }
    if (deleteError) throw deleteError;

    const removed = await removeStoredObject(
      supabase,
      PAYMENT_MEDIA_BUCKET,
      recipient.payment_qr_path
    );
    revalidatePath('/admin/settings');
    revalidatePath('/checkout');
    return {
      success: true,
      data: removed
        ? {}
        : { warning: 'The recipient was deleted, but its unused QR image could not be removed.' },
    };
  } catch (error) {
    console.error('Could not delete a payment recipient.', error);
    return { success: false, error: toUserFriendlyError(error, 'Could not delete this payment recipient.') };
  }
}

export async function removeUnusedSystemSettingsAssetAction(
  payload: unknown
): Promise<ActionResult> {
  const { supabase } = await requireFullAccess('/admin/settings');
  const parsed = settingsAssetPathSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: 'Select a valid unused settings file.' };
  }

  const bucket = parsed.data.startsWith('logos/') || parsed.data.startsWith('about/')
    ? 'njet-storefront-branding'
    : PAYMENT_MEDIA_BUCKET;
  const removed = await removeStoredObject(supabase, bucket, parsed.data);
  return removed
    ? { success: true, data: undefined }
    : { success: false, error: 'Could not remove the unused settings file.' };
}
