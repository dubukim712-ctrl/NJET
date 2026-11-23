import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";

export function StorefrontAboutSection({
  imageUrl,
}: {
  imageUrl: string | null;
}) {
  return (
    <section
      className="grid gap-6 border-y py-10 sm:gap-8 sm:py-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center"
      aria-labelledby="about-njet"
    >
      <div className="space-y-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          About Noel &amp; Jane E-bike Trading
        </p>
        <h2
          id="about-njet"
          className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl"
        >
          Growing with every journey.
        </h2>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          Established in July 2023 in Hillsview, Naic, NJET began with one store
          and has grown to three. Partnering with Home Credit brought customers
          more ways to pay for an e-bike.
        </p>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          Today, we offer a range of e-bike models along with repair and
          maintenance services to help keep you moving.
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          <Link
            href="/shop"
            className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Explore the shop
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <Link
            href="#business-contact"
            className="inline-flex min-h-11 items-center gap-2 rounded-md border px-5 text-sm font-medium hover:bg-accent"
          >
            Find a store
            <MapPin className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {imageUrl ? (
        <div className="relative min-h-64 overflow-hidden rounded-2xl bg-muted sm:min-h-80">
          <Image
            src={imageUrl}
            alt="Noel & Jane E-bike Trading store or team"
            fill
            sizes="(min-width: 1024px) 45vw, 100vw"
            unoptimized
            className="object-cover"
          />
        </div>
      ) : (
        <div className="flex min-h-64 flex-col justify-between rounded-2xl bg-primary p-6 text-primary-foreground sm:min-h-80 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-80">
            Our journey
          </p>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-5xl font-semibold tracking-tight">1</p>
              <p className="mt-1 text-sm">store to start</p>
            </div>
            <ArrowRight className="size-6 shrink-0 opacity-80" aria-hidden="true" />
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
      )}
    </section>
  );
}
