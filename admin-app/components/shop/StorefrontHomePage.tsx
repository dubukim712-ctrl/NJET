import { storefrontImageBlur } from "@/lib/storefront-image";
import { Suspense } from "react";
import Image from "next/image";
import defaultHero from "./njet-storefront-hero.jpg";
import { SmartLink } from "@/components/ui/SmartLink";
import { ArrowRight, MapPin, IdCard, ShieldCheck } from "lucide-react";
import { getPublishedCustomerReleases } from "@/data/commerce/customer-releases";
import { getFeaturedStorefrontBikes } from "@/data/commerce/catalog";
import {
  getPublicStorefrontInfo,
  getStorefrontHomeReviews,
} from "@/data/commerce/storefront-home";
import { getStartingVariant } from "@/data/commerce/storefront-starting-variant";
import { Button } from "@/components/ui/Button";
import { ProductCard } from "@/components/shop/ProductCard";
import { HomeCreditEstimator } from "@/components/shop/HomeCreditEstimator";
import { StorefrontBenefitsSection } from "@/components/shop/StorefrontBenefitsSection";
import { StorefrontAboutSection } from "@/components/shop/StorefrontAboutSection";
import { StorefrontBranchesSection } from "@/components/shop/StorefrontBranchesSection";
import { StorefrontServiceSection } from "@/components/shop/StorefrontServiceSection";

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
  const [products, { business, branches }, reviews, releases] =
    await Promise.all([
      getFeaturedStorefrontBikes(),
      getPublicStorefrontInfo(),
      getStorefrontHomeReviews(),
      getPublishedCustomerReleases(),
    ]);
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
    <div className="space-y-8 md:space-y-12">
      {permissionError && (
        <p
          role="alert"
          className="mx-4 mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive sm:mx-6 xl:mx-auto xl:max-w-7xl"
        >
          You don&apos;t have permission to access that page.
        </p>
      )}
      <div className="[--hero-bg:#264653]">
        <section
          aria-labelledby="storefront-hero-title"
          className="relative isolate overflow-hidden bg-[var(--hero-bg)] text-[#f4ede4] lg:flex lg:aspect-[11/5] lg:min-h-[30rem] lg:items-center"
        >
          <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pt-7 sm:px-6 sm:pt-10 lg:py-12">
            <div className="max-w-xl lg:w-[46%]">
              <p className="text-xs font-semibold uppercase tracking-[0.19em] text-white">
                Noel &amp; Jane E-bike Trading
              </p>
              <h1
                id="storefront-hero-title"
                className="mt-4 max-w-2xl text-4xl font-black leading-[0.98] tracking-tight sm:text-6xl"
              >
                Ebikes for Daily Commute, School, Family &amp; Business
              </h1>
              <p className="mt-5 max-w-md text-base leading-6 text-[#f4ede4] sm:text-lg sm:leading-7 md:max-w-lg">
                Ride with comfort, save on fuel, and enjoy hassle-free travel
                with your very own e-bike.
              </p>
              <div className="mt-7 flex flex-wrap gap-2.5">
                <Button
                  asChild
                  variant={null}
                  size={null}
                  className="min-h-11 gap-1 rounded-lg text-xs sm:text-sm bg-primary-action px-4 font-semibold text-primary-foreground ring-1 ring-inset ring-white/40 hover:bg-primary-action-hover focus-visible:outline-white focus-visible:ring-[#f4ede4]"
                >
                  <SmartLink href="/shop">
                    Explore the shop{" "}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </SmartLink>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size={null}
                  className="min-h-11 gap-1 rounded-lg text-xs sm:text-sm border-white/40 bg-transparent px-4 font-semibold text-white hover:bg-white/10 hover:text-white"
                >
                  <SmartLink href="/appointments/new" prefetch={true}>
                    Book a Service{" "}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </SmartLink>
                </Button>
              </div>
            </div>
          </div>
          <div className="pointer-events-none relative aspect-[4/3] sm:aspect-video lg:absolute lg:inset-0 lg:aspect-auto">
            <Image
              src={business.data?.heroImageUrl ?? defaultHero}
              placeholder="blur"
              blurDataURL={
                business.data?.heroImageUrl ? storefrontImageBlur : undefined
              }
              quality={70}
              alt=""
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
              className="absolute inset-0 hidden bg-[linear-gradient(to_right,var(--hero-bg)_0%,color-mix(in_srgb,var(--hero-bg)_94%,transparent)_49%,transparent_76%)] lg:block"
            />
          </div>
        </section>
      </div>

      <div className="mx-auto max-w-7xl space-y-12 px-4 sm:px-6 md:space-y-16">
        <StorefrontBenefitsSection />

        <section aria-labelledby="featured-products">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2
              id="featured-products"
              className="text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl"
            >
              Featured E-Bikes
            </h2>
            <SmartLink
              href="/shop"
              className="hidden sm:inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-foreground hover:underline"
            >
              View all products{" "}
              <ArrowRight className="size-4" aria-hidden="true" />
            </SmartLink>
          </div>
          {products?.length ? (
            <>
              <div className="mt-5 grid grid-flow-col auto-cols-[16rem] gap-3 overflow-x-auto p-1 sm:gap-4 lg:grid-flow-row lg:grid-cols-4 lg:auto-cols-auto lg:overflow-visible">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    compactOnNarrow
                    featuredBranches={branches.data ?? []}
                  />
                ))}
              </div>

              <SmartLink
                href="/shop"
                className="inline-flex w-full mt-5 sm:hidden min-h-10 justify-center items-center gap-2 text-sm font-semibold text-foreground hover:underline"
              >
                View all products{" "}
                <ArrowRight className="size-4" aria-hidden="true" />
              </SmartLink>
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
                  <Icon className="size-6 text-foreground" aria-hidden="true" />
                  <h3 className="text-sm font-semibold text-center">{title}</h3>
                </div>
                <p className="mt-2 text-xs text-center leading-6 text-muted-foreground">
                  {detail}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <StorefrontServiceSection />
        <StorefrontAboutSection
          imageUrl={business.data?.aboutImageUrl ?? null}
          reviews={reviews}
          releases={releases}
        />
        <Suspense
          fallback={
            <div
              id="branches"
              className="min-h-96 scroll-mt-32 rounded-2xl border bg-card"
            />
          }
        >
          <StorefrontBranchesSection
            branches={branches.data}
            hours={business.data?.businessHours}
          />
        </Suspense>
      </div>
    </div>
  );
}
