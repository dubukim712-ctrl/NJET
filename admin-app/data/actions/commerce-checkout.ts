'use server';

import { revalidatePath } from 'next/cache';
import { revalidateStorefrontCatalog } from '@/data/commerce/revalidate-storefront';
import type { ActionResult } from '@/data/actions/auth';
import { toUserFriendlyError } from '@/data/supabase/user-friendly-errors';
import { getAuthContext, requireCustomer } from '@/data/auth/guards';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import {
  checkoutSchema,
  paymentProofSubmissionSchema,
} from '@/lib/validations/commerce';

type CommerceOrderResult = ActionResult<{ orderId: string }> & {
  requiresLogin?: boolean;
  retryable?: boolean;
};

async function removeUnlinkedDocuments(
  supabase: Awaited<ReturnType<typeof requireCustomer>>['supabase'],
  paths: string[]
) {
  if (!paths.length) return true;
  try {
    const { error } = await supabase.storage.from('njet-order-documents').remove(paths);
    if (error) {
      console.error('Could not remove unlinked checkout documents.', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Could not remove unlinked checkout documents.', error);
    return false;
  }
}

export async function createCommerceOrderAction(
  payload: unknown
): Promise<CommerceOrderResult> {
  const context = await getAuthContext();
  if (!context) {
    return {
      success: false,
      error: 'You must sign in before placing your order.',
      requiresLogin: true,
    };
  }
  if (!hasPermission(context.profile, PERMISSIONS.storefrontAccess)) {
    return {
      success: false,
      error: 'This account does not have permission to place customer orders.',
    };
  }
  const { supabase } = context;
  const validation = checkoutSchema.safeParse(payload);
  if (!validation.success) {
    return {
      success: false,
      error: 'Please review the checkout details and required documents.',
      fieldErrors: validation.error.flatten().fieldErrors,
    };
  }

  const input = validation.data;
  let orderId: string | null = null;
  try {
    const { data, error } = await supabase.rpc('create_commerce_order_with_discount', {
      p_customer_name: input.customerName,
      p_contact_number: input.contactNumber,
      p_fulfillment: input.fulfillment,
      p_branch_id: input.branchId,
      p_delivery_zone_id: input.deliveryZoneId,
      p_address_line1: input.addressLine1,
      p_barangay: input.barangay,
      p_city: input.city,
      p_province: input.province,
      p_postal_code: input.postalCode,
      p_payment_method: input.paymentMethod,
      p_payment_provider: input.paymentProvider,
      p_payment_recipient_id: input.paymentRecipientId,
      p_payment_reference: null,
      p_terms_version: input.termsVersion,
      p_return_policy_version: input.returnPolicyVersion,
      p_privacy_version: input.privacyVersion,
      p_terms_accepted: input.termsAccepted,
      p_privacy_accepted: input.privacyAccepted,
      p_items: input.items.map(({ variantId, quantity }) => ({
        variant_id: variantId,
        quantity,
      })),
      p_documents: input.documents.map(({ kind, objectPath }) => ({
        kind,
        object_path: objectPath,
      })),
      p_coupon_code: input.couponCode,
      p_submission_id: input.submissionId,
    });
    if (error && ['P0001', '23505', '23503', '22P02', '23514', '23502'].includes(error.code)) {
      console.error('Checkout was rejected.', error);
      return { success: false, error: toUserFriendlyError(error, 'Could not place this order. Review your checkout details.') };
    }
    if (error) console.error('Could not confirm the checkout RPC result.', error);
    orderId = error ? null : data;
  } catch (error) {
    console.error('Could not confirm the checkout RPC result.', error);
  }

  if (!orderId) {
    // The database may have committed. Keep the uploads available to this attempt.
    return {
      success: false,
      retryable: true,
      error: 'We could not confirm your order. Retry with the same checkout details.',
    };
  }

  if (input.provinceCode && input.cityCode && input.barangayCode) {
    try {
      const { error } = await supabase.rpc('save_first_checkout_address', {
        p_street_address: input.addressLine1,
        p_province_code: input.provinceCode,
        p_province_name: input.province,
        p_city_code: input.cityCode,
        p_city_name: input.city,
        p_barangay_code: input.barangayCode,
        p_barangay_name: input.barangay,
        p_postal_code: input.postalCode,
      });
      if (error) console.error('Could not save the first checkout address.', error.code);
    } catch {
      console.error('Could not save the first checkout address.');
    }
  }

  revalidateStorefrontCatalog();
  revalidatePath('/orders');
  revalidatePath('/admin/orders');
  return { success: true, data: { orderId } };
}

export async function submitOrderPaymentProofAction(
  payload: unknown
): Promise<ActionResult<{ orderId: string; warning: string | null }>> {
  const { supabase } = await requireCustomer('/orders');
  const validation = paymentProofSubmissionSchema.safeParse(payload);
  if (!validation.success) {
    return { success: false, error: 'Choose a valid payment proof and order.' };
  }

  const { orderId, objectPath, paymentReference } = validation.data;
  let response: {
    data: { previous_object_path: string | null; expired: boolean }[] | null;
    error: { code: string; message: string } | null;
  };
  try {
    response = await supabase.rpc('attach_order_payment_proof', {
      p_order_id: orderId,
      p_object_path: objectPath,
      p_payment_reference: paymentReference,
    });
  } catch (submitError) {
    console.error('Could not submit order payment proof.', submitError);
    const cleanupSucceeded = await removeUnlinkedDocuments(supabase, [objectPath]);
    return {
      success: false,
      error: cleanupSucceeded
        ? 'Payment proof could not be submitted. Please try again.'
        : 'Payment proof was not submitted; a private file may remain in storage. Contact the store before retrying.',
    };
  }
  const { data, error } = response;
  if (error) {
    console.error('Could not submit order payment proof.', error);
    const cleanupSucceeded = await removeUnlinkedDocuments(supabase, [objectPath]);
    return {
      success: false,
      error: cleanupSucceeded
        ? toUserFriendlyError(error, 'The payment proof could not be attached to this order.')
        : 'Payment proof was not submitted; a private file may remain in storage. Contact the store before retrying.',
    };
  }

  const result = data?.[0];
  if (!result) {
    const cleanupSucceeded = await removeUnlinkedDocuments(supabase, [objectPath]);
    return {
      success: false,
      error: cleanupSucceeded
        ? 'The payment proof could not be attached to this order.'
        : 'Payment proof was not submitted; a private file may remain in storage. Contact the store before retrying.',
    };
  }
  if (result.expired) {
    const cleanupSucceeded = await removeUnlinkedDocuments(supabase, [objectPath]);
    revalidateStorefrontCatalog();
    revalidatePath('/orders');
    revalidatePath(`/orders/${orderId}`);
    return {
      success: false,
      error: cleanupSucceeded
        ? 'The one-hour payment window expired. This order can no longer accept payment.'
        : 'The payment window expired; an unlinked private file may remain in storage.',
    };
  }

  let warning: string | null = null;
  if (result.previous_object_path) {
    const cleanupSucceeded = await removeUnlinkedDocuments(supabase, [result.previous_object_path]);
    if (!cleanupSucceeded) {
      warning = 'The new proof was saved, but an older private file could not be removed.';
    }
  }
  revalidateStorefrontCatalog();
  revalidatePath('/orders');
  revalidatePath(`/orders/${orderId}`);
  revalidatePath('/admin/orders');
  return { success: true, data: { orderId, warning } };
}
