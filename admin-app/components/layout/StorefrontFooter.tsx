import Image from "next/image";
import Link from "next/link";
import { Clock3, Mail, Phone } from "lucide-react";
import { LegalFooterLinks } from "@/components/layout/LegalFooterLinks";
import type { StorefrontBusinessInfo } from "@/data/commerce/system-settings";
import {
  defaultBusinessHours,
  footerBranchName,
  orderStorefrontBranches,
} from "@/lib/storefront-branches";
import {
  serviceBookingPath,
  serviceSignInPath,
} from "@/lib/storefront-service";
import { facebookUrl, messengerUrl } from "@/lib/support-chat/messenger-link";

const heading = "text-sm font-semibold primary-foreground";
const links =
  "mt-3 flex flex-col items-start gap-2.5 text-xs text-muted leading-5 [&_a]:underline-offset-4 [&_a:hover]:underline";

export function StorefrontFooter({
  businessInfo,
  branches,
  canBook,
}: {
  businessInfo: StorefrontBusinessInfo | null;
  branches: { id: string; name: string; address: string }[];
  canBook: boolean;
}) {
  const phone = businessInfo?.phone?.trim().slice(1) || "09380754139";
  const email = businessInfo?.email?.trim();
  const hours = businessInfo?.businessHours?.trim() || defaultBusinessHours;

  return (
    <footer className="mt-8 border-t border-primary/20 bg-primary text-primary-foreground">
      <div className="mx-auto max-w-7xl px-4 py-9 sm:px-6 sm:py-11">
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-8 lg:grid-cols-[1.1fr_1.15fr_1fr_1fr]">
          <section className="col-span-2 sm:col-span-1">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-lg font-semibold text-primary-foreground"
            >
              {businessInfo?.logoUrl && (
                <Image
                  src={businessInfo.logoUrl}
                  alt=""
                  width={40}
                  height={40}
                  unoptimized
                  className="size-10 shrink-0 rounded-md object-contain"
                />
              )}
              {businessInfo?.businessName || "NJET"}
            </Link>
            <p className="mt-3 text-sm leading-6 text-muted">
              Serving Cavite e-bike riders since 2023
            </p>
            {(facebookUrl || messengerUrl) && (
              <nav
                aria-label="NJET social links"
                className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm underline-offset-4 [&_a:hover]:underline"
              >
                {facebookUrl && (
                  <a
                    href={facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {" "}
                    Facebook
                  </a>
                )}
                {messengerUrl && (
                  <a
                    href={messengerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Messenger
                  </a>
                )}
              </nav>
            )}
          </section>

          <section className="col-span-2 min-w-0 sm:col-span-1">
            <h2 className={heading}>Contact &amp; Hours</h2>
            <address className={`${links} not-italic`}>
              <a
                href={`tel:${phone.replace(/[^+0-9]/g, "")}`}
                className="flex items-start gap-2"
              >
                <Phone
                  className={`${heading} mt-0.5 size-4 shrink-0`}
                  aria-hidden="true"
                />
                +63{phone}
              </a>
              {email && (
                <a
                  href={`mailto:${email}`}
                  className="flex min-w-0 items-start gap-2"
                >
                  <Mail
                    className={`${heading} mt-0.5 size-4 shrink-0`}
                    aria-hidden="true"
                  />
                  <span className="break-all">{email}</span>
                </a>
              )}
            </address>
            <p className="mt-3 flex items-start gap-2 text-xs text-muted leading-5">
              <Clock3
                className={`${heading} mt-0.5 size-4 shrink-0`}
                aria-hidden="true"
              />
              {hours}
            </p>
          </section>

          <section>
            <h2 className={heading}>Quick Links &amp; Branches</h2>
            <nav aria-label="Shop and branches" className={links}>
              <Link href="/shop">Catalog</Link>
              <Link href="/#installments">Installments</Link>
              <Link href="/#services">Parts &amp; Service</Link>
              {orderStorefrontBranches(branches).map((branch) => (
                <Link
                  key={branch.id}
                  href={{
                    pathname: "/",
                    query: { branch: branch.id },
                    hash: "branches",
                  }}
                >
                  {footerBranchName(branch)}
                </Link>
              ))}
            </nav>
          </section>

          <section>
            <h2 className={heading}>My Account &amp; Help</h2>
            <nav aria-label="Customer account and help" className={links}>
              {canBook ? (
                <>
                  <Link href="/dashboard">My dashboard</Link>
                  <Link href="/dashboard/orders">
                    My orders
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/login">Sign in</Link>
                  <Link href="/register">Join us</Link>
                </>
              )}
              <Link href={canBook ? serviceBookingPath : serviceSignInPath}>
                Book a Service
              </Link>
              <Link href="/help">Help Center</Link>
            </nav>
            <LegalFooterLinks />
          </section>
        </div>
        <p className="flex items-center justify-center gap-2 mt-8 border-t border-primary-foreground/25 pt-4 text-xs">
          © 2026 {businessInfo?.businessName || "NJET"}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
