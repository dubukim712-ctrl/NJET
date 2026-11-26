import Image from 'next/image';
import caviteRiders from './njet-cavite-riders.webp';
import Link from 'next/link';
import { ArrowDown, ArrowRight, Bike, BriefcaseBusiness, Gauge, Users, MapPin, IdCard, ShieldCheck } from 'lucide-react';
import { getAuthContext } from '@/data/auth/guards';
import { getFeaturedStorefrontBikes } from '@/data/commerce/catalog';
import { getPublicStorefrontInfo, getStorefrontHomeReviews } from '@/data/commerce/storefront-home';
import { getStartingVariant } from '@/data/commerce/storefront-starting-variant';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { ProductCard } from '@/components/shop/ProductCard';
import { HomeCreditEstimator } from '@/components/shop/HomeCreditEstimator';
import { StorefrontAboutSection } from '@/components/shop/StorefrontAboutSection';
import { StorefrontBranchesSection } from '@/components/shop/StorefrontBranchesSection';
import { StorefrontServiceSection } from '@/components/shop/StorefrontServiceSection';

const useCases = [
  { title: 'Daily Commute', query: 'commute', icon: Bike },
  { title: 'School & Family', query: 'family', icon: Users },
  { title: 'Negosyo / Cargo', query: 'cargo', icon: BriefcaseBusiness },
  { title: 'Long Range', query: 'range', icon: Gauge },
];

const steps = [
  { title: 'Choose Your E-Bike & Branch', detail: 'Browse models and check availability at a branch near you.', icon: MapPin },
  { title: 'Apply with 1 Valid ID (Home Credit)', detail: 'Bring your eligible government-issued ID to the branch to apply.', icon: IdCard },
  { title: 'Ride Home with Official Certificate of Ownership', detail: 'Access your certificate from your account once it’s issued.', icon: ShieldCheck },
];

export async function StorefrontHomePage({ permissionError = false }: { permissionError?: boolean }) {
  const [products, { business, branches }, context, reviews] = await Promise.all([
    getFeaturedStorefrontBikes(), getPublicStorefrontInfo(), getAuthContext(), getStorefrontHomeReviews(),
  ]);
  const canBook = context?.profile?.scope === 'customer' && hasPermission(context.profile, PERMISSIONS.storefrontAccess);
  const models = (products ?? []).flatMap((product) => {
    const variant = getStartingVariant(product);
    if (!variant || variant.price_minor <= 0 || product.is_demo) return [];
    return [{ id: product.id, name: product.name, price: variant.price_minor, downpayment: Math.min(variant.price_minor, variant.home_credit_downpayment_minor) }];
  });

  return (
    <div className="space-y-12 sm:space-y-16">
      {permissionError && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">You don&apos;t have permission to access that page.</p>}
      <section className="overflow-hidden rounded-3xl bg-[#173c2b] text-[#fffefa] lg:grid lg:grid-cols-[0.95fr_1.05fr]">
        <div className="p-6 sm:p-10 lg:self-center lg:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.19em] text-[#cce4c6]">Noel &amp; Jane E-bike Trading</p>
          <h1 className="mt-4 max-w-2xl text-4xl font-black leading-[0.98] tracking-tight sm:text-6xl">SKIP THE TRAFFIC. OWN YOUR RIDE IN CAVITE.</h1>
          <p className="mt-5 max-w-md text-base leading-6 text-[#e2eee0]">2-Wheel &amp; 3-Wheel E-Bikes with 1-ID Home Credit application &amp; Official Certificate of Ownership.</p>
          <div className="mt-7 flex flex-wrap gap-2.5">
            <Link href="/shop" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#cce4c6] px-4 text-sm font-semibold text-[#173c2b] hover:bg-white">
              Explore the shop <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link href="#installments" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/50 px-4 text-sm font-semibold hover:bg-white/10">
              Check Installment Plans <ArrowDown className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
        <div className="relative min-h-64 sm:min-h-80 lg:min-h-[31rem]">
          <Image src={caviteRiders} placeholder="blur" alt="Illustration of two-wheel commuter and three-wheel family e-bikes on a Cavite neighborhood road" fill preload sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
        </div>
      </section>

      <nav aria-label="Shop by rider use" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {useCases.map(({ title, query, icon: Icon }) => (
          <Link key={query} href={`/shop?q=${query}`} className="flex min-h-20 flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border bg-card p-3 text-sm font-semibold hover:border-primary sm:p-4">
            <Icon className="size-5 shrink-0 text-primary" aria-hidden="true" />{title}
          </Link>
        ))}
      </nav>

      <section aria-labelledby="featured-products">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="featured-products" className="text-3xl font-semibold tracking-tight sm:text-4xl">Made for the miles ahead</h2>
          <Link href="/shop" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-primary hover:underline">
            View all products <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        {products?.length ? (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {products.map((product) => <ProductCard key={product.id} product={product} compactOnNarrow featuredBranches={branches.data ?? []} />)}
          </div>
        ) : <p className="mt-5 rounded-xl border bg-card p-5 text-sm text-muted-foreground">{products ? 'No e-bikes are listed yet.' : 'The collection is temporarily unavailable.'}</p>}
      </section>

      <HomeCreditEstimator models={models} />

      <section aria-labelledby="buying-guide">
        <h2 id="buying-guide" className="text-3xl font-semibold tracking-tight sm:text-4xl">How Buying &amp; Home Credit Works</h2>
        <ol className="mt-5 grid gap-3 md:grid-cols-3">
          {steps.map(({ title, detail, icon: Icon }) => (
            <li key={title} className="rounded-2xl border bg-card p-5">
              <Icon className="size-6 text-primary" aria-hidden="true" />
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p>
            </li>
          ))}
        </ol>
      </section>

      <StorefrontServiceSection canBook={canBook} />
      <StorefrontAboutSection imageUrl={business.data?.aboutImageUrl ?? null} reviews={reviews} />
      <StorefrontBranchesSection branches={branches.data} hours={business.data?.businessHours} canBook={canBook} />
    </div>
  );
}
