'use client';

import { useAuth } from '@/components/auth/AuthProvider';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/data/supabase/client';
import { cartVariantsQueryKey } from '@/data/commerce/catalog-query-keys';
import {
  StorefrontAvailabilityRowsSchema,
  StorefrontCatalogRowsSchema,
} from '@/lib/validations/storefront-catalog';
import { activeVariantDiscountRowsSchema } from '@/lib/validations/product-discount';
import type { ProductType } from '@/types/commerce-tables';

export type CartVariant = {
  id: string;
  name: string;
  price_minor: number;
  list_price_minor: number;
  discount_unit_minor: number;
  discount_name: string | null;
  reservation_minor: number;
  home_credit_downpayment_minor: number;
  sku: string;
  productName: string;
  imagePath: string | null;
  productImagePath: string | null;
  productType: ProductType;
  stockByBranch: {
    branchId: string;
    stock: number | null;
    available: boolean;
  }[];
};

export async function getCartVariants(
  variantIds: string[]
): Promise<{ data: CartVariant[]; error: string | null }> {
  if (!variantIds.length) return { data: [], error: null };

  try {
    const supabase = createClient();
    const catalogResult = await supabase.rpc('storefront_catalog', {
      p_slug: null,
      p_variant_ids: variantIds,
    });
    if (catalogResult.error) throw catalogResult.error;

    const parsedRows = StorefrontCatalogRowsSchema.safeParse(catalogResult.data);
    if (!parsedRows.success) {
      throw new Error('Cart item response failed validation.');
    }

    const returnedVariantIds = parsedRows.data.flatMap((row) =>
      row.variant_id ? [row.variant_id] : []
    );
    if (!returnedVariantIds.length) return { data: [], error: null };

    const [availabilityResult, discountResult] = await Promise.all([
      supabase.rpc('storefront_variant_availability', {
        p_variant_ids: returnedVariantIds,
      }),
      supabase.rpc('active_variant_discounts', {
        p_variant_ids: returnedVariantIds,
        p_channel: 'storefront',
      }),
    ]);
    if (availabilityResult.error) throw availabilityResult.error;
    if (discountResult.error) throw discountResult.error;

    const parsedAvailability = StorefrontAvailabilityRowsSchema.safeParse(
      availabilityResult.data
    );
    const parsedDiscounts = activeVariantDiscountRowsSchema.safeParse(
      discountResult.data
    );
    if (!parsedAvailability.success || !parsedDiscounts.success) {
      throw new Error('Cart availability response failed validation.');
    }
    const discountsByVariant = new Map(
      parsedDiscounts.data.map((discount) => [discount.variant_id, discount])
    );

    const stockByVariant = new Map<
      string,
      { branchId: string; stock: number | null; available: boolean }[]
    >();
    for (const stock of parsedAvailability.data) {
      const entries = stockByVariant.get(stock.variant_id) ?? [];
      entries.push({
        branchId: stock.branch_id,
        stock: stock.stock,
        available: stock.available,
      });
      stockByVariant.set(stock.variant_id, entries);
    }

    return {
      data: parsedRows.data.flatMap((row) => {
        if (
          !row.variant_id ||
          row.variant_name === null ||
          row.sku === null ||
          row.price_minor === null ||
          row.reservation_minor === null ||
          row.home_credit_downpayment_minor === null
        ) return [];

        const discount = discountsByVariant.get(row.variant_id);
        return [{
          id: row.variant_id,
          name: row.variant_name,
          price_minor: discount?.unit_price_minor ?? row.price_minor,
          list_price_minor: discount?.list_price_minor ?? row.price_minor,
          discount_unit_minor: discount?.discount_unit_minor ?? 0,
          discount_name: discount?.discount_name ?? null,
          reservation_minor: row.reservation_minor,
          home_credit_downpayment_minor: row.home_credit_downpayment_minor,
          sku: row.sku,
          productName: row.product_name,
          imagePath: row.variant_image_path,
          productImagePath: row.product_image_path,
          productType: row.product_type,
          stockByBranch: stockByVariant.get(row.variant_id) ?? [],
        }];
      }),
      error: null,
    };
  } catch (error) {
    console.error('Could not load cart item details.', error);
    return {
      data: [],
      error: 'Cart item details could not be loaded. Try refreshing the page.',
    };
  }
}

export function useCartVariantsQuery(variantIds: string[]) {
  const { user } = useAuth();
  const ids = [...new Set(variantIds)].sort();

  return useQuery({
    queryKey: [...cartVariantsQueryKey, ids, user?.id ?? null],
    queryFn: async () => {
      const result = await getCartVariants(ids);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    enabled: ids.length > 0,
    staleTime: 15_000,
    gcTime: 15 * 60_000,
  });
}
