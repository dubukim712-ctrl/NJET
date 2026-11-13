'use server';

import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/data/actions/auth';
import { requirePermission } from '@/data/auth/guards';
import { PERMISSIONS } from '@/lib/permissions';
import { completeHomeCreditOrderSchema } from '@/lib/validations/home-credit-processing';
import { z } from 'zod';
import {
  branchAdminSchema,
  branchTransferAdminSchema,
  deliveryZoneAdminSchema,
  ebikeInventoryAdminSchema,
  inventoryAdminSchema,
  inventoryReceiptAdminSchema,
  productCategoryAdminSchema,
  productAdminSchema,
  subcategoryAdminSchema,
} from '@/lib/validations/commerce-admin';

function failure(error: unknown, fallback: string): ActionResult {
  console.error(fallback, error);
  return { success: false, error: fallback };
}

const orderIdSchema = z.object({ orderId: z.string().uuid() });
const transferIdSchema = z.object({ transferId: z.string().uuid() });
const productImagePathSchema = z.string().regex(/^images\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$/);

async function updateCommerceOrderStatus(
  payload: unknown,
  rpc: 'confirm_commerce_order' | 'cancel_commerce_order'
): Promise<ActionResult> {
  const { supabase } = await requirePermission(PERMISSIONS.ordersManage, '/admin/orders');
  const parsed = orderIdSchema.safeParse(payload);
  if (!parsed.success) return { success: false, error: 'Select a valid order.' };
  try {
    const { error } = await supabase.rpc(rpc, { p_order_id: parsed.data.orderId });
    if (error) return failure(error, error.message);
    revalidatePath('/admin/orders');
    revalidatePath('/dashboard/orders');
    return { success: true, data: undefined };
  } catch (error) {
    return failure(error, 'Could not update the order status.');
  }
}

export async function confirmCommerceOrderAction(payload: unknown) {
  return updateCommerceOrderStatus(payload, 'confirm_commerce_order');
}

export async function cancelCommerceOrderAction(payload: unknown) {
  return updateCommerceOrderStatus(payload, 'cancel_commerce_order');
}

export async function completeHomeCreditCommerceOrderAction(
  payload: unknown
): Promise<ActionResult> {
  const { supabase } = await requirePermission(PERMISSIONS.ordersManage, '/admin/orders');
  const parsed = completeHomeCreditOrderSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Review the Home Credit account and financing details.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  try {
    const { error } = await supabase.rpc('complete_commerce_order_with_home_credit', {
      p_order_id: parsed.data.orderId,
      p_home_credit_acc_no: parsed.data.accountNo,
      p_downpayment_minor: parsed.data.downpayment,
      p_terms_months: parsed.data.termsMonths,
      p_monthly_payment_minor: parsed.data.monthlyPayment,
    });
    if (error) return failure(error, error.message);
    revalidatePath('/admin/orders');
    revalidatePath('/dashboard/orders');
    return { success: true, data: undefined };
  } catch (error) {
    return failure(error, 'Could not complete the Home Credit order.');
  }
}

export async function saveCommerceProductAction(payload: unknown): Promise<ActionResult> {
  const { supabase } = await requirePermission(PERMISSIONS.productsManage, '/admin/products');
  const parsed = productAdminSchema.safeParse(payload);
  if (!parsed.success) return { success: false, error: 'Check the product details.', fieldErrors: parsed.error.flatten().fieldErrors };
  const { id, slug, name, description, categoryId, subcategoryId, imagePath, active } = parsed.data;
  try {
    const categoryResult = await supabase
      .from('product_categories')
      .select('tracks_serial_inventory')
      .eq('id', categoryId)
      .maybeSingle();
    if (categoryResult.error) return failure(categoryResult.error, categoryResult.error.message);
    if (!categoryResult.data) return { success: false, error: 'Choose a valid main category.' };
    const productType = categoryResult.data.tracks_serial_inventory ? 'ebike' : 'part';
    const result = id
      ? await supabase.from('products').update({
          slug, name, description, category_id: categoryId, product_type: productType,
          subcategory_id: subcategoryId, image_path: imagePath, active,
        }).eq('id', id)
      : await supabase.from('products').insert({
          slug, name, description, category_id: categoryId, product_type: productType,
          subcategory_id: subcategoryId, image_path: imagePath,
        });
    if (result.error) return failure(result.error, result.error.message);
    revalidatePath('/admin/products');
    revalidatePath('/shop');
    revalidatePath('/shop/view-product/[slug]', 'page');
    return { success: true, data: undefined };
  } catch (error) {
    return failure(error, 'Could not save this product.');
  }
}

