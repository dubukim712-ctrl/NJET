import { ShopCatalogQuery } from '@/components/shop/ShopCatalogQuery';

export const metadata = { title: 'Shop | NJET' };

export default function ShopPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header className="rounded-2xl bg-primary px-5 py-8 text-primary-foreground sm:px-10 sm:py-12">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-80">Noel &amp; Jane E-bike Trading</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-5xl">Shop the NJET collection</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 opacity-90 sm:text-base">
          Browse e-bikes, spare parts, and accessories. Choose a branch to check local availability.
        </p>
      </header>
      <ShopCatalogQuery />
    </div>
  );
}
