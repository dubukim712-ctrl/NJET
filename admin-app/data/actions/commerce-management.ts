'use server';

import type { ActionResult } from '@/data/actions/auth';
import { requirePermission } from '@/data/auth/guards';
import { getCommerceManagementData } from '@/data/commerce/admin-queries';
import { PERMISSIONS } from '@/lib/permissions';

type CommerceManagementData = NonNullable<
  Awaited<ReturnType<typeof getCommerceManagementData>>['data']
>;

export async function getCommerceManagementDataAction(): Promise<
  ActionResult<CommerceManagementData>
> {
  const { supabase } = await requirePermission(
    PERMISSIONS.productsRead,
    '/admin/products'
  );
  const result = await getCommerceManagementData(supabase);
  if (!result.data) {
    return {
      success: false,
      error: result.error ?? 'Commerce data is unavailable.',
    };
  }
  return { success: true, data: result.data };
}
