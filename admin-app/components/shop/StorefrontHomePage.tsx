"use client";

import Link from "next/link";
import { ArrowDown, ArrowRight, Bike, MapPin, ShieldCheck } from "lucide-react";
import { ProductCard } from "@/components/shop/ProductCard";
import { ProductImage } from "@/components/shop/ProductImage";
import { StorefrontBranchesSection } from "@/components/shop/StorefrontBranchesSection";
import { StorefrontCatalogLoading } from "@/components/shop/StorefrontCatalogLoading";
import {
  StorefrontCatalogQueryError,
  useStorefrontCatalogQuery,
} from "@/data/commerce/storefront-catalog-client";
import { useSearchParams } from "next/dist/client/components/navigation";

export function StorefrontHomePage() {
  const query = useStorefrontCatalogQuery();
  const catalog = query.data ?? null;
  const error =
    !catalog && query.error instanceof StorefrontCatalogQueryError
      ? query.error.message
      : !catalog && query.isError
        ? "The catalog could not be loaded. Please try again later."
        : null;
  const featured = catalog?.products.slice(0, 3) ?? [];
  const heroProduct = featured[0];
  const permissionError =
    useSearchParams().get("error") === "insufficient_permissions";

  return (
    <div className="space-y-12 sm:space-y-16">
      {permissionError && (
        <div
          className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive mb-6"
          role="alert"
        >
          You don&apos;t have permission to access that page.
        </div>
      )}
      <section className="overflow-hidden rounded-2xl bg-primary text-primary-foreground">
        <div className="grid gap-8 p-5 sm:p-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-12 lg:p-12">
          <div className="space-y-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-80">
              Noel &amp; Jane E-bike Trading
            </p>
            <h1 className="max-w-xl text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
              Take the long way home.
            </h1>
            <p className="max-w-lg text-sm leading-6 opacity-90 sm:text-base">
              Find your next ride, then pick up the parts and accessories to
              make it yours.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/shop"
                className="inline-flex min-h-11 items-center gap-2 rounded-md bg-background px-5 text-sm font-semibold text-foreground transition-colors hover:bg-background/90"
              >
                Explore the shop{" "}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="#business-contact"
                onClick={(event) => {
                  if (
                    event.defaultPrevented ||
                    event.button !== 0 ||
                    event.metaKey ||
                    event.ctrlKey ||
                    event.shiftKey ||
                    event.altKey
                  ) {
                    return;
                  }

                  event.preventDefault();
                  document
                    .getElementById("business-contact")
                    ?.scrollIntoView({ behavior: "smooth" });
                  window.history.replaceState(
                    window.history.state,
                    "",
                    `${window.location.pathname}${window.location.search}`,
                  );
                }}
                className="inline-flex min-h-11 items-center rounded-md border border-primary-foreground/40 px-5 text-sm font-medium hover:bg-primary-foreground/10"
              >
                Visit our branch{" "}
                <ArrowDown className=" ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <p className="text-xs leading-5 opacity-75">
              Browse and add to your cart as a guest. Sign in when you are ready
              to check out.
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
              <div className="flex min-h-64 items-center justify-center text-primary sm:min-h-80">
                <Bike
                  className="h-24 w-24"
                  strokeWidth={1.2}
                  aria-hidden="true"
                />
              </div>
            )}
            {heroProduct && (
              <div className="absolute inset-x-3 bottom-3 rounded-xl bg-background/95 p-3 text-foreground shadow-lg sm:inset-x-5 sm:bottom-5 sm:p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  Start exploring
                </p>
                <p className="mt-1 truncate font-semibold">
                  {heroProduct.name}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 border-y py-6 sm:grid-cols-3 sm:gap-6 sm:py-8">
        {[
          {
            icon: Bike,
            title: "Find your ride",
            text: "Compare e-bikes and everyday essentials.",
          },
          {
            icon: MapPin,
            title: "Choose a branch",
            text: "Check product availability before you order.",
          },
          {
            icon: ShieldCheck,
            title: "Shop with confidence",
            text: "Your order is checked by our team.",
          },
        ].map((item) => (
          <div key={item.title} className="flex md:justify-center gap-3">
            <item.icon
              className="mt-0.5 h-5 w-5 shrink-0 text-primary"
              aria-hidden="true"
            />
            <div>
              <h2 className="text-sm font-semibold">{item.title}</h2>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">
                {item.text}
              </p>
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-5" aria-labelledby="featured-products">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              The collection
            </p>
            <h2
              id="featured-products"
              className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl"
            >
              Made for the miles ahead
            </h2>
          </div>
          <Link
            href="/shop"
            className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            View all products{" "}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        {query.isError && catalog && (
          <p
            className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
            role="alert"
          >
            Could not refresh the collection. Cached products are still shown.
          </p>
        )}

        {error ? (
          <div
            className="rounded-xl border border-destructive/30 bg-destructive/5 p-5"
            role="alert"
          >
            <h3 className="font-semibold">
              The collection is temporarily unavailable
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            <Link
              href="/shop"
              className="mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-primary underline"
            >
              Open the shop
            </Link>
          </div>
        ) : query.isPending ? (
          <StorefrontCatalogLoading label="featured products" />
        ) : featured.length ? (
          <div
            className="flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-4"
            role="region"
            aria-labelledby="featured-products"
            tabIndex={0}
          >
            {featured.map((product) => (
              <div
                key={product.id}
                className="w-[72vw] max-w-md shrink-0 snap-start sm:w-80"
              >
                <ProductCard
                  product={product}
                  compactOnNarrow
                  loading={product.id === heroProduct?.id ? "eager" : undefined}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border bg-card px-5 py-10 text-center">
            <h3 className="font-semibold">The collection is being prepared</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Check back soon or contact our team.
            </p>
          </div>
        )}
      </section>

      <StorefrontBranchesSection />
    </div>
  );
}
