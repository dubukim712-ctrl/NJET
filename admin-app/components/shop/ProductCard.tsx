import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { CatalogProduct } from '@/data/commerce/catalog';
import { formatPhp } from '@/lib/commerce';
import { ProductImage } from '@/components/shop/ProductImage';

export function ProductCard({ product }: { product: CatalogProduct }) {
  const startingPrice = product.variants.length
    ? Math.min(...product.variants.map((variant) => variant.price_minor))
    : null;

  return (
    <article className="overflow-hidden rounded-xl border bg-card">
      <ProductImage path={product.image_path} alt={product.name} />
      <div className="space-y-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium capitalize text-secondary-foreground">
            {product.categoryName ?? 'Uncategorized'}
            {product.subcategoryName && ` · ${product.subcategoryName}`}
          </span>
          {product.is_demo && (
            <span className="text-xs font-medium text-muted-foreground">Sample listing</span>
          )}
        </div>
        <div>
          <h2 className="font-semibold">{product.name}</h2>
          <p className="mt-1 line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground">
            {product.description || 'Ask our team for product details.'}
          </p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold">
            {startingPrice === null ? 'Price unavailable' : `From ${formatPhp(startingPrice)}`}
          </p>
          <Link
            href={`/shop/view-product/${product.slug}`}
            className="inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-primary hover:bg-primary/10"
          >
            View product <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}
