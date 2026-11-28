"use client";

import { useEffect, useRef, useState } from "react";
import { SmartLink } from "@/components/ui/SmartLink";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Search, X } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { UserNav } from "@/components/auth/UserNav";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { SupportChatLauncher } from "@/components/support-chat/SupportChatLauncher";
import { StorefrontFooter } from "@/components/layout/StorefrontFooter";
import { ShopFiltersProvider } from "@/components/shop/ShopFiltersContext";
import { Button } from "@/components/ui/Button";
import { useStorefrontActiveLink } from "@/components/layout/useStorefrontActiveLink";
import { StorefrontMobileNavigation } from "@/components/layout/StorefrontMobileNavigation";
import type { StorefrontBusinessInfo } from "@/data/commerce/system-settings";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type { UserProfile } from "@/types/database";

interface StorefrontShellProps {
  user: UserProfile | null;
  children: React.ReactNode;
  businessInfo: StorefrontBusinessInfo | null;
  branches: { id: string; name: string; address: string }[];
}

const sectionLinks = [
  { name: "Home", href: "/" },
  { name: "Catalog", href: "/catalog" },
  { name: "Installments", href: "/#installments" },
  { name: "Parts & Service", href: "/#services" },
  { name: "Branches", href: "/#branches" },
];

export function StorefrontShell({
  user,
  children,
  businessInfo,
  branches,
}: StorefrontShellProps) {
  const pathname = usePathname();
  const activeLink = useStorefrontActiveLink(pathname);
  const hasPanoramicHero = pathname === "/";
  const [shopFiltersOpen, setShopFiltersOpen] = useState(false);
  const [shopFiltersPopoverRoot, setShopFiltersPopoverRoot] =
    useState<HTMLDivElement | null>(null);
  const shopFiltersContainerRef = useRef<HTMLDivElement>(null);
  const shopFiltersButtonRef = useRef<HTMLButtonElement>(null);
  const { user: clientUser } = useAuth();
  const displayUser = clientUser ?? user;
  const canAccessStorefront = hasPermission(
    displayUser,
    PERMISSIONS.storefrontAccess,
  );

  useEffect(() => {
    if (pathname !== "/") return;
    const id = window.location.hash.slice(1);
    if (!["installments", "services", "branches"].includes(id)) return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

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

  return (
    <div className="min-h-dvh bg-background pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0">
      <header
        id="storefront-header"
        className={cn(
          "sticky top-0 z-40 bg-background",
          !hasPanoramicHero && "border-b",
        )}
      >
        <div className="bg-[#264653] px-3 py-1.5 text-center text-[11px] leading-4 text-[#f4ede4] sm:text-xs">
          {displayUser ? (
            <SmartLink href="/orders" prefetch={true} className="underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-white">
              <strong className="text-[#e0f2ef]">MEMBER PERKS:</strong> Track your orders, view receipts &amp; book a service checkup →
            </SmartLink>
          ) : (
            <>
              <strong className="text-[#e0f2ef]">MEMBER PERKS:</strong> Sign in to book a service checkup &amp; track orders.
            </>
          )}
        </div>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-3 sm:px-6">
          <SmartLink
            href="/"
            className="flex min-w-0 items-center gap-2 text-base font-semibold leading-none tracking-tight sm:text-lg"
          >
            {businessInfo?.logoUrl && (
              <Image
                src={businessInfo.logoUrl}
                alt=""
                width={36}
                height={36}
                className="size-9 shrink-0 rounded-full object-contain"
              />
            )}
            <span className="hidden truncate sm:inline md:hidden lg:inline lg:max-w-40 xl:max-w-none">
              {businessInfo?.businessName || "NJET"}
            </span>
            <span className="sm:hidden md:inline lg:hidden">NJET</span>
          </SmartLink>

          <nav
            aria-label="Storefront navigation"
            className="hidden items-center lg:flex"
          >
            {sectionLinks.map(({ name, href }) => {
              const active = href === activeLink;
              return (
                <SmartLink
                  key={href}
                  href={href}
                  scroll={pathname === "/" || !href.includes("#")}
                  onClick={(event) => {
                    if (
                      href !== "/" ||
                      pathname !== "/" ||
                      event.defaultPrevented ||
                      event.button !== 0 ||
                      event.metaKey ||
                      event.ctrlKey ||
                      event.shiftKey ||
                      event.altKey
                    )
                      return;
                    event.preventDefault();
                    if (window.location.search || window.location.hash)
                      window.history.pushState(null, "", "/");
                    window.scrollTo({ top: 0 });
                  }}
                  aria-current={
                    active
                      ? href.includes("#")
                        ? "location"
                        : "page"
                      : undefined
                  }
                  className={cn(
                    "inline-flex min-h-10 items-center whitespace-nowrap rounded-full px-2 text-sm font-medium hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring xl:px-3",
                    active
                      ? "bg-primary/10 font-semibold text-primary-action dark:text-primary"
                      : "text-muted-foreground",
                  )}
                >
                  {name}
                </SmartLink>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            {(pathname === "/shop" || pathname === "/catalog") && (
              <div ref={shopFiltersContainerRef} className="relative lg:hidden">
                <Button
                  variant={null}
                  size={null}
                  ref={shopFiltersButtonRef}
                  type="button"
                  aria-label="Search and filters"
                  aria-expanded={shopFiltersOpen}
                  aria-controls="shop-filters-popover-root"
                  title="Search and filters"
                  onClick={() => setShopFiltersOpen((open) => !open)}
                  className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {shopFiltersOpen ? (
                    <X className="size-5" aria-hidden="true" />
                  ) : (
                    <Search className="size-5" aria-hidden="true" />
                  )}
                </Button>
                <div
                  id="shop-filters-popover-root"
                  ref={(element) => setShopFiltersPopoverRoot(element)}
                  className="fixed left-1/2 top-[7.5rem] z-[60] w-[min(90vw,24rem)] -translate-x-1/2"
                />
              </div>
            )}
            <CartDrawer />
            {displayUser ? (
              <UserNav user={displayUser} showHelp />
            ) : (
              <div className="flex shrink-0 items-center gap-1">
                <SmartLink
                  href="/login"
                  className="inline-flex min-h-10 items-center rounded-md px-2 text-sm font-medium hover:bg-accent"
                >
                  Sign in
                </SmartLink>
                <SmartLink
                  href="/register"
                  className="inline-flex min-h-10 items-center rounded-md bg-primary-action px-3 text-sm font-medium text-primary-foreground hover:bg-primary-action-hover"
                >
                  Join us
                </SmartLink>
              </div>
            )}
          </div>
        </div>
      </header>

      <main
        id="storefront-content"
        className={cn(
          "min-h-[calc(100dvh-4rem)] w-full overflow-x-clip pb-[calc(9rem+env(safe-area-inset-bottom))] lg:pb-24",
          !hasPanoramicHero && "mx-auto max-w-7xl px-4 pt-6 sm:px-6 sm:pt-8",
        )}
      >
        <ShopFiltersProvider
          value={{
            open: shopFiltersOpen,
            popoverRoot: shopFiltersPopoverRoot,
          }}
        >
          {children}
        </ShopFiltersProvider>
      </main>
      <SupportChatLauncher />
      <StorefrontFooter
        businessInfo={businessInfo}
        branches={branches}
        canBook={canAccessStorefront && displayUser?.scope === "customer"}
      />
      <StorefrontMobileNavigation activeLink={activeLink} />
    </div>
  );
}
