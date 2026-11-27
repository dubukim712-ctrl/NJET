import Image from "next/image";
import caviteRiders from "./njet-cavite-riders-wide.webp";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  Bike,
  BriefcaseBusiness,
  Gauge,
  Users,
  MapPin,
  IdCard,
  ShieldCheck,
} from "lucide-react";
import { getAuthContext } from "@/data/auth/guards";
import { getPublishedCustomerReleases } from "@/data/commerce/customer-releases";
import { getFeaturedStorefrontBikes } from "@/data/commerce/catalog";
import {
  getPublicStorefrontInfo,
  getStorefrontHomeReviews,
} from "@/data/commerce/storefront-home";
import { getStartingVariant } from "@/data/commerce/storefront-starting-variant";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { Button } from "@/components/ui/Button";
import { ProductCard } from "@/components/shop/ProductCard";
import { HomeCreditEstimator } from "@/components/shop/HomeCreditEstimator";
import { StorefrontAboutSection } from "@/components/shop/StorefrontAboutSection";
import { StorefrontBranchesSection } from "@/components/shop/StorefrontBranchesSection";
import { StorefrontServiceSection } from "@/components/shop/StorefrontServiceSection";

const useCases = [
  { title: "Daily Commute", query: "commute", icon: Bike },
  { title: "School & Family", query: "family", icon: Users },
  { title: "Negosyo / Cargo", query: "cargo", icon: BriefcaseBusiness },
  { title: "Long Range", query: "range", icon: Gauge },
];

const steps = [
  {
    title: "Choose Your E-Bike & Branch",
    detail: "Browse models and check availability at a branch near you.",
    icon: MapPin,
  },
  {
    title: "Apply with 1 Valid ID",
    detail: "Bring your eligible government-issued ID to the branch to apply.",
    icon: IdCard,
  },
  {
    title: "Enjoy your Ride",
    detail: "Take your e-bike home and enjoy the ride with your new purchase.",
    icon: ShieldCheck,
  },
];

