'use server';

import type { ActionResult } from '@/data/actions/auth';
import { requirePermission } from '@/data/auth/guards';
import { PERMISSIONS } from '@/lib/permissions';
import {
  inventoryValuationRequestSchema,
  inventoryValuationResponseSchema,
  type InventoryValuationResponse,
} from '@/lib/validations/inventory-valuation';

export async function getInventoryValuationAction(
  payload: unknown
): Promise<ActionResult<InventoryValuationResponse>> {
  const { supabase } = await requirePermission(PERMISSIONS.productsManage, '/admin/inventory');
  const parsed = inventoryValuationRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: 'Choose a valid branch and report page.' };
  }
  try {
    const { data, error } = await supabase.rpc('admin_inventory_valuation', {
      p_branch_id: parsed.data.branchId,
      p_page: parsed.data.page,
      p_page_size: parsed.data.pageSize,
    });
    if (error) {
      console.error('Could not load inventory valuation.', error);
      return { success: false, error: 'Inventory valuation could not be loaded.' };
    }
    const result = inventoryValuationResponseSchema.safeParse(data);
    if (!result.success) {
      console.error('Inventory valuation returned an invalid response.', result.error);
      return { success: false, error: 'Inventory valuation returned invalid data.' };
    }
    return { success: true, data: result.data };
  } catch (error) {
    console.error('Could not load inventory valuation.', error);
    return { success: false, error: 'Inventory valuation could not be loaded.' };
  }
}
