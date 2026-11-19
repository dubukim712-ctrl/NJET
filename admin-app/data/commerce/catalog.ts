import { unstable_rethrow } from 'next/navigation';
import { createClient } from '@/data/supabase/server';
import {
  StorefrontAvailabilityRowsSchema,
  StorefrontBranchOptionsSchema,
  StorefrontCatalogRowsSchema,
} from '@/lib/validations/storefront-catalog';
import { activeVariantDiscountRowsSchema } from '@/lib/validations/product-discount';
import type { Database } from '@/types/database';

type Product = Database['public']['Tables']['products']['Row'];
type Variant = Database['public']['Tables']['product_variants']['Row'];

export type CatalogVariant = Pick<
  Variant,
  | 'id'
  | 'product_id'
  | 'sku'
  | 'name'
  | 'specifications'
  | 'price_minor'
  | 'reservation_minor'
  | 'home_credit_downpayment_minor'
  | 'image_path'
> & {
  list_price_minor: number;
  discount_unit_minor: number;
  discount_name: string | null;
  stockByBranch: {
    branchId: string;
    stock: number | null;
    available: boolean;
  }[];
};

export type CatalogProduct = Pick<
  Product,
  | 'id'
  | 'slug'
  | 'name'
  | 'description'
  | 'product_type'
  | 'category_id'
  | 'subcategory_id'
  | 'image_path'
  | 'is_demo'
> & {
  categoryName: string | null;
  subcategoryName: string | null;
  variants: CatalogVariant[];
};

export type CatalogData = {
  products: CatalogProduct[];
  branches: { id: string; name: string }[];
};

type CatalogResult =
  | { data: CatalogData; error: null }
  | { data: null; error: string };

function catalogErrorDetails(error: unknown) {
  if (!(error instanceof Error)) return { message: String(error) };

  return {
    name: error.name,
    message: error.message,
    code: 'code' in error ? error.code : undefined,
    details: 'details' in error ? error.details : undefined,
    hint: 'hint' in error ? error.hint : undefined,
  };
}

export async function getStoreCatalog(slug?: string): Promise<CatalogResult> {
  try {
    const supabase = await createClient();
    const [catalogResult, branchResult] = await Promise.all([
      supabase.rpc('storefront_catalog', {
        p_slug: slug ?? null,
        p_variant_ids: null,
      }),
      supabase.rpc('storefront_branch_options'),
    ]);
    if (catalogResult.error) throw catalogResult.error;
    if (branchResult.error) throw branchResult.error;

    const parsedRows = StorefrontCatalogRowsSchema.safeParse(catalogResult.data);
    const parsedBranches = StorefrontBranchOptionsSchema.safeParse(branchResult.data);
    if (!parsedRows.success || !parsedBranches.success) {
      throw new Error('Storefront catalog response failed validation.');
    }

    const rows = parsedRows.data;
    const variantIds = rows.flatMap((row) => row.variant_id ? [row.variant_id] : []);
    const [availabilityRows, discountRows] = await Promise.all([
      slug && variantIds.length
        ? supabase.rpc('storefront_variant_availability', { p_variant_ids: variantIds })
        : null,
      variantIds.length
        ? supabase.rpc('active_variant_discounts', {
            p_variant_ids: variantIds,
            p_channel: 'storefront',
          })
        : null,
    ]);
    if (availabilityRows?.error) throw availabilityRows.error;
    if (discountRows?.error) throw discountRows.error;

    const parsedAvailability = StorefrontAvailabilityRowsSchema.safeParse(
      availabilityRows?.data ?? []
    );
    const parsedDiscounts = activeVariantDiscountRowsSchema.safeParse(
      discountRows?.data ?? []
    );
    if (!parsedAvailability.success || !parsedDiscounts.success) {
      throw new Error('Storefront availability response failed validation.');
    }
    const discountsByVariant = new Map(
      parsedDiscounts.data.map((discount) => [discount.variant_id, discount])
    );

    const stockByVariant = new Map<
      string,
      CatalogVariant['stockByBranch']
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

    const productsById = new Map<string, CatalogProduct>();
    for (const row of rows) {
      let product = productsById.get(row.product_id);
      if (!product) {
        product = {
          id: row.product_id,
          slug: row.product_slug,
          name: row.product_name,
          description: row.product_description,
          product_type: row.product_type,
          category_id: row.category_id,
          subcategory_id: row.subcategory_id,
          image_path: row.product_image_path,
          is_demo: row.is_demo,
          categoryName: row.category_name,
          subcategoryName: row.subcategory_name,
          variants: [],
        };
        productsById.set(product.id, product);
      }

      if (
        row.variant_id &&
        row.variant_name !== null &&
        row.sku !== null &&
        row.price_minor !== null &&
        row.reservation_minor !== null &&
        row.home_credit_downpayment_minor !== null
      ) {
        const discount = discountsByVariant.get(row.variant_id);
        product.variants.push({
          id: row.variant_id,
          product_id: row.product_id,
          name: row.variant_name,
          sku: row.sku,
          price_minor: discount?.unit_price_minor ?? row.price_minor,
          list_price_minor: discount?.list_price_minor ?? row.price_minor,
          discount_unit_minor: discount?.discount_unit_minor ?? 0,
          discount_name: discount?.discount_name ?? null,
          reservation_minor: row.reservation_minor,
          home_credit_downpayment_minor: row.home_credit_downpayment_minor,
          image_path: row.variant_image_path,
          specifications: row.specifications,
          stockByBranch: stockByVariant.get(row.variant_id) ?? [],
        });
      }
    }

    return {
      data: {
        branches: parsedBranches.data,
        products: [...productsById.values()],
      },
      error: null,
    };
  } catch (error) {
    unstable_rethrow(error);
    console.error('Could not load the storefront catalog.', catalogErrorDetails(error));
    return {
      data: null,
      error: 'The catalog could not be loaded. Please try again later.',
    };
  }
}
