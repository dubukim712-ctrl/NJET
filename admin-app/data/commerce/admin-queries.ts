import type { createClient } from '@/data/supabase/server';
import { productDiscountRowsSchema } from '@/lib/validations/product-discount';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function getInventoryUnits(supabase: SupabaseClient) {
  const units: import('@/types/database').Database['public']['Tables']['ebike_units']['Row'][] = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase.from('ebike_units')
      .select('id, variant_id, branch_id, serial_number, motor_number, status, order_item_id, transfer_id, created_at')
      .in('status', ['needs_identification', 'in_stock', 'in_transit', 'warranty_reserved'])
      .order('created_at')
      .order('id')
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    units.push(...data);
    if (data.length < pageSize) return units;
  }
}

export async function getCommerceManagementData(supabase: SupabaseClient) {
  try {
    const [
      productsResult,
      variantsResult,
      inventoryResult,
      branchesResult,
      transferBranchesResult,
      categoriesResult,
      subcategoriesResult,
      unitsResult,
      movementsResult,
      transfersResult,
      discountsResult,
    ] = await Promise.all([
      supabase.from('products').select('*').order('name').limit(200),
      supabase.rpc('admin_product_variants'),
      supabase.from('branch_inventory').select('*').limit(2000),
      supabase.from('branches').select('*').order('name').limit(100),
      supabase.rpc('transfer_branch_options'),
      supabase.from('product_categories').select('*').order('name').limit(300),
      supabase.from('product_subcategories').select('*').order('category_id').order('name').limit(300),
      getInventoryUnits(supabase),
      supabase.from('inventory_movements').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('branch_transfers').select('*').order('dispatched_at', { ascending: false }).limit(50),
      supabase.rpc('admin_product_discounts'),
    ]);
    if (productsResult.error) throw productsResult.error;
    if (variantsResult.error) throw variantsResult.error;
    if (inventoryResult.error) throw inventoryResult.error;
    if (branchesResult.error) throw branchesResult.error;
    if (transferBranchesResult.error) throw transferBranchesResult.error;
    if (categoriesResult.error) throw categoriesResult.error;
    if (subcategoriesResult.error) throw subcategoriesResult.error;
    if (movementsResult.error) throw movementsResult.error;
    if (transfersResult.error) throw transfersResult.error;
    if (discountsResult.error) throw discountsResult.error;
    const discounts = productDiscountRowsSchema.safeParse(discountsResult.data);
    if (!discounts.success) throw new Error('Product discount response failed validation.');

    const transferIds = transfersResult.data.map((transfer) => transfer.id);
    const transferItemsResult = transferIds.length
      ? await supabase.from('branch_transfer_items').select('*').in('transfer_id', transferIds).limit(1500)
      : { data: [], error: null };
    if (transferItemsResult.error) throw transferItemsResult.error;
    const transferItemIds = transferItemsResult.data.map((item) => item.id);
    const transferUnitLinksResult = transferItemIds.length
      ? await supabase.from('branch_transfer_units').select('*').in('transfer_item_id', transferItemIds).limit(2000)
      : { data: [], error: null };
    if (transferUnitLinksResult.error) throw transferUnitLinksResult.error;
    const transferredUnitIds = transferUnitLinksResult.data.map((unit) => unit.unit_id);
    const transferUnitsResult = transferredUnitIds.length
      ? await supabase.from('ebike_units').select('id, serial_number, motor_number').in('id', transferredUnitIds).limit(2000)
      : { data: [], error: null };
    if (transferUnitsResult.error) throw transferUnitsResult.error;
    const transferUnitById = new Map(transferUnitsResult.data.map((unit) => [unit.id, unit]));

    return {
      data: {
        products: productsResult.data,
        variants: variantsResult.data,
        inventory: inventoryResult.data,
        branches: branchesResult.data,
        transferBranches: transferBranchesResult.data,
        categories: categoriesResult.data,
        subcategories: subcategoriesResult.data,
        ebikeUnits: unitsResult,
        inventoryMovements: movementsResult.data,
        transfers: transfersResult.data,
        transferItems: transferItemsResult.data,
        transferUnits: transferUnitLinksResult.data.map((link) => ({
          transferItemId: link.transfer_item_id,
          ...(transferUnitById.get(link.unit_id) ?? { serial_number: null, motor_number: null }),
        })),
        productDiscounts: discounts.data,
      },
      error: null,
    };
  } catch (error) {
    console.error('Could not load commerce management data.', error);
    return { data: null, error: 'Catalog and stock data could not be loaded.' };
  }
}

export async function getDeliveryZoneManagementData(supabase: SupabaseClient) {
  try {
    const { data, error } = await supabase
      .from('delivery_zones')
      .select('*')
      .order('name')
      .limit(200);
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Could not load delivery zones.', error);
    return { data: null, error: 'Delivery zones could not be loaded.' };
  }
}

export async function getBranchManagementData(supabase: SupabaseClient) {
  try {
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .order('name')
      .limit(200);
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Could not load branches.', error);
    return { data: null, error: 'Branches could not be loaded.' };
  }
}

