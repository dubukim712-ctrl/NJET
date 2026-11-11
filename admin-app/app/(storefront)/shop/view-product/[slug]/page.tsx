import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ProductPurchasePanel } from '@/components/shop/ProductPurchasePanel';
import { getStoreCatalog } from '@/data/commerce/catalog';

export default async function ViewProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getStoreCatalog(slug);
  if (result.data && !result.data.products.length) notFound();

  const catalog = result.data;
  const product = catalog?.products[0];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link href="/shop" className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to shop
      </Link>
      {result.error || !catalog || !product ? (
        <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-5" role="alert">
          <h1 className="font-semibold">Product details are unavailable</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {result.error ?? 'Try reloading this page.'}
          </p>
        </section>
      ) : (
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
              branches={catalog.branches}
            />
            <p className="text-xs leading-5 text-muted-foreground">
              Availability can change until staff confirms your order. Stock is not reserved when an order is submitted.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
