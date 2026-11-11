import Link from 'next/link';
import { ArrowRight, Bike, MapPin, ShieldCheck } from 'lucide-react';
import { ProductCard } from '@/components/shop/ProductCard';
import { ProductImage } from '@/components/shop/ProductImage';
import type { CatalogData } from '@/data/commerce/catalog';

export function StorefrontHomePage({
  catalog,
  error,
}: {
  catalog: CatalogData | null;
  error: string | null;
}) {
  const featured = catalog?.products.slice(0, 3) ?? [];
  const heroProduct = featured[0];

  return (
    <div className="space-y-12 sm:space-y-16">
      <section className="overflow-hidden rounded-[1.75rem] bg-[#173b32] text-white">
        <div className="grid gap-8 p-5 sm:p-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-12 lg:p-12">
          <div className="space-y-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#f2d394]">
              Noel &amp; Jane E-bike Trading
            </p>
            <h1 className="max-w-xl text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
              Take the long way home.
            </h1>
            <p className="max-w-lg text-sm leading-6 text-white/85 sm:text-base">
              Find your next ride, then pick up the parts and accessories to make it yours.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/shop"
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#f2d394] px-5 text-sm font-semibold text-[#173b32] transition-colors hover:bg-[#f8e4b7]"
              >
                Explore the shop <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="#business-contact"
                className="inline-flex min-h-11 items-center rounded-full border border-white/40 px-5 text-sm font-medium text-white hover:bg-white/10"
              >
                Talk to our team
              </Link>
            </div>
            <p className="text-xs leading-5 text-white/75">
              Browse and add to your cart as a guest. Sign in when you are ready to check out.
            </p>
          </div>

          <div className="relative min-h-64 overflow-hidden rounded-2xl bg-[#f6f1e7] sm:min-h-80">
            {heroProduct?.image_path ? (
              <ProductImage
                path={heroProduct.image_path}
                alt={heroProduct.name}
                loading="eager"
                className="h-full min-h-64 rounded-2xl sm:min-h-80"
              />
            ) : (
              <div className="flex min-h-64 items-center justify-center text-[#173b32] sm:min-h-80">
                <Bike className="h-24 w-24" strokeWidth={1.2} aria-hidden="true" />
              </div>
            )}
            {heroProduct && (
              <div className="absolute inset-x-3 bottom-3 rounded-xl bg-white/95 p-3 text-[#173b32] shadow-lg sm:inset-x-5 sm:bottom-5 sm:p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#526c63]">
                  Start exploring
                </p>
                <p className="mt-1 truncate font-semibold">{heroProduct.name}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 border-y py-6 sm:grid-cols-3 sm:gap-6 sm:py-8">
        {[
          { icon: Bike, title: 'Find your ride', text: 'Compare e-bikes and everyday essentials.' },
          { icon: MapPin, title: 'Choose a branch', text: 'Check product availability before you order.' },
          { icon: ShieldCheck, title: 'Shop with confidence', text: 'Your order is checked by our team.' },
        ].map((item) => (
          <div key={item.title} className="flex gap-3">
            <item.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <div>
              <h2 className="text-sm font-semibold">{item.title}</h2>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">{item.text}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-5" aria-labelledby="featured-products">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">The collection</p>
            <h2 id="featured-products" className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              Made for the miles ahead
            </h2>
          </div>
          <Link href="/shop" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-primary hover:underline">
            View all products <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        {error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5" role="alert">
            <h3 className="font-semibold">The collection is temporarily unavailable</h3>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            <Link href="/shop" className="mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-primary underline">
              Open the shop
            </Link>
          </div>
        ) : featured.length ? (
          <div
            className="flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-4"
            role="region"
            aria-labelledby="featured-products"
            tabIndex={0}
          >
            {featured.map((product) => (
              <div key={product.id} className="w-[84vw] max-w-md shrink-0 snap-start">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border bg-card px-5 py-10 text-center">
            <h3 className="font-semibold">The collection is being prepared</h3>
            <p className="mt-1 text-sm text-muted-foreground">Check back soon or contact our team.</p>
          </div>
        )}
      </section>
    </div>
  );
}