export async function StorefrontHomePage({
  permissionError = false,
}: {
  permissionError?: boolean;
}) {
  const [products, { business, branches }, context, reviews, releases] =
    await Promise.all([
      getFeaturedStorefrontBikes(),
      getPublicStorefrontInfo(),
      getAuthContext(),
      getStorefrontHomeReviews(),
      getPublishedCustomerReleases(),
    ]);
  const canBook =
    context?.profile?.scope === "customer" &&
    hasPermission(context.profile, PERMISSIONS.storefrontAccess);
  const models = (products ?? []).flatMap((product) => {
    const variant = getStartingVariant(product);
    if (!variant || variant.price_minor <= 0 || product.is_demo) return [];
    return [
      {
        id: product.id,
        name: product.name,
        price: variant.price_minor,
        downpayment: Math.min(
          variant.price_minor,
          variant.home_credit_downpayment_minor,
        ),
      },
    ];
  });

  return (
    <div className="space-y-12 sm:space-y-16">
      {permissionError && (
        <p
          role="alert"
          className="mx-4 mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive sm:mx-6 xl:mx-auto xl:max-w-7xl"
        >
          You don&apos;t have permission to access that page.
        </p>
      )}
      <div className="[--hero-bg:#1b4d36]">
        <section
          aria-labelledby="storefront-hero-title"
          className="relative isolate overflow-hidden bg-[var(--hero-bg)] text-white lg:flex lg:aspect-[11/5] lg:min-h-[30rem] lg:items-center"
        >
          <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pt-7 sm:px-6 sm:pt-10 lg:py-12">
            <div className="max-w-xl lg:w-[46%]">
              <p className="text-xs font-semibold uppercase tracking-[0.19em] text-secondary">
                Noel &amp; Jane E-bike Trading
              </p>
              <h1
                id="storefront-hero-title"
                className="mt-4 max-w-2xl text-4xl font-black leading-[0.98] tracking-tight sm:text-6xl"
              >
                Ebikes for Daily Commute, School, Family &amp; Negosyo
              </h1>
              <p className="mt-5 max-w-md text-base leading-6 text-primary-foreground sm:text-lg sm:leading-7 md:max-w-lg">
                Explore our wide range of e-bikes designed for your daily
                commute, school runs, family outings, and negosyo needs. Find
                the perfect e-bike that fits your lifestyle and enjoy the
                benefits of sustainable transportation.
              </p>
              <div className="mt-7 flex flex-wrap gap-2.5">
                <Button
                  asChild
                  size={null}
                  className="min-h-11 gap-1 rounded-lg text-xs sm:text-sm bg-white px-4 font-semibold text-[color:var(--hero-bg)] hover:bg-emerald-50"
                >
                  <Link href="/shop">
                    Explore the shop{" "}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size={null}
                  className="min-h-11 gap-1 rounded-lg text-xs sm:text-sm border-white/40 bg-transparent px-4 font-semibold text-white hover:bg-white/10 hover:text-white"
                >
                  <Link href="/dashboard/appointments/new">
                    Book a Service{" "}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
          <div className="pointer-events-none relative aspect-[4/3] sm:aspect-video lg:absolute lg:inset-0 lg:aspect-auto">
            <Image
              src={caviteRiders}
              placeholder="blur"
              alt="Riders on two-wheel commuter and three-wheel family e-bikes on a Cavite street"
              fill
              preload
              sizes="100vw"
              className="h-full w-full object-cover object-right-bottom [mask-image:linear-gradient(to_bottom,transparent,black_20%)] lg:[mask-image:linear-gradient(to_right,transparent,black_44%)]"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[linear-gradient(to_bottom,var(--hero-bg),transparent_36%,transparent_96%,color-mix(in_srgb,var(--hero-bg)_22%,transparent))] lg:hidden"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 hidden bg-[linear-gradient(to_right,var(--hero-bg)_0%,color-mix(in_srgb,var(--hero-bg)_90%,transparent)_36%,transparent_69%)] lg:block"
            />
          </div>
        </section>

        <nav
          aria-label="Shop by rider use"
          className="mx-auto grid max-w-7xl grid-cols-2 gap-3 px-4 pt-3 sm:grid-cols-4 sm:px-6"
        >
          {useCases.map(({ title, query, icon: Icon }) => (
            <Link
              key={query}
              href={`/shop?q=${query}`}
              className="flex flex-col justify-center min-h-10 flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border bg-card p-3 text-sm font-semibold hover:border-primary sm:p-4"
            >
              <Icon
                className="size-5 shrink-0 text-primary"
                aria-hidden="true"
              />
              {title}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mx-auto max-w-7xl space-y-12 px-4 sm:space-y-16 sm:px-6">
        <section aria-labelledby="featured-products">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2
              id="featured-products"
              className="text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl"
            >
              Featured E-Bikes
            </h2>
            <Link
              href="/shop"
              className="hidden sm:inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-primary hover:underline"
            >
              View all products{" "}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          {products?.length ? (
            <>
              <div className="mt-5 grid grid-flow-col auto-cols-[16rem] gap-3 overflow-x-auto sm:gap-4 lg:grid-flow-row lg:grid-cols-4 lg:auto-cols-auto lg:overflow-visible">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    compactOnNarrow
                    featuredBranches={branches.data ?? []}
                  />
                ))}
              </div>

              <Link
                href="/shop"
                className="inline-flex w-full mt-5 sm:hidden min-h-10 justify-center items-center gap-2 text-sm font-semibold text-primary hover:underline"
              >
                View all products{" "}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </>
          ) : (
            <p className="mt-5 rounded-xl border bg-card p-5 text-sm text-muted-foreground">
              {products
                ? "No e-bikes are listed yet."
                : "The collection is temporarily unavailable."}
            </p>
          )}
        </section>

        <HomeCreditEstimator models={models} />

        <section aria-labelledby="buying-guide">
          <h2
            id="buying-guide"
            className="text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl"
          >
            How to Buy an E-Bike in 3 Easy Steps
          </h2>
          <ol className="mt-5 grid gap-3 md:grid-cols-3">
            {steps.map(({ title, detail, icon: Icon }) => (
              <li key={title} className="rounded-2xl border bg-card p-5">
                <div className="flex flex-col justify-center items-center gap-3">
                  <Icon className="size-6 text-primary" aria-hidden="true" />
                  <h6 className="text-sm font-semibold text-center">{title}</h6>
                </div>
                <p className="mt-2 text-xs text-center leading-6 text-muted-foreground">
                  {detail}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <StorefrontServiceSection canBook={canBook} />
        <StorefrontAboutSection
          imageUrl={business.data?.aboutImageUrl ?? null}
          reviews={reviews}
          releases={releases}
        />
        <StorefrontBranchesSection
          branches={branches.data}
          hours={business.data?.businessHours}
          canBook={canBook}
        />
      </div>
    </div>
  );
}
