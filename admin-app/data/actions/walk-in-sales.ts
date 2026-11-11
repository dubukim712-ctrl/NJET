'use server';

import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/data/actions/auth';
import { requirePermission } from '@/data/auth/guards';
import {
  getWalkInCatalog,
  type WalkInCatalogItem,
} from '@/data/commerce/walk-in-sales';
import { PERMISSIONS } from '@/lib/permissions';
import { walkInSaleSchema } from '@/lib/validations/walk-in-sale';
import { z } from 'zod';

export async function getWalkInCatalogAction(
  payload: unknown
): Promise<ActionResult<WalkInCatalogItem[]>> {
  const { supabase } = await requirePermission(
    PERMISSIONS.ordersManage,
    '/admin/orders/new'
  );
  const branchId = z.string().uuid().safeParse(payload);
  if (!branchId.success) {
    return { success: false, error: 'Choose a valid branch.' };
  }
  const result = await getWalkInCatalog(supabase, branchId.data);
  if (result.error || !result.data) {
    return {
      success: false,
      error: result.error ?? 'The product catalog could not be loaded.',
    };
  }
  return { success: true, data: result.data };
}

export async function createWalkInSaleAction(
  payload: unknown
): Promise<ActionResult<{ orderId: string }>> {
  const { supabase } = await requirePermission(
    PERMISSIONS.ordersManage,
    '/admin/orders/new'
  );
  const parsed = walkInSaleSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Review the customer, cart, and payment details.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const input = parsed.data;
  try {
    const homeCreditDetails = input.homeCreditDetails;
    if (input.paymentMethod === 'home_credit' && !homeCreditDetails) {
      return { success: false, error: 'Home Credit details are required.' };
    }
    const sharedArgs = {
      p_customer_name: input.customerName,
      p_contact_number: input.contactNumber,
      p_branch_id: input.branchId,
      p_address_line1: input.addressLine1,
      p_barangay: input.barangay,
      p_city: input.city,
      p_province: input.province,
      p_postal_code: input.postalCode,
      p_items: input.items.map(({ variantId, quantity }) => ({
        variant_id: variantId,
        quantity,
      })),
    };
    const result = input.paymentMethod === 'home_credit' && homeCreditDetails
      ? await supabase.rpc('create_walk_in_home_credit_sale', {
          ...sharedArgs,
          p_home_credit_acc_no: homeCreditDetails.accountNo,
          p_downpayment_minor: homeCreditDetails.downpayment,
          p_terms_months: homeCreditDetails.termsMonths,
          p_monthly_payment_minor: homeCreditDetails.monthlyPayment,
        })
      : await supabase.rpc('create_walk_in_sale', {
          ...sharedArgs,
          p_payment_method: input.paymentMethod,
          p_payment_provider: input.paymentProvider,
          p_payment_reference: input.paymentReference,
          p_cash_tendered_minor: input.cashTenderedMinor,
        });
    const { data, error } = result;
    if (error) {
      console.error('Could not create walk-in sale.', error);
      return { success: false, error: error.message };
    }
    revalidatePath('/admin/orders');
    revalidatePath('/admin/products');
    return { success: true, data: { orderId: data } };
  } catch (error) {
    console.error('Could not create walk-in sale.', error);
    return {
      success: false,
      error: 'The walk-in sale could not be created. Please try again.',
    };
  }
}
