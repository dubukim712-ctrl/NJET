'use server';

import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/data/actions/auth';
import { requirePermission } from '@/data/auth/guards';
import { PERMISSIONS } from '@/lib/permissions';
import { completeOrderWithPaymentSchema } from '@/lib/validations/commerce-admin';

export async function completeCommerceOrderWithPaymentAction(
  payload: unknown,
): Promise<ActionResult> {
  const { supabase } = await requirePermission(PERMISSIONS.ordersManage, '/admin/orders');
  const parsed = completeOrderWithPaymentSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: 'Review the payment details.', fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    const { error } = await supabase.rpc('complete_commerce_order_with_payment', {
      p_order_id: parsed.data.orderId,
      p_amount_minor: parsed.data.amountMinor,
      p_payment_method: parsed.data.paymentMethod,
      p_payment_provider: parsed.data.paymentProvider,
      p_reference: parsed.data.reference,
    });
    if (error) {
      console.error('Could not complete the order with its payment.', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/orders');
    revalidatePath('/admin/reports');
    revalidatePath('/dashboard/orders');
    return { success: true, data: undefined };
  } catch (error) {
    console.error('Could not complete the order with its payment.', error);
    return { success: false, error: 'Could not complete the order. Please try again.' };
  }
}
