import type { createClient } from '@/data/supabase/server';
import type { Database } from '@/types/database';
import {
  activeVariantDiscountRowsSchema,
  type DiscountQuoteRow,
} from '@/lib/validations/product-discount';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type WalkInBranchOption = {
  id: string;
  name: string;
};

export type WalkInCatalogItem =
  Database['public']['Functions']['walk_in_catalog']['Returns'][number] & {
    list_price_minor: number;
    discount_unit_minor: number;
    discount_name: string | null;
  };

export type WalkInCartLine = {
  variantId: string;
  quantity: number;
};

export function applyWalkInDiscountQuote(
  products: WalkInCatalogItem[],
  rows: DiscountQuoteRow[],
) {
  const quoteByVariant = new Map(rows.map((row) => [row.variant_id, row]));
  return products.map((product) => {
    const quote = quoteByVariant.get(product.variant_id);
    return quote ? {
      ...product,
      price_minor: quote.unit_price_minor,
      list_price_minor: quote.list_price_minor,
      discount_unit_minor: quote.discount_unit_minor,
      discount_name: quote.discount_name,
    } : product;
  });
}

export function getWalkInCartPricing(
  cart: WalkInCartLine[],
  products: WalkInCatalogItem[],
) {
  const cartQuantities = new Map(
    cart.map((line) => [line.variantId, line.quantity])
  );
  const productByVariant = new Map(
    products.map((product) => [product.variant_id, product])
  );
  const totalMinor = cart.reduce((total, line) => {
    const product = productByVariant.get(line.variantId);
    return total + (product ? product.price_minor * line.quantity : 0);
  }, 0);
  const discountTotal = cart.reduce((total, line) => {
    const product = productByVariant.get(line.variantId);
    return total + (product ? product.discount_unit_minor * line.quantity : 0);
  }, 0);
  const hasUnavailableItems = cart.some((line) => {
    const product = productByVariant.get(line.variantId);
    return !product || line.quantity > product.stock;
  });
  return {
    cartQuantities,
    totalMinor,
    discountTotal,
    hasUnavailableItems,
  };
}

export async function getWalkInBranchOptions(supabase: SupabaseClient) {
  try {
    const { data, error } = await supabase.rpc('walk_in_branch_options');
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Could not load walk-in sale branches.', error);
    return { data: null, error: 'Branches could not be loaded.' };
  }
}

export async function getWalkInCatalog(
  supabase: SupabaseClient,
  branchId: string
) {
  try {
    const { data, error } = await supabase.rpc('walk_in_catalog', {
      p_branch_id: branchId,
    });
    if (error) throw error;
    const discountResult = data.length
      ? await supabase.rpc('active_variant_discounts', {
          p_variant_ids: data.map((item) => item.variant_id),
          p_channel: 'walk_in',
        })
      : { data: [], error: null };
    if (discountResult.error) throw discountResult.error;
    const discounts = activeVariantDiscountRowsSchema.safeParse(discountResult.data);
    if (!discounts.success) throw new Error('Walk-in discount response failed validation.');
    const byVariant = new Map(discounts.data.map((discount) => [
      discount.variant_id,
      discount,
    ]));
    return {
      data: data.map((item) => {
        const discount = byVariant.get(item.variant_id);
        return {
          ...item,
          price_minor: discount?.unit_price_minor ?? item.price_minor,
          list_price_minor: discount?.list_price_minor ?? item.price_minor,
          discount_unit_minor: discount?.discount_unit_minor ?? 0,
          discount_name: discount?.discount_name ?? null,
        };
      }),
      error: null,
    };
  } catch (error) {
    console.error('Could not load the walk-in product catalog.', error);
    return { data: null, error: 'The product catalog could not be loaded.' };
  }
}
