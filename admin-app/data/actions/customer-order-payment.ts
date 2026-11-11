'use server';

import type { ActionResult } from '@/data/actions/auth';
import { requireCustomer } from '@/data/auth/guards';
import {
  getCustomerOrderPayment,
  type CustomerOrderPayment,
} from '@/data/commerce/customer-payment';
import { customerOrderIdSchema } from '@/lib/validations/commerce';

export async function getCustomerOrderPaymentAction(
  orderId: string
): Promise<ActionResult<CustomerOrderPayment>> {
  const { supabase } = await requireCustomer('/dashboard/orders');
  if (!customerOrderIdSchema.safeParse(orderId).success) {
    return { success: false, error: 'This payment-required order could not be found.' };
  }

  const result = await getCustomerOrderPayment(supabase, orderId);
  if (!result.data) {
    return {
      success: false,
      error: result.error ?? 'Payment details could not be loaded. Please try again later.',
    };
  }

  return { success: true, data: result.data };
}
