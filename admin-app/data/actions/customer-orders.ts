'use server';

import type { ActionResult } from '@/data/actions/auth';
import { requireCustomer } from '@/data/auth/guards';
import { getCustomerOrders, type CustomerOrder } from '@/data/commerce/customer-orders';

export async function getCustomerOrdersAction(): Promise<
  ActionResult<CustomerOrder[]>
> {
  const { supabase, user } = await requireCustomer('/dashboard/orders');
  const result = await getCustomerOrders(supabase, user.id);
  if (result.error || !result.data) {
    return {
      success: false,
      error: result.error ?? 'Order history could not be loaded. Please try again later.',
    };
  }
  return { success: true, data: result.data };
}
