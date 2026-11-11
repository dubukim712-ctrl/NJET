import { ShopProductBrowser } from '@/components/shop/ShopProductBrowser';
import { getStoreCatalog } from '@/data/commerce/catalog';

export const metadata = { title: 'Shop | NJET' };

export default async function ShopPage() {
  const result = await getStoreCatalog();
  const catalog = result.data;

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header className="rounded-2xl bg-primary px-5 py-8 text-primary-foreground sm:px-10 sm:py-12">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-80">Noel &amp; Jane E-bike Trading</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-5xl">Shop the NJET collection</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 opacity-90 sm:text-base">
          Browse e-bikes, spare parts, and accessories. Choose a branch to check local availability.
        </p>
      </header>

      {result.error || !catalog ? (
        <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-5" role="alert">
          <h2 className="font-semibold">We could not load the catalog</h2>
          <p className="mt-1 text-sm text-muted-foreground">{result.error ?? 'Please try again later.'}</p>
          <a href="/shop" className="mt-4 inline-flex min-h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
            Try again
          </a>
        </section>
      ) : catalog.products.length === 0 ? (
        <section className="rounded-xl border bg-card px-5 py-12 text-center">
          <h2 className="text-lg font-semibold">No products are available yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">Please check back soon.</p>
        </section>
      ) : (
        <ShopProductBrowser products={catalog.products} />
      )}
    </div>
  );
}
