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
  const isBranchScopedStaff =
    profile.scope === 'staff' && !profile.is_full_access;
  const branchScope = isBranchScopedStaff ? profile.branch_id : null;
  if (isBranchScopedStaff && !branchScope) {
    return {
      success: false,
      error: 'No branch is assigned to your account. Contact an administrator to access orders.',
    };
  }

  const result = await getCommerceOrders(
    supabase,
    parsedFilters.data,
    hasPermission(profile, PERMISSIONS.ordersManage),
    branchScope
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
