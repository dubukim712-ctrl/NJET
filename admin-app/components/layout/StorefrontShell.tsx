"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  CalendarDays,
  Package,
  ShoppingBag,
  Clock3,
  Mail,
  MapPin,
  Phone,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { UserNav } from "@/components/auth/UserNav";
import { CartDrawer } from "@/components/cart/CartDrawer";
import {
  StorefrontBusinessInfoQueryError,
  useStorefrontBusinessInfoQuery,
} from "@/data/commerce/storefront-business-info-client";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type { UserProfile } from "@/types/database";

interface StorefrontShellProps {
  user: UserProfile | null;
  children: React.ReactNode;
}

const NAVIGATION: {
  name: string;
  href: string;
  icon: LucideIcon;
}[] = [
  { name: "Home", href: "/", icon: Home },
  { name: "Shop", href: "/shop", icon: ShoppingBag },
  { name: "Orders", href: "/dashboard/orders", icon: Package },
  { name: "Appointments", href: "/dashboard/appointments", icon: CalendarDays },
];

export function StorefrontShell({ user, children }: StorefrontShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user: clientUser } = useAuth();
  const businessInfoQuery = useStorefrontBusinessInfoQuery();
  const businessInfo = businessInfoQuery.data ?? null;
  const businessInfoError =
    !businessInfo &&
    businessInfoQuery.error instanceof StorefrontBusinessInfoQueryError
      ? businessInfoQuery.error.message
      : !businessInfo && businessInfoQuery.isError
        ? "Business contact information is temporarily unavailable."
        : null;
  const hasBusinessContact = Boolean(
    businessInfo?.phone || businessInfo?.email || businessInfo?.address,
  );
  const displayUser = clientUser ?? user;
  const canAccessStorefront = hasPermission(
    displayUser,
    PERMISSIONS.storefrontAccess,
  );
  const navigationItems = [
    NAVIGATION[0],
    NAVIGATION[1],
    ...(canAccessStorefront ? [NAVIGATION[2], NAVIGATION[3]] : []),
  ];

  const navigation = (mobile = false) => (
    <nav
      aria-label="Storefront navigation"
      className={cn(
        "flex items-center",
        mobile ? "w-full justify-around" : "gap-1",
      )}
    >
      {navigationItems.map((item) => {
        const href = item.href;
        const active =
          item.name === "Home"
            ? pathname === "/"
            : item.name === "Shop"
              ? pathname.startsWith("/shop")
              : item.name === "Orders"
                ? pathname.startsWith("/dashboard/orders")
                : pathname.startsWith("/dashboard/appointments");

        return (
          <Link
            key={item.name}
            href={href}
            prefetch={false}
            onPointerEnter={() => router.prefetch(href)}
            onFocus={() => router.prefetch(href)}
            onClick={(event) => {
              if (
                pathname !== href ||
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
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            aria-current={active ? "page" : undefined}
            className={cn(
              mobile
                ? "flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-xs font-medium"
                : "inline-flex min-h-10 items-center justify-center gap-2 rounded-full px-3 text-sm font-medium transition-colors sm:px-4",
              active
                ? "text-primary"
                : "text-muted-foreground hover:text-accent-foreground",
              !mobile && active && "bg-primary/10",
              mobile && active && "bg-primary/5",
            )}
          >
            <item.icon
              className={mobile ? "h-5 w-5" : "h-4 w-4"}
              aria-hidden="true"
            />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-dvh bg-background pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href="/"
            className="flex min-w-0 shrink-0 items-center gap-2 text-base font-semibold tracking-tight sm:text-lg"
          >
            {businessInfo?.logoUrl && (
              <Image
                src={businessInfo.logoUrl}
                alt=""
                width={36}
                height={36}
                unoptimized
                className="size-9 rounded-md object-contain"
              />
            )}
            <span className="truncate">
              {businessInfo?.businessName || "NJET"}
            </span>
          </Link>

          <div className="hidden lg:block">{navigation()}</div>
          <div className="flex items-center gap-2">
            <CartDrawer />
            {displayUser ? (
              <UserNav user={displayUser} showHelp />
            ) : (
              <div className="flex items-center gap-1">
                <Link
                  href="/login"
                  className="inline-flex min-h-10 items-center rounded-md px-2 text-sm font-medium hover:bg-accent"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="inline-flex min-h-10 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Join
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto min-h-[calc(100dvh-4rem)] max-w-7xl px-4 pt-6 pb-8 sm:px-6 sm:py-8">
        {children}
      </main>
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
                  : businessInfoQuery.isPending
                    ? "Loading business contact information..."
                    : hasBusinessContact || businessInfo?.businessHours
                      ? "Get in touch with our team. We are here to help you find your next ride."
                      : "Business contact details have not been added yet."}
              </p>
            </section>

            <div className="grid gap-8 sm:grid-cols-2 sm:gap-6">
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
                          <span className="break-words">
                            {businessInfo.phone}
                          </span>
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
                          <span className="break-all">
                            {businessInfo.email}
                          </span>
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
            </div>
          </div>

          <div className="mt-8 border-t border-primary-foreground/15 pt-4 text-xs text-primary-foreground/70">
            © 2026 {businessInfo?.businessName || "NJET"}. All rights reserved.
          </div>
        </div>
      </footer>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-lg justify-around">
          {navigation(true)}
        </div>
      </div>
    </div>
  );
}