export async function saveCommerceInventoryAction(payload: unknown): Promise<ActionResult> {
  const { supabase } = await requirePermission(PERMISSIONS.productsManage, '/admin/products');
  const parsed = inventoryAdminSchema.safeParse(payload);
  if (!parsed.success) return { success: false, error: 'Check the stock quantity.', fieldErrors: parsed.error.flatten().fieldErrors };
  const { branchId, variantId, stock } = parsed.data;
  try {
    const { error } = await supabase.rpc('save_batch_inventory', {
      p_branch_id: branchId, p_variant_id: variantId, p_stock: stock,
    });
    if (error) return failure(error, error.message);
    revalidatePath('/admin/products');
    revalidatePath('/shop');
    revalidatePath('/shop/view-product/[slug]', 'page');
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
    if (error) return failure(error, error.message);
    revalidatePath('/admin/products');
    revalidatePath('/admin/inventory');
    revalidatePath('/shop');
    revalidatePath('/shop/view-product/[slug]', 'page');
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
    if (error) return failure(error, error.message);
    revalidatePath('/admin/products');
    revalidatePath('/shop');
    revalidatePath('/shop/view-product/[slug]', 'page');
    return { success: true, data: undefined };
  } catch (error) {
    return failure(error, 'Could not save e-bike inventory.');
  }
}

export async function saveProductSubcategoryAction(payload: unknown): Promise<ActionResult> {
  const { supabase } = await requirePermission(PERMISSIONS.productsManage, '/admin/products');
  const parsed = subcategoryAdminSchema.safeParse(payload);
  if (!parsed.success) return { success: false, error: 'Check the subcategory details.', fieldErrors: parsed.error.flatten().fieldErrors };
  const { id, categoryId, name, slug, active } = parsed.data;
  try {
    const categoryResult = await supabase
      .from('product_categories')
      .select('id')
      .eq('id', categoryId)
      .maybeSingle();
    if (categoryResult.error) return failure(categoryResult.error, categoryResult.error.message);
    if (!categoryResult.data) return { success: false, error: 'Choose a valid main category.' };
    const result = id
      ? await supabase.from('product_subcategories').update({
          category_id: categoryId, name, slug, active,
        }).eq('id', id)
      : await supabase.from('product_subcategories').insert({
          category_id: categoryId, name, slug,
        });
    if (result.error) return failure(result.error, result.error.message);
    revalidatePath('/admin/products');
    revalidatePath('/shop');
    revalidatePath('/shop/view-product/[slug]', 'page');
    return { success: true, data: undefined };
  } catch (error) {
    return failure(error, 'Could not save this subcategory.');
  }
}

