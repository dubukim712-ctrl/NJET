'use server';

import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/data/actions/auth';
import { getAuthContext, requireCustomer } from '@/data/auth/guards';
import { TERMS_VERSION, PRIVACY_VERSION } from '@/lib/commerce';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import {
  checkoutSchema,
  paymentProofSubmissionSchema,
} from '@/lib/validations/commerce';

type CommerceOrderResult = ActionResult<{ orderId: string }> & {
  requiresLogin?: boolean;
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
  const paths = input.documents.map((document) => document.objectPath);
  let orderId: string | null = null;
  try {
    const { data, error } = await supabase.rpc('create_commerce_order_with_recipient', {
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
      p_terms_version: TERMS_VERSION,
      p_privacy_version: PRIVACY_VERSION,
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
    });
    if (error) {
      const cleanupSucceeded = await removeUnlinkedDocuments(supabase, paths);
      return {
        success: false,
        error: cleanupSucceeded
          ? error.message
          : 'The order was not placed. Some uploaded files may remain in private storage; contact the store before retrying.',
      };
    }
    orderId = data;
  } catch (error) {
    console.error('Could not create the commerce order.', error);
    const cleanupSucceeded = await removeUnlinkedDocuments(supabase, paths);
    return {
      success: false,
      error: cleanupSucceeded
        ? 'The order could not be placed. Please try again.'
        : 'The order was not placed. Some uploaded files may remain in private storage; contact the store before retrying.',
    };
  }

  if (!orderId) {
    const cleanupSucceeded = await removeUnlinkedDocuments(supabase, paths);
    return {
      success: false,
      error: cleanupSucceeded
        ? 'The order could not be confirmed. Please try again.'
        : 'The order was not placed. Some uploaded files may remain in private storage; contact the store before retrying.',
    };
  }

  revalidatePath('/dashboard/orders');
  revalidatePath('/admin/orders');
  return { success: true, data: { orderId } };
}

export async function submitOrderPaymentProofAction(
  payload: unknown
): Promise<ActionResult<{ orderId: string; warning: string | null }>> {
  const { supabase } = await requireCustomer('/dashboard/orders');
  const validation = paymentProofSubmissionSchema.safeParse(payload);
  if (!validation.success) {
    return { success: false, error: 'Choose a valid payment proof and order.' };
  }

  const { orderId, objectPath, paymentReference } = validation.data;
  let response: {
    data: { previous_object_path: string | null; expired: boolean }[] | null;
    error: { message: string } | null;
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
    const cleanupSucceeded = await removeUnlinkedDocuments(supabase, [objectPath]);
    return {
      success: false,
      error: cleanupSucceeded
        ? error.message
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
    revalidatePath('/dashboard/orders');
    revalidatePath(`/dashboard/orders/${orderId}`);
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
  revalidatePath('/dashboard/orders');
  revalidatePath(`/dashboard/orders/${orderId}`);
  revalidatePath('/admin/orders');
  return { success: true, data: { orderId, warning } };
}
