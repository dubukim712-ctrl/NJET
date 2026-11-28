'use server';

import { revalidatePath } from 'next/cache';
import { revalidateStorefrontCatalog } from '@/data/commerce/revalidate-storefront';
import type { ActionResult } from '@/data/actions/auth';
import { requirePermission } from '@/data/auth/guards';
import { commerceActionFailure as failure } from '@/data/commerce/action-failure';
import { PERMISSIONS } from '@/lib/permissions';
import {
  branchTransferAdminSchema,
  ebikeInventoryAdminSchema,
  inventoryAdminSchema,
  inventoryReceiptAdminSchema,
} from '@/lib/validations/commerce-admin';
import { z } from 'zod';

const transferIdSchema = z.object({ transferId: z.string().uuid() });

export async function saveCommerceInventoryAction(payload: unknown): Promise<ActionResult> {
  const { supabase } = await requirePermission(PERMISSIONS.productsManage, '/admin/products');
  const parsed = inventoryAdminSchema.safeParse(payload);
  if (!parsed.success) return { success: false, error: 'Check the stock quantity.', fieldErrors: parsed.error.flatten().fieldErrors };
  const { branchId, variantId, stock } = parsed.data;
  try {
    const { error } = await supabase.rpc('save_batch_inventory', {
      p_branch_id: branchId, p_variant_id: variantId, p_stock: stock,
    });
    if (error) return failure(error, 'Could not update stock.');
    revalidatePath('/admin/products');
    revalidateStorefrontCatalog();
    return { success: true, data: undefined };
  } catch (error) {
    return failure(error, 'Could not update stock.');
  }
}

export async function createInventoryReceiptAction(payload: unknown): Promise<ActionResult> {
  const { supabase } = await requirePermission(PERMISSIONS.productsManage, '/admin/products');
  const parsed = inventoryReceiptAdminSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Check the supplier, date, and received product details.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  try {
    const { error } = await supabase.rpc('create_inventory_receipt', {
      p_branch_id: parsed.data.branchId,
      p_supplier_name: parsed.data.supplierName,
      p_document_reference: parsed.data.documentReference,
      p_received_at: parsed.data.receivedAt,
      p_shared_cost_minor: parsed.data.sharedCostMinor,
      p_items: parsed.data.items.map((item) => ({
        variant_id: item.variantId,
        quantity: item.quantity,
        unit_supplier_cost_minor: item.unitSupplierCostMinor,
        units: item.units.map((unit) => ({
          serial_number: unit.serialNumber,
          motor_number: unit.motorNumber,
        })),
      })),
    });
    if (error) return failure(error, 'Could not record this inventory receipt.');
    revalidatePath('/admin/products');
    revalidatePath('/admin/inventory');
    revalidateStorefrontCatalog();
    return { success: true, data: undefined };
  } catch (error) {
    return failure(error, 'Could not record this inventory receipt.');
  }
}

export async function registerEbikeUnitsAction(payload: unknown): Promise<ActionResult> {
  const { supabase } = await requirePermission(PERMISSIONS.productsManage, '/admin/products');
  const parsed = ebikeInventoryAdminSchema.safeParse(payload);
  if (!parsed.success) return { success: false, error: 'Check each e-bike serial and motor number.', fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    const { error } = await supabase.rpc('register_ebike_units', {
      p_branch_id: parsed.data.branchId,
      p_variant_id: parsed.data.variantId,
      p_units: parsed.data.units.map(({ unitId, serialNumber, motorNumber }) => ({
        unit_id: unitId,
        serial_number: serialNumber,
        motor_number: motorNumber,
      })),
    });
    if (error) return failure(error, 'Could not save e-bike inventory.');
    revalidatePath('/admin/products');
    revalidateStorefrontCatalog();
    return { success: true, data: undefined };
  } catch (error) {
    return failure(error, 'Could not save e-bike inventory.');
  }
}

export async function dispatchBranchTransferAction(payload: unknown): Promise<ActionResult> {
  const { supabase } = await requirePermission(PERMISSIONS.productsManage, '/admin/products');
  const parsed = branchTransferAdminSchema.safeParse(payload);
  if (!parsed.success) return { success: false, error: 'Check the transfer details.', fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    const { error } = await supabase.rpc('dispatch_branch_transfer', {
      p_source_branch_id: parsed.data.sourceBranchId,
      p_destination_branch_id: parsed.data.destinationBranchId,
      p_items: parsed.data.items.map(({ variantId, quantity, unitIds }) => ({
        variant_id: variantId, quantity, unit_ids: unitIds,
      })),
      p_note: parsed.data.note,
    });
    if (error) return failure(error, 'Could not dispatch this transfer.');
    revalidatePath('/admin/products');
    revalidateStorefrontCatalog();
    return { success: true, data: undefined };
  } catch (error) {
    return failure(error, 'Could not dispatch this transfer.');
  }
}

export async function receiveBranchTransferAction(payload: unknown): Promise<ActionResult> {
  const { supabase } = await requirePermission(PERMISSIONS.productsManage, '/admin/products');
  const parsed = transferIdSchema.safeParse(payload);
  if (!parsed.success) return { success: false, error: 'Select a valid branch transfer.' };
  try {
    const { error } = await supabase.rpc('receive_branch_transfer', {
      p_transfer_id: parsed.data.transferId,
    });
    if (error) return failure(error, 'Could not receive this transfer.');
    revalidatePath('/admin/products');
    revalidateStorefrontCatalog();
    return { success: true, data: undefined };
  } catch (error) {
    return failure(error, 'Could not receive this transfer.');
  }
}
