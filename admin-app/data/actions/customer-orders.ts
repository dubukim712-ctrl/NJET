'use server';

import { z } from 'zod';
import type { ActionResult } from '@/data/actions/auth';
import { requireCustomer } from '@/data/auth/guards';
import {
  getCustomerOrderDocumentUrl,
  getCustomerOrders,
  type CustomerOrdersPage,
} from '@/data/commerce/customer-orders';

const orderHistoryCursor = z.object({
  createdAt: z.iso.datetime({ offset: true }),
  id: z.uuid(),
}).nullable();

export async function getCustomerOrdersAction(cursor: unknown = null): Promise<
  ActionResult<CustomerOrdersPage>
> {
  const { supabase, user } = await requireCustomer('/dashboard/orders');
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

const orderDocumentRequest = z.object({
  orderId: z.string().uuid(),
  kind: z.enum(['certificate', 'receipt']),
});

export async function getCustomerOrderDocumentUrlAction(
  input: unknown,
): Promise<ActionResult<{ url: string }>> {
  const { supabase, user } = await requireCustomer('/dashboard/orders');
  const request = orderDocumentRequest.safeParse(input);
  if (!request.success) {
    return { success: false, error: 'Choose a valid order document.' };
  }

  const { orderId, kind } = request.data;
  try {
    const url = await getCustomerOrderDocumentUrl(supabase, user.id, orderId, kind);
    if (!url) {
      return { success: false, error: 'This order document is unavailable.' };
    }
    return { success: true, data: { url } };
  } catch (error) {
    console.error('Could not sign a customer order document.', error);
    return { success: false, error: 'The document could not be downloaded. Please try again.' };
  }
}
