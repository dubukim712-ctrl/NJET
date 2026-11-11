'use server';

import type { ActionResult } from '@/data/actions/auth';
import { requirePermission } from '@/data/auth/guards';
import { getCommerceOrders } from '@/data/commerce/admin-orders';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { orderFiltersSchema } from '@/lib/validations/order-filters';
import type {
  OrderBranchOption,
  StaffOrder,
} from '@/data/commerce/admin-orders';

export async function getCommerceOrdersAction(
  payload: unknown
): Promise<ActionResult<{ orders: StaffOrder[]; branches: OrderBranchOption[] }>> {
  const parsedFilters = orderFiltersSchema.safeParse(payload);
  if (!parsedFilters.success) {
    return { success: false, error: 'Order filters are invalid.' };
  }

  const { supabase, profile } = await requirePermission(
    PERMISSIONS.ordersRead,
    '/admin/orders'
  );
  if (profile.scope === 'staff' && !profile.is_full_access && !profile.branch_id) {
    return {
      success: false,
      error: 'No branch is assigned to your account. Contact an administrator to access orders.',
    };
  }

  const result = await getCommerceOrders(
    supabase,
    parsedFilters.data,
    hasPermission(profile, PERMISSIONS.ordersManage)
  );
  if (result.error || !result.data) {
    return {
      success: false,
      error: result.error ?? 'Order data is unavailable.',
    };
  }

  return {
    success: true,
    data: { orders: result.data, branches: result.branches },
  };
}
