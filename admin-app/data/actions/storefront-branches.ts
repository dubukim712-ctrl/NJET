'use server';

import type { ActionResult } from '@/data/actions/auth';
import { getStorefrontBranches } from '@/data/commerce/storefront-branches';
import type { StorefrontBranchLocation } from '@/lib/validations/storefront-branches';

export async function getStorefrontBranchesAction(): Promise<
  ActionResult<StorefrontBranchLocation[]>
> {
  const result = await getStorefrontBranches();
  if (!result.data) {
    return {
      success: false,
      error: result.error ?? 'Branch locations could not be loaded.',
    };
  }
  return { success: true, data: result.data };
}
