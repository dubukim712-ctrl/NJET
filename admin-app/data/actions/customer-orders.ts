'use server';

import { z } from 'zod';
import type { ActionResult } from '@/data/actions/auth';
import { getPrintableReceipt } from '@/data/commerce/printable-receipt';
import { customerOrderIdSchema } from '@/lib/validations/commerce';
import { requireCustomer } from '@/data/auth/guards';
import {
  getCustomerOrders,
  type CustomerOrdersPage,
} from '@/data/commerce/customer-orders';

const orderHistoryCursor = z.object({
  createdAt: z.iso.datetime({ offset: true }),
  id: z.uuid(),
}).nullable();

export async function getCustomerOrdersAction(cursor: unknown, customerId: string): Promise<
  ActionResult<CustomerOrdersPage>
> {
  const { supabase, user } = await requireCustomer('/orders');
  if (user.id !== customerId) {
    return { success: false, error: 'Your session has changed. Reload the page to view your orders.' };
  }

  const parsed = orderHistoryCursor.safeParse(cursor);
  if (!parsed.success) {
    return { success: false, error: 'This order history page is unavailable. Reload the page and try again.' };
  }

  const result = await getCustomerOrders(supabase, user.id, parsed.data);
  if (result.error || !result.data) {
    return {
      success: false,
      error: result.error ?? 'Order history could not be loaded. Please try again later.',
    };
  }
  return { success: true, data: result.data };
}

export async function getCustomerOrderDetailsAction(orderId: unknown, customerId: string) {
  const parsed = customerOrderIdSchema.safeParse(orderId);
  if (!parsed.success) return null;
  const { supabase, user } = await requireCustomer('/orders');
  if (user.id !== customerId) return null;

  const result = await getCustomerOrders(supabase, user.id, null, parsed.data);
  if (result.error) throw new Error('Order details could not be loaded.');
  return result.data?.orders[0] ?? null;
}

export async function getCustomerReceiptAction(orderId: unknown, customerId: string) {
  const parsed = customerOrderIdSchema.safeParse(orderId);
  if (!parsed.success) return null;
  const { supabase, user } = await requireCustomer('/orders');
  if (user.id !== customerId) return null;

  try {
    return await getPrintableReceipt(supabase, parsed.data, { customerId: user.id });
  } catch (error) {
    console.error('Could not load printable receipt.', error);
    throw new Error('Sales receipt could not be loaded.');
  }
}
