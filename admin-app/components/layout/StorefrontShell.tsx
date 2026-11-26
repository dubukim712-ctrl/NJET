"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { UserNav } from "@/components/auth/UserNav";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { SupportChatLauncher } from '@/components/support-chat/SupportChatLauncher';
import { StorefrontFooter } from "@/components/layout/StorefrontFooter";
import { ShopFiltersProvider } from "@/components/shop/ShopFiltersContext";
import { Button } from '@/components/ui/Button';
import { StorefrontMobileNavigation } from '@/components/layout/StorefrontMobileNavigation';
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
  { name: "Catalog", href: "/shop" },
  { name: "Parts & Service", href: "/#service-center" },
  { name: "Installments", href: "/#installments" },
  { name: "Branches", href: "/#branches" },
];

export function StorefrontShell({ user, children, businessInfo, branches }: StorefrontShellProps) {
  const pathname = usePathname();
  const hasPanoramicHero = pathname === '/' || pathname === '/dashboard';
  const router = useRouter();
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
    <div className="min-h-dvh bg-background pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
      <header className={cn("sticky top-0 z-40", hasPanoramicHero
        ? "bg-[#f5f6f2] dark:bg-background"
        : "border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80")}>
        <div className="bg-primary px-3 py-1.5 text-center text-[11px] leading-4 text-primary-foreground sm:text-xs">
          <strong>MEMBER PERKS:</strong> Sign in to book a service checkup, track orders &amp; view your Certificate of Ownership.
        </div>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:px-6">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-2 text-base font-semibold tracking-tight sm:text-lg"
          >
            {businessInfo?.logoUrl && (
              <Image
                src={businessInfo.logoUrl}
                alt=""
                width={36}
                height={36}
                unoptimized
                className="size-9 shrink-0 rounded-md object-contain"
              />
            )}
            <span className="hidden truncate sm:inline md:hidden lg:inline lg:max-w-40 xl:max-w-none">
              {businessInfo?.businessName || "NJET"}
            </span>
            <span className="sm:hidden md:inline lg:hidden">NJET</span>
          </Link>

          <nav aria-label="Storefront navigation" className="hidden items-center md:flex">
            {sectionLinks.map(({ name, href }) => {
              const active = href === '/' ? pathname === '/' : href === '/shop' && pathname.startsWith('/shop');
              return (
                <Link key={href} href={href} prefetch={false}
                  onPointerEnter={() => router.prefetch(href)}
                  onFocus={() => router.prefetch(href)}
                  aria-current={active ? 'page' : undefined}
                  className={cn('inline-flex min-h-10 items-center whitespace-nowrap rounded-full px-2 text-sm font-medium hover:text-primary xl:px-3',
                    active ? 'bg-primary/10 text-primary' : 'text-muted-foreground')}
                >
                  {name}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            {pathname === "/shop" && (
              <div ref={shopFiltersContainerRef} className="relative lg:hidden">
                <Button variant={null} size={null}
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
                <Link href="/login" className="inline-flex min-h-10 items-center rounded-md px-2 text-sm font-medium hover:bg-accent">
                  Sign in
                </Link>
                <Link href="/register" className="inline-flex min-h-10 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                  Join
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className={cn("min-h-[calc(100dvh-4rem)] pb-[calc(9rem+env(safe-area-inset-bottom))] lg:pb-24",
        !hasPanoramicHero && "mx-auto max-w-7xl px-4 pt-6 sm:px-6 sm:pt-8")}>
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
      <StorefrontFooter businessInfo={businessInfo} branches={branches} canBook={canAccessStorefront && displayUser?.scope === "customer"} />
      <StorefrontMobileNavigation signedIn={Boolean(displayUser)} canBook={canAccessStorefront && displayUser?.scope === "customer"} />
    </div>
  );
}
