'use server';

import type { ActionResult } from '@/data/actions/auth';
import { requireCustomer } from '@/data/auth/guards';
import { getCheckoutOptions } from '@/data/commerce/checkout-options';
import type { CheckoutOptions } from '@/data/commerce/checkout-options';

export async function getCheckoutOptionsAction(): Promise<
  ActionResult<CheckoutOptions>
> {
  await requireCustomer('/checkout');
  const result = await getCheckoutOptions();
  if (!result.data) {
    return {
      success: false,
      error: result.error ?? 'Checkout options could not be loaded.',
    };
  }
  return { success: true, data: result.data };
}