export async function saveProductCategoryAction(payload: unknown): Promise<ActionResult> {
  const { supabase } = await requirePermission(PERMISSIONS.productsManage, '/admin/products');
  const parsed = productCategoryAdminSchema.safeParse(payload);
  if (!parsed.success) return { success: false, error: 'Check the main category details.', fieldErrors: parsed.error.flatten().fieldErrors };
  const { id, tracksSerialInventory, name, slug } = parsed.data;
  try {
    const result = id
      ? await supabase.from('product_categories').update({ name, slug }).eq('id', id)
      : await supabase.from('product_categories').insert({
          tracks_serial_inventory: tracksSerialInventory, name, slug,
        });
    if (result.error) return failure(result.error, result.error.message);
    revalidatePath('/admin/products');
    revalidatePath('/shop');
    revalidatePath('/shop/view-product/[slug]', 'page');
    return { success: true, data: undefined };
  } catch (error) {
    return failure(error, 'Could not save this main category.');
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
    if (error) return failure(error, error.message);
    revalidatePath('/admin/products');
    revalidatePath('/shop');
    revalidatePath('/shop/view-product/[slug]', 'page');
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
    if (error) return failure(error, error.message);
    revalidatePath('/admin/products');
    revalidatePath('/shop');
    revalidatePath('/shop/view-product/[slug]', 'page');
    return { success: true, data: undefined };
  } catch (error) {
    return failure(error, 'Could not receive this transfer.');
  }
}

export async function removeUnusedProductImageAction(payload: unknown): Promise<ActionResult> {
  const { supabase } = await requirePermission(PERMISSIONS.productsManage, '/admin/products');
  const parsed = productImagePathSchema.safeParse(payload);
  if (!parsed.success) return { success: false, error: 'The uploaded image path is invalid.' };
  try {
    const [{ data: products, error: productError }, { data: variants, error: variantError }] =
      await Promise.all([
        supabase.from('products').select('id').eq('image_path', parsed.data).limit(1),
        supabase.from('product_variants').select('id').eq('image_path', parsed.data).limit(1),
      ]);
    if (productError) throw productError;
    if (variantError) throw variantError;
    if (products.length || variants.length) return { success: true, data: undefined };
    const { error } = await supabase.storage.from('njet-product-images').remove([parsed.data]);
    if (error) return failure(error, 'The unused uploaded image could not be removed.');
    return { success: true, data: undefined };
  } catch (error) {
    return failure(error, 'The unused uploaded image could not be removed.');
  }
}

export async function saveCommerceBranchAction(payload: unknown): Promise<ActionResult> {
  const { supabase } = await requirePermission(PERMISSIONS.branchesManage, '/admin/branches');
  const parsed = branchAdminSchema.safeParse(payload);
  if (!parsed.success) return { success: false, error: 'Check the branch details.', fieldErrors: parsed.error.flatten().fieldErrors };
  const { id, slug, name, address, latitude, longitude, active } = parsed.data;
  try {
    const result = id
      ? await supabase.from('branches').update({
          slug, name, address, latitude, longitude, active,
        }).eq('id', id)
      : await supabase.from('branches').insert({
          slug, name, address, latitude, longitude,
        });
    if (result.error) return failure(result.error, result.error.message);
    revalidatePath('/admin/branches');
    revalidatePath('/admin/products');
    revalidatePath('/shop');
    revalidatePath('/checkout');
    return { success: true, data: undefined };
  } catch (error) {
    return failure(error, 'Could not save this branch.');
  }
}

export async function saveDeliveryZoneAction(payload: unknown): Promise<ActionResult> {
  const { supabase } = await requirePermission(PERMISSIONS.deliveryZonesManage, '/admin/delivery-zones');
  const parsed = deliveryZoneAdminSchema.safeParse(payload);
  if (!parsed.success) return { success: false, error: 'Check the delivery zone details.', fieldErrors: parsed.error.flatten().fieldErrors };
  const { id, name, feeMinor, active } = parsed.data;
  try {
    const result = id
      ? await supabase.from('delivery_zones').update({
          name, fee_minor: feeMinor, active,
        }).eq('id', id)
      : await supabase.from('delivery_zones').insert({
          name, fee_minor: feeMinor,
        });
    if (result.error) return failure(result.error, result.error.message);
    revalidatePath('/admin/delivery-zones');
    revalidatePath('/checkout');
    return { success: true, data: undefined };
  } catch (error) {
    return failure(error, 'Could not save this delivery zone.');
  }
}
