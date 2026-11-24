"use client";

import Link from "next/link";
import { Clock3, Mail, MapPin, Phone } from "lucide-react";
import { LegalFooterLinks } from "@/components/layout/LegalFooterLinks";
import type { StorefrontBusinessInfo } from "@/data/commerce/system-settings";

export function StorefrontFooter({
  businessInfo,
  businessInfoError,
  businessInfoPending,
  hasBusinessContact,
}: {
  businessInfo: StorefrontBusinessInfo | null;
  businessInfoError: string | null;
  businessInfoPending: boolean;
  hasBusinessContact: boolean;
}) {
  return (
    <footer className="mt-8 border-t border-primary/20 bg-primary text-primary-foreground">
      <div className="mx-auto max-w-7xl px-4 py-9 sm:px-6 sm:py-11 lg:py-12">
        <div className="grid gap-8 md:grid-cols-[minmax(12rem,0.85fr)_minmax(0,1.5fr)] md:gap-10">
          <section className="max-w-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-foreground/70">
              Thanks for riding with us
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">
              {businessInfo?.businessName || "NJET"}
            </h2>
            <p
              className="mt-3 text-sm leading-6 text-primary-foreground/80"
              role={businessInfoError ? "status" : undefined}
            >
              {businessInfoError
                ? "Business contact information is temporarily unavailable."
                : businessInfoPending
                  ? "Loading business contact information..."
                  : hasBusinessContact || businessInfo?.businessHours
                    ? "Get in touch with our team. We are here to help you find your next ride."
                    : "Business contact details have not been added yet."}
            </p>
          </section>

          <div className="grid gap-8 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-foreground/70">
                Contact
              </h3>
              {hasBusinessContact ? (
                <address className="mt-4 space-y-4 not-italic">
                  {businessInfo?.phone && (
                    <a
                      className="flex items-start gap-3 text-sm transition-colors hover:text-white"
                      href={`tel:${businessInfo.phone.replace(/[^+0-9]/g, "")}`}
                    >
                      <Phone
                        className="mt-0.5 size-4 shrink-0"
                        aria-hidden="true"
                      />
                      <span className="min-w-0">
                        <span className="block text-xs text-primary-foreground/70">
                          Call
                        </span>
                        <span className="break-words">{businessInfo.phone}</span>
                      </span>
                    </a>
                  )}
                  {businessInfo?.email && (
                    <a
                      className="flex items-start gap-3 text-sm transition-colors hover:text-white"
                      href={`mailto:${businessInfo.email}`}
                    >
                      <Mail
                        className="mt-0.5 size-4 shrink-0"
                        aria-hidden="true"
                      />
                      <span className="min-w-0">
                        <span className="block text-xs text-primary-foreground/70">
                          Email
                        </span>
                        <span className="break-all">{businessInfo.email}</span>
                      </span>
                    </a>
                  )}
                  {businessInfo?.address && (
                    <div className="flex items-start gap-3 text-sm">
                      <MapPin
                        className="mt-0.5 size-4 shrink-0"
                        aria-hidden="true"
                      />
                      <span className="min-w-0">
                        <span className="block text-xs text-primary-foreground/70">
                          Address
                        </span>
                        <span className="break-words">
                          {businessInfo.address}
                        </span>
                      </span>
                    </div>
                  )}
                </address>
              ) : (
                <p className="mt-4 text-sm leading-6 text-primary-foreground/80">
                  Contact details have not been added yet.
                </p>
              )}
              <Link href="/help" className="mt-2 inline-flex min-h-11 items-center text-sm underline-offset-4 hover:underline focus-visible:underline">
                Help Center
              </Link>
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-foreground/70">
                Business hours
              </h3>
              {businessInfo?.businessHours ? (
                <div className="mt-4 flex items-start gap-3">
                  <Clock3
                    className="mt-0.5 size-4 shrink-0"
                    aria-hidden="true"
                  />
                  <p className="whitespace-pre-line text-sm leading-6">
                    {businessInfo.businessHours}
                  </p>
                </div>
              ) : (
                <p className="mt-4 text-sm leading-6 text-primary-foreground/80">
                  Hours have not been added yet.
                </p>
              )}
            </section>

            <LegalFooterLinks />
          </div>
        </div>

        <div className="mt-8 border-t border-primary-foreground/15 pt-4 text-xs text-primary-foreground/70">
          © 2026 {businessInfo?.businessName || "NJET"}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
