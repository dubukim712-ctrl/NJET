import { getShopCatalogPage } from "@/data/commerce/catalog";
import { getPublicStorefrontInfo } from '@/data/commerce/storefront-home';
import { Suspense } from 'react';
import { ShopCatalogSkeleton } from '@/components/shop/ShopCatalogSkeleton';
import { ShopProductBrowser } from '@/components/shop/ShopProductBrowser';

export const revalidate = 300;
export const metadata = { title: 'Shop' };

export default async function ShopPage() {
  const [{ branches }, initialData] = await Promise.all([
    getPublicStorefrontInfo(),
    getShopCatalogPage({ search: '', category: null, subcategory: null, branch: null, inStock: false, sort: 'featured', page: 1 }, true),
  ]);
  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header className="rounded-2xl bg-[#264653] px-5 py-12 text-[#f4ede4] sm:px-10 md:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white">Noel &amp; Jane E-bike Trading</p>
        <h1 className="mt-2 text-3xl text-white font-semibold tracking-tight sm:text-5xl">Shop the NJET collection</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 opacity-90 sm:text-base">
          Browse e-bikes, spare parts, and accessories. Choose a branch to check local availability.
        </p>
      </header>
      <Suspense fallback={<ShopCatalogSkeleton showHero={false} />}>
        <ShopProductBrowser initialData={initialData ?? undefined} branches={(branches.data ?? []).map(({ id, name }) => ({ id, name }))} />
      </Suspense>
    </div>
  );
}
