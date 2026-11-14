import type { createClient } from '@/data/supabase/server';
import type { DashboardBranchOption } from './branch-context';
import type { DashboardSection, InventoryOverview } from './types';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export async function loadDashboardInventory(
  supabase: SupabaseClient,
  branchId: string | null,
  branches: DashboardBranchOption[]
): Promise<DashboardSection<InventoryOverview>> {
  try {
    let outOfStockQuery = supabase
      .from('branch_inventory')
      .select('variant_id', { count: 'exact', head: true })
      .eq('stock', 0);
    let stockQuery = supabase
      .from('branch_inventory')
      .select('branch_id, variant_id, stock')
      .order('stock', { ascending: true })
      .limit(5);
    if (branchId) {
      outOfStockQuery = outOfStockQuery.eq('branch_id', branchId);
      stockQuery = stockQuery.eq('branch_id', branchId);
    }
    const [outOfStockResult, stockResult] = await Promise.all([outOfStockQuery, stockQuery]);
    if (outOfStockResult.error) throw outOfStockResult.error;
    if (stockResult.error) throw stockResult.error;

    const variantIds = [...new Set(stockResult.data.map((item) => item.variant_id))];
    if (!variantIds.length) {
      return {
        data: { outOfStockCount: outOfStockResult.count ?? 0, lowestStock: [] },
        error: null,
      };
    }

    const { data: variants, error: variantsError } = await supabase
      .from('product_variants')
      .select('id, name, sku, product_id')
      .in('id', variantIds)
      .limit(5);
    if (variantsError) throw variantsError;

    const productIds = [...new Set(variants.map((variant) => variant.product_id))];
    const { data: products, error: productsError } = productIds.length
      ? await supabase.from('products').select('id, name').in('id', productIds).limit(5)
      : { data: [], error: null };
    if (productsError) throw productsError;

    const variantById = new Map(variants.map((variant) => [variant.id, variant]));
    const productNameById = new Map(products.map((product) => [product.id, product.name]));
    const branchNameById = new Map(branches.map((branch) => [branch.id, branch.name]));
    return {
      data: {
        outOfStockCount: outOfStockResult.count ?? 0,
        lowestStock: stockResult.data.flatMap((item) => {
          const variant = variantById.get(item.variant_id);
          if (!variant) return [];
          const productName = productNameById.get(variant.product_id);
          return [{
            id: `${item.branch_id}:${item.variant_id}`,
            name: productName ? `${productName} · ${variant.name}` : variant.name,
            sku: variant.sku,
            stock: item.stock,
            branchName: branchNameById.get(item.branch_id) ?? null,
          }];
        }),
      },
      error: null,
    };
  } catch (error) {
    console.error('Could not load dashboard inventory.', error);
    return { data: null, error: 'Inventory overview could not be loaded.' };
  }
}
