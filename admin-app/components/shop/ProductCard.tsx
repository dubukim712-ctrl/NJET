import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { CatalogProduct } from '@/data/commerce/catalog';
import { ProductImage } from '@/components/shop/ProductImage';
import { ProductPrice } from '@/components/shop/ProductPrice';

export function ProductCard({
  product,
  compactOnNarrow = false,
  loading,
}: {
  product: CatalogProduct;
  compactOnNarrow?: boolean;
  loading?: 'eager' | 'lazy';
}) {
  const startingVariant = product.variants.reduce<(typeof product.variants)[number] | null>(
    (lowest, variant) => !lowest || variant.price_minor < lowest.price_minor ? variant : lowest,
    null
  );

  return (
    <Link
      href={`/shop/view-product/${product.slug}`}
      aria-label={`View product: ${product.name}`}
      title="Open product details"
      className={`group block overflow-hidden rounded-xl border bg-card transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        compactOnNarrow ? 'min-[320px]:max-[768px]:rounded-lg' : ''
      }`}
    >
      <article>
        <div className="relative">
          <ProductImage
            path={product.image_path}
            alt={product.name}
            loading={loading}
          />
          <span
            aria-hidden="true"
            className={`absolute right-3 top-3 inline-flex size-10 items-center justify-center rounded-full bg-card/95 text-primary shadow-sm ring-1 ring-border transition-colors group-hover:bg-primary group-hover:text-primary-foreground group-focus-visible:bg-primary group-focus-visible:text-primary-foreground ${
              compactOnNarrow
                ? 'min-[320px]:max-[768px]:right-2 min-[320px]:max-[768px]:top-2 min-[320px]:max-[768px]:size-8'
                : ''
            }`}
          >
            <ArrowUpRight className="size-5" />
          </span>
        </div>
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
            className={`flex min-h-10 min-w-0 items-center text-sm font-semibold ${
              compactOnNarrow
                ? 'min-[320px]:max-[768px]:min-h-8 min-[320px]:max-[768px]:text-xs'
                : ''
            }`}
          >
            {startingVariant === null ? (
              'Price unavailable'
            ) : (
              <div className="flex flex-col items-start">
                <span className="text-[10px] font-medium leading-3 text-muted-foreground sm:text-xs sm:leading-4">
                  From
                </span>
                <ProductPrice
                  priceMinor={startingVariant.price_minor}
                  listPriceMinor={startingVariant.list_price_minor}
                  className="text-sm"
                />
              </div>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}
