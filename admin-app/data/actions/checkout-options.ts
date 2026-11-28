'use server';

import type { ActionResult } from '@/data/actions/auth';
import { requireCustomer } from '@/data/auth/guards';
import { getCheckoutOptions } from '@/data/commerce/checkout-options';
import type { CheckoutOptions } from '@/data/commerce/checkout-options';

import { resolveCheckoutCustomerName } from '@/data/commerce/checkout-customer-name';

export async function getCheckoutOptionsAction(customerId: string): Promise<
  ActionResult<CheckoutOptions & { initialCustomerName: string }>
> {
  const { user, profile } = await requireCustomer('/checkout');
  if (user.id !== customerId) return { success: false, error: 'Your session has changed.' };
  const result = await getCheckoutOptions(user.id);
  if (!result.data) {
    return {
      success: false,
      error: result.error ?? 'Checkout options could not be loaded.',
    };
  }
  return { success: true, data: { ...result.data, initialCustomerName: resolveCheckoutCustomerName(profile?.full_name, user.user_metadata) } };
}
