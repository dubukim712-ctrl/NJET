'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ProductPurchasePanel } from '@/components/shop/ProductPurchasePanel';
import { ProductDetailSkeleton } from '@/components/shop/ProductDetailSkeleton';
import { Button } from '@/components/ui/Button';
import { ProductImage } from '@/components/shop/ProductImage';
import dynamic from 'next/dynamic';
import type { CatalogData, CatalogProduct } from '@/data/commerce/catalog';
import {
  StorefrontCatalogQueryError,
  useStorefrontCatalogQuery,
} from '@/data/commerce/storefront-catalog-client';

import { useState } from 'react';

const ProductReviewsSection = dynamic(
  () => import('@/components/shop/ProductReviewsSection').then((module) => module.ProductReviewsSection),
  { loading: () => <div className="min-h-48 rounded-xl border bg-card" /> },
);

export function ProductDetailQuery({ slug, initialData }: { slug: string; initialData?: CatalogData }) {
  const query = useStorefrontCatalogQuery(slug, initialData);

  if (!query.data && query.isPending) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <BackLink />
        <ProductDetailSkeleton />
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
        <section className="rounded-xl border border-foreground/20 bg-card text-foreground p-5">
          <h1 className="font-semibold">Product not found</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            This product may no longer be available.
          </p>
        </section>
      </div>
    );
  }

  return (
    <ProductDetailContent
      key={product.id}
      product={product}
      branches={query.data.branches}
      isRefreshingError={query.isError}
    />
  );
}

function ProductDetailContent({
  product,
  branches,
  isRefreshingError,
}: {
  product: CatalogProduct;
  branches: { id: string; name: string }[];
  isRefreshingError: boolean;
}) {
  const [imagePath, setImagePath] = useState(product.image_path);
  const photos = [...new Set([product.image_path, ...product.variants.map((variant) => variant.image_path)]
    .filter((path): path is string => Boolean(path)))];
  const activePhoto = imagePath && photos.includes(imagePath) ? imagePath : photos[0];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {isRefreshingError && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
          Could not refresh product availability. Cached details are still shown.
        </p>
      )}
      <div className="grid items-start gap-6 lg:grid-cols-[1.05fr_1fr] lg:gap-10">
        <div className={photos.length > 1 ? 'flex min-w-0 flex-col-reverse gap-3 sm:flex-row' : 'min-w-0'}>
          {photos.length > 1 && (
            <div aria-label="Product photos" role="group" className="flex shrink-0 gap-2 overflow-x-auto p-1 sm:max-h-96 sm:flex-col sm:overflow-y-auto">
              {photos.map((photo, index) => (
                <Button
                  key={photo}
                  type="button"
                  size={null}
                  variant={null}
                  aria-label={`Show product photo ${index + 1}`}
                  aria-pressed={photo === activePhoto}
                  onClick={() => setImagePath(photo)}
                  className={`size-14 shrink-0 overflow-hidden rounded-lg border bg-card ${photo === activePhoto ? 'border-foreground' : 'border-border'}`}
                >
                  <ProductImage path={photo} alt="" sizes="56px" className="size-full" />
                </Button>
              ))}
            </div>
          )}
          <div className="min-w-0 flex-1 rounded-2xl border bg-card p-2 sm:p-3">
            <ProductImage path={activePhoto ?? null} alt={product.name} preload={imagePath === product.image_path} sizes="(max-width: 639px) 100vw, (max-width: 1023px) calc(100vw - 120px), (max-width: 1280px) 45vw, 520px" className="rounded-xl" />
          </div>
        </div>
        <ProductPurchasePanel product={product} branches={branches} onImagePathChange={setImagePath} />
      </div>
      <ProductReviewsSection productId={product.id} />
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
