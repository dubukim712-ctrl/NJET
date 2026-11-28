"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { ArrowUpRight, Wrench } from "lucide-react";
import {
  serviceBookingPath,
  serviceSignInPath,
} from "@/lib/storefront-service";

const parts = [
  ["Replacement Batteries", "battery"],
  ["Chargers & Accessories", "charger"],
  ["Tires & Spare Parts", "tire"],
];

export function StorefrontServiceSection() {
  const { user } = useAuth();
  const canBook = user?.scope === "customer" && hasPermission(user, PERMISSIONS.storefrontAccess);
  return (
    <section
      id="services"
      className="relative grid scroll-mt-32 gap-5 lg:grid-cols-[0.9fr_1.1fr]"
    >
      <span id="service-center" aria-hidden="true" className="absolute top-0 scroll-mt-32" />
      <div className="rounded-3xl border bg-card p-6 sm:p-8">
        <h2 className="text-l font-semibold text-foreground tracking-tight sm:text-xl md:text-2xl">
          Parts & accessories
        </h2>
        <ul className="mt-4 divide-y">
          {parts.map(([label, query]) => (
            <li key={query}>
              <Link
                href={`/shop?q=${query}`}
                className="flex min-h-12 items-center justify-between gap-3 text-sm font-medium hover:text-foreground hover:underline"
              >
                {label}
                <ArrowUpRight
                  className="size-4 shrink-0 text-foreground"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-3xl bg-[#264653] p-6 text-[#f4ede4] sm:p-8">
        <div className="flex items-center gap-4">
          <Wrench className="size-6 text-white" aria-hidden="true" />
          <h2 className="mt-3 text-l text-white font-semibold tracking-tight sm:text-xl md:text-2xl">
            NJET Service & Maintenance Center
          </h2>
        </div>
        <p className="mt-3 max-w-lg text-xs sm:text-sm leading-6">
          Schedule battery diagnostics, brake and tire servicing, or a warranty
          checkup at an NJET branch.
        </p>
        {!canBook && (
          <p className="mt-2 text-sm leading-6">
            Sign in to track your service history and warranty status.
          </p>
        )}
        <div className="mt-5 flex flex-wrap w-full items-center gap-x-4 gap-y-2">
          <Link
            href={canBook ? serviceBookingPath : serviceSignInPath} prefetch={true}
            className="inline-flex min-[320px]:max-[768px]:w-full min-h-11 min-[320px]:max-[768px]:justify-center items-center rounded-lg bg-primary-action px-4 text-sm font-semibold text-primary-foreground ring-1 ring-inset ring-white/40 hover:bg-primary-action-hover focus-visible:outline-white"
          >
            {canBook ? "Book a Service Checkup" : "Sign in to Book a Service"}
          </Link>
          {!canBook && (
            <Link
              href="/register"
              className="inline-flex min-[320px]:max-[768px]:w-full min-[205px]:max-[768px]:justify-center min-h-11 items-center text-sm font-semibold underline underline-offset-4"
            >
              Create Free Account
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
