'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ProductPurchasePanel } from '@/components/shop/ProductPurchasePanel';
import { StorefrontCatalogLoading } from '@/components/shop/StorefrontCatalogLoading';
import { Button } from '@/components/ui/Button';
import {
  StorefrontCatalogQueryError,
  useStorefrontCatalogQuery,
} from '@/data/commerce/storefront-catalog-client';

export function ProductDetailQuery({ slug }: { slug: string }) {
  const query = useStorefrontCatalogQuery(slug);

  if (!query.data && query.isPending) {
    return (
      <div className="space-y-6">
        <BackLink />
        <StorefrontCatalogLoading label="product details" />
      </div>
    );
  }

  if (!query.data) {
    return (
      <div className="space-y-4">
        <BackLink />
        <section className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-5" role="alert">
          <div>
            <h1 className="font-semibold">Product details are unavailable</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {query.error instanceof StorefrontCatalogQueryError
                ? query.error.message
                : 'Try reloading this page.'}
            </p>
          </div>
          <Button type="button" variant="outline" onClick={() => { void query.refetch(); }}>
            Try again
          </Button>
        </section>
      </div>
    );
  }

  const product = query.data.products[0];
  if (!product) {
    return (
      <div className="space-y-6">
        <BackLink />
        <section className="rounded-xl border bg-card p-5">
          <h1 className="font-semibold">Product not found</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            This product may no longer be available.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <BackLink />
      {query.isError && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
          Could not refresh product availability. Cached details are still shown.
        </p>
      )}
      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
              {product.categoryName ?? 'Uncategorized'}
              {product.subcategoryName && ` · ${product.subcategoryName}`}
              {product.is_demo && ' · sample listing'}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{product.name}</h1>
            <p className="mt-4 whitespace-pre-line text-sm leading-6 text-muted-foreground">
              {product.description || 'Contact our team for additional product information.'}
            </p>
          </div>
        </div>
        <div className="lg:sticky lg:top-6 lg:self-start">
          <ProductPurchasePanel
            product={product}
            branches={query.data.branches}
          />
          <p className="text-xs leading-5 text-muted-foreground">
            Availability can change until staff confirms your order. Stock is not reserved when an order is submitted.
          </p>
        </div>
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/shop"
      className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to shop
    </Link>
  );
}
