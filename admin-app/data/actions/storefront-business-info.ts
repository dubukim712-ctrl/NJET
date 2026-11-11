'use server';

import type { ActionResult } from '@/data/actions/auth';
import { getStorefrontBusinessInfo } from '@/data/commerce/system-settings';
import { createClient } from '@/data/supabase/server';
import type { StorefrontBusinessInfo } from '@/data/commerce/system-settings';

export async function getStorefrontBusinessInfoAction(): Promise<
  ActionResult<StorefrontBusinessInfo>
> {
  const result = await getStorefrontBusinessInfo(await createClient());
  if (!result.data) {
    return {
      success: false,
      error: result.error ?? 'Business contact information is unavailable.',
    };
  }
  return { success: true, data: result.data };
}
