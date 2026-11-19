"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Home, CalendarDays, Package, ShoppingBag, Search, X,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { UserNav } from "@/components/auth/UserNav";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { StorefrontFooter } from "@/components/layout/StorefrontFooter";
import { ShopFiltersProvider } from "@/components/shop/ShopFiltersContext";
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
  const [shopFiltersOpen, setShopFiltersOpen] = useState(false);
  const [shopFiltersPopoverRoot, setShopFiltersPopoverRoot] =
    useState<HTMLDivElement | null>(null);
  const shopFiltersContainerRef = useRef<HTMLDivElement>(null);
  const shopFiltersButtonRef = useRef<HTMLButtonElement>(null);
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

  useEffect(() => {
    if (!shopFiltersOpen) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      if (
        event.target instanceof Element &&
        event.target.closest('[role="listbox"]')
      ) {
        return;
      }
      if (!shopFiltersContainerRef.current?.contains(event.target)) {
        setShopFiltersOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setShopFiltersOpen(false);
      shopFiltersButtonRef.current?.focus();
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [shopFiltersOpen]);

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
            {pathname === "/shop" && (
              <div ref={shopFiltersContainerRef} className="relative lg:hidden">
                <button
                  ref={shopFiltersButtonRef}
                  type="button"
                  aria-label={shopFiltersOpen ? "Hide product filters" : "Search products"}
                  aria-expanded={shopFiltersOpen}
                  aria-controls="shop-filters-popover-root"
                  title={shopFiltersOpen ? "Hide product filters" : "Search products"}
                  onClick={() => setShopFiltersOpen((open) => !open)}
                  className="inline-flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {shopFiltersOpen ? (
                    <X className="size-5" aria-hidden="true" />
                  ) : (
                    <Search className="size-5" aria-hidden="true" />
                  )}
                </button>
                <div
                  id="shop-filters-popover-root"
                  ref={(element) => setShopFiltersPopoverRoot(element)}
                  className="fixed left-1/2 top-[4.5rem] z-[60] w-[min(90vw,24rem)] -translate-x-1/2"
                />
              </div>
            )}
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
        <ShopFiltersProvider
          value={{
            open: shopFiltersOpen,
            popoverRoot: shopFiltersPopoverRoot,
          }}
        >
          {children}
        </ShopFiltersProvider>
      </main>
      <StorefrontFooter
        businessInfo={businessInfo}
        businessInfoError={businessInfoError}
        businessInfoPending={businessInfoQuery.isPending}
        hasBusinessContact={hasBusinessContact}
      />
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-lg justify-around">
          {navigation(true)}
        </div>
      </div>
    </div>
  );
}
