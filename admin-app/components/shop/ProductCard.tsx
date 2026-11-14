import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { CatalogProduct } from '@/data/commerce/catalog';
import { formatPhp } from '@/lib/commerce';
import { ProductImage } from '@/components/shop/ProductImage';

export function ProductCard({
  product,
  compactOnNarrow = false,
  stackFooterOnNarrow = false,
  loading,
}: {
  product: CatalogProduct;
  compactOnNarrow?: boolean;
  stackFooterOnNarrow?: boolean;
  loading?: 'eager' | 'lazy';
}) {
  const startingPrice = product.variants.length
    ? Math.min(...product.variants.map((variant) => variant.price_minor))
    : null;

  return (
    <Link
      href={`/shop/view-product/${product.slug}`}
      aria-label={`View product: ${product.name}`}
      className={`group block overflow-hidden rounded-xl border bg-card transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        compactOnNarrow ? 'min-[320px]:max-[768px]:rounded-lg' : ''
      }`}
    >
      <article>
        <ProductImage
          path={product.image_path}
          alt={product.name}
          loading={loading}
        />
        <div
          className={`space-y-3 p-4 sm:p-5 ${
            compactOnNarrow
              ? 'min-[320px]:max-[768px]:space-y-2 min-[320px]:max-[768px]:p-2.5'
              : ''
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span
              className={`rounded-full bg-secondary px-2.5 py-1 text-xs font-medium capitalize text-secondary-foreground ${
                compactOnNarrow
                  ? 'min-[320px]:max-[768px]:px-2 min-[320px]:max-[768px]:text-[10px]'
                  : ''
              }`}
            >
              {product.categoryName ?? 'Uncategorized'}
              {product.subcategoryName && ` · ${product.subcategoryName}`}
            </span>
            {product.is_demo && (
              <span className="text-xs font-medium text-muted-foreground">Sample listing</span>
            )}
          </div>
          <div>
            <h2
              className={`font-semibold ${
                compactOnNarrow
                  ? 'min-[320px]:max-[768px]:text-sm min-[320px]:max-[768px]:leading-5'
                  : ''
              }`}
            >
              {product.name}
            </h2>
            <p
              className={`mt-1 line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground ${
                compactOnNarrow
                  ? 'min-[320px]:max-[768px]:min-h-8 min-[320px]:max-[768px]:text-xs min-[320px]:max-[768px]:leading-4'
                  : ''
              }`}
            >
              {product.description || 'Ask our team for product details.'}
            </p>
          </div>
          <div
            className={`flex items-center justify-between gap-3 ${
              compactOnNarrow && stackFooterOnNarrow
                ? 'min-[320px]:max-[768px]:flex-col min-[320px]:max-[768px]:items-start min-[320px]:max-[768px]:gap-1'
                : compactOnNarrow
                  ? 'min-[320px]:max-[768px]:gap-1'
                : ''
            }`}
          >
            <div
              className={`relative flex min-h-10 items-center text-sm font-semibold ${
                compactOnNarrow
                  ? 'min-[320px]:max-[768px]:min-h-8 min-[320px]:max-[768px]:text-xs'
                  : ''
              }`}
            >
              {startingPrice === null ? (
                'Price unavailable'
              ) : (
                <>
                  <span className="absolute -top-2 left-0 text-[10px] font-medium leading-3 text-muted-foreground sm:text-xs sm:leading-4">
                    From
                  </span>
                  <span>{formatPhp(startingPrice)}</span>
                </>
              )}
            </div>
            <span
              className={`inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-primary group-hover:bg-primary/10 ${
                compactOnNarrow
                  ? 'min-[320px]:max-[768px]:min-h-8 min-[320px]:max-[768px]:gap-1 min-[320px]:max-[768px]:px-1 min-[320px]:max-[768px]:text-xs min-[320px]:max-[768px]:whitespace-nowrap'
                  : ''
              }`}
            >
              View product <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
