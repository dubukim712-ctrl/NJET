'use client';

import { ShopProductBrowser } from '@/components/shop/ShopProductBrowser';
import { StorefrontCatalogLoading } from '@/components/shop/StorefrontCatalogLoading';
import { Button } from '@/components/ui/Button';
import {
  StorefrontCatalogQueryError,
  useStorefrontCatalogQuery,
} from '@/data/commerce/storefront-catalog-client';

export function ShopCatalogQuery() {
  const query = useStorefrontCatalogQuery();

  if (!query.data && query.isPending) {
    return <StorefrontCatalogLoading label="products" />;
  }

  if (!query.data) {
    return (
      <section className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-5" role="alert">
        <div>
          <h2 className="font-semibold">We could not load the catalog</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {query.error instanceof StorefrontCatalogQueryError
              ? query.error.message
              : 'Please try again later.'}
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => { void query.refetch(); }}>
          Try again
        </Button>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      {query.isError && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
          Could not refresh the catalog. Cached products are still shown.
        </p>
      )}
      {query.data.products.length === 0 ? (
        <section className="rounded-xl border bg-card px-5 py-12 text-center">
          <h2 className="text-lg font-semibold">No products are available yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">Please check back soon.</p>
        </section>
      ) : (
        <ShopProductBrowser products={query.data.products} />
      )}
    </div>
  );
}
