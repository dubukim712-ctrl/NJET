import { shopCatalogPageSchema, shopPageSize, type ShopCatalogFilters } from '@/lib/validations/storefront-catalog-page';
import { unstable_rethrow } from 'next/navigation';
import { createClient } from '@/data/supabase/server';
import { StorefrontBranchOptionsSchema } from '@/lib/validations/storefront-catalog';
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
  stockSummary: { available: boolean; stock: number | null };
  ratingSummary: {
    averageRating: number;
    reviewCount: number;
  };
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

export type ShopCatalogPage = {
  products: CatalogProduct[];
  total: number;
  facets: { category_id: string; category_name: string; subcategory_id: string; subcategory_name: string }[];
};

async function readCatalogPage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  filters: ShopCatalogFilters,
  pageSize: number,
  slug?: string,
  productType?: CatalogProduct['product_type'],
): Promise<ShopCatalogPage> {
  const result = await supabase.rpc('storefront_catalog_page', {
    p_search: filters.search, p_category: filters.category, p_subcategory: filters.subcategory,
    p_in_stock: filters.inStock, p_sort: filters.sort, p_page: filters.page, p_page_size: pageSize,
    ...(filters.branch ? { p_branch_id: filters.branch } : {}),
    ...(slug === undefined ? {} : { p_slug: slug }),
    ...(productType === undefined ? {} : { p_product_type: productType }),
  });
  if (result.error) throw result.error;
  return shopCatalogPageSchema.parse(result.data);
}

export async function getShopCatalogPage(filters: ShopCatalogFilters): Promise<ShopCatalogPage | null> {
  try {
    return await readCatalogPage(await createClient(), filters, shopPageSize);
  } catch (error) {
    unstable_rethrow(error);
    console.error('Could not load the storefront catalog page.', catalogErrorDetails(error));
    return null;
  }
}

export async function getFeaturedStorefrontBikes(): Promise<CatalogProduct[] | null> {
  try {
    const page = await readCatalogPage(await createClient(), {
      search: '', category: null, subcategory: null, inStock: false, sort: 'featured', page: 1,
    }, 4, undefined, 'ebike');
    return page.products;
  } catch (error) {
    unstable_rethrow(error);
    console.error('Could not load featured e-bikes.', catalogErrorDetails(error));
    return null;
  }
}

export async function getStoreCatalog(slug?: string): Promise<CatalogResult> {
  try {
    const supabase = await createClient();
    const [page, branches] = await Promise.all([
      readCatalogPage(supabase, { search: '', category: null, subcategory: null, inStock: false, sort: 'featured', page: 1 }, slug ? 1 : 3, slug),
      supabase.rpc('storefront_branch_options'),
    ]);
    if (branches.error) throw branches.error;
    return { data: { products: page.products, branches: StorefrontBranchOptionsSchema.parse(branches.data) }, error: null };
  } catch (error) {
    unstable_rethrow(error);
    console.error('Could not load the storefront catalog.', catalogErrorDetails(error));
    return { data: null, error: 'The catalog could not be loaded. Please try again later.' };
  }
}
