import { ProductReviewStars } from "@/components/shop/ProductReviewStars";
import type { StorefrontHomeReview } from "@/data/commerce/storefront-home";
import { CustomerReleaseGallery } from "@/components/shop/CustomerReleaseGallery";
import type { getPublishedCustomerReleases } from "@/data/commerce/customer-releases";
import Image from "next/image";
import { SmartLink } from "@/components/ui/SmartLink";
import { ArrowRight, MapPin } from "lucide-react";

export function StorefrontAboutSection({
  imageUrl,
  reviews,
  releases,
}: {
  imageUrl: string | null;
  reviews: StorefrontHomeReview[];
  releases: Awaited<ReturnType<typeof getPublishedCustomerReleases>>;
}) {
  return (
    <section
      className="grid gap-6 border-y py-12 sm:gap-8 md:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center"
      aria-labelledby="about-njet"
    >
      <div className="space-y-5">
        <div>
          <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-foreground">
            About us
          </p>
          <h2
            id="about-njet"
            className="max-w-2xl text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl"
          >
            Growing with every journey.
          </h2>
        </div>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          Established in July 2023 in Hillsview, Naic, NJET began with one store
          and has grown to three. Partnering with Home Credit brought customers
          more ways to pay for an e-bike.
        </p>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          Today, we offer a range of e-bike models along with repair and
          maintenance services to help keep you moving.
        </p>
        <div className="flex max-[375px]:w-full  flex-wrap gap-3 pt-1">
          <SmartLink
            href="/shop"
            className="inline-flex max-[375px]:w-full max-[375px]:justify-center min-h-11 items-center gap-2 rounded-md bg-primary-action px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-action-hover"
          >
            Explore the shop
            <ArrowRight className="size-4" aria-hidden="true" />
          </SmartLink>
          <SmartLink
            href="#branches"
            className="inline-flex max-[375px]:w-full max-[375px]:justify-center min-h-11 items-center gap-2 rounded-md border px-5 text-sm font-medium hover:bg-accent"
          >
            <MapPin className="size-4" aria-hidden="true" />
            Find a store
          </SmartLink>
        </div>
      </div>

      <div className="relative isolate flex min-h-72 flex-col justify-end overflow-hidden rounded-2xl bg-[#264653] text-white sm:min-h-96">
        {imageUrl && (
          <>
            <Image
              src={imageUrl}
              alt="From the Noel & Jane E-bike Trading story"
              fill
              sizes="(min-width: 1024px) 45vw, 100vw"
              className="object-cover"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-linear-to-t from-[#14242b]/95 via-[#14242b]/85 to-[#264653]/20"
            />
          </>
        )}
        <div className="relative flex w-full flex-col gap-4 p-6 text-white sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-80">
            Our journey
          </p>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-5xl font-semibold tracking-tight">1</p>
              <p className="mt-1 text-sm">store to start</p>
            </div>
            <ArrowRight
              className="size-6 shrink-0 opacity-80"
              aria-hidden="true"
            />
            <div className="text-right">
              <p className="text-5xl font-semibold tracking-tight">3</p>
              <p className="mt-1 text-sm">stores today</p>
            </div>
          </div>
          <p className="flex items-center gap-2 text-sm opacity-90">
            <MapPin className="size-4 shrink-0" aria-hidden="true" />
            Hillsview, Naic · Established July 2023
          </p>
        </div>
      </div>
      <div className="grid min-w-0 grid-cols-1 items-start gap-6 lg:col-span-2 lg:grid-cols-12">
        <CustomerReleaseGallery releases={releases} />
        <section
          aria-labelledby="customer-reviews-title"
          className={`min-w-0 ${releases.length ? "lg:col-span-5" : "lg:col-span-12"}`}
        >
          <h3
            id="customer-reviews-title"
            className="mb-4 text-xl font-semibold"
          >
            What our customers say
          </h3>
          {reviews.length ? (
            <div className="grid gap-3">
              {reviews.map((review) => (
                <figure
                  key={review.id}
                  className="space-y-3 rounded-2xl border bg-card p-5 text-card-foreground"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <ProductReviewStars rating={review.rating} />
                    <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
                      {review.branch_name}
                    </span>
                  </div>
                  <blockquote className="whitespace-pre-line break-words text-sm leading-6">
                    “{review.comment}”
                  </blockquote>
                  <figcaption className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
                    <span className="font-semibold">
                      {review.reviewer_name ?? "Anonymous customer"}
                    </span>
                    <SmartLink
                      href={`/shop/view-product/${review.slug}`}
                      className="text-foreground hover:underline"
                    >
                      {review.product_name}
                    </SmartLink>
                  </figcaption>
                </figure>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No written reviews from verified buyers yet.
            </p>
          )}
        </section>
      </div>
    </section>
  );
}
