"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Home, CalendarDays, Package, ShoppingBag, Search, X, Menu,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { UserNav } from "@/components/auth/UserNav";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { StorefrontFooter } from "@/components/layout/StorefrontFooter";
import { ShopFiltersProvider } from "@/components/shop/ShopFiltersContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/DropdownMenu";
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

const NAVIGATION: {
  name: string;
  href: string;
  icon: LucideIcon;
}[] = [
  { name: "Home", href: "/", icon: Home },
  { name: "E-Bikes", href: "/shop", icon: ShoppingBag },
  { name: "Orders", href: "/dashboard/orders", icon: Package },
  { name: "Appointments", href: "/dashboard/appointments", icon: CalendarDays },
];

const sectionLinks = [
  { name: "Parts & Service", href: "/#service-center" },
  { name: "Installments", href: "/#installments" },
  { name: "Branches", href: "/#business-contact" },
];

export function StorefrontShell({ user, children, businessInfo, branches }: StorefrontShellProps) {
  const pathname = usePathname();
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
      {(mobile ? navigationItems : NAVIGATION.slice(0, 2)).map((item) => {
        const href = item.href;
        const active =
          item.name === "Home"
            ? pathname === "/"
            : item.name === "E-Bikes"
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
                : "inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-full px-2 text-sm font-medium transition-colors xl:px-3",
              active
                ? "text-primary"
                : "text-muted-foreground hover:text-accent-foreground",
              !mobile && active && "bg-primary/10",
              mobile && active && "bg-primary/5",
            )}
          >
            <item.icon
              className={mobile ? "h-5 w-5" : "hidden"}
              aria-hidden="true"
            />
            {item.name}
          </Link>
        );
      })}
      {!mobile && sectionLinks.map(({ name, href }) => (
        <Link key={href} href={href} className="inline-flex min-h-10 items-center whitespace-nowrap px-2 text-sm font-medium text-muted-foreground hover:text-primary xl:px-3">{name}</Link>
      ))}
    </nav>
  );

  return (
    <div className="min-h-dvh bg-background pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="bg-primary px-3 py-1.5 text-center text-[11px] leading-4 text-primary-foreground sm:text-xs">
          <strong>MEMBER PERKS:</strong> Sign in to book a service checkup, track orders &amp; view your Certificate of Ownership.
        </div>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
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
            <span className="truncate lg:max-w-40 xl:max-w-none">
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
                </button>
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
              <div className="hidden items-center gap-1 sm:flex">
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" aria-label="Storefront menu" className="inline-flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-accent lg:hidden">
                  <Menu className="size-5" aria-hidden="true" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {[...NAVIGATION.slice(0, 2), ...sectionLinks].map(({ name, href }) => (
                  <DropdownMenuItem key={href} asChild><Link href={href} className="min-h-10">{name}</Link></DropdownMenuItem>
                ))}
                {!displayUser && (
                  <>
                    <DropdownMenuItem asChild><Link href="/login" className="min-h-10">Sign in</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link href="/register" className="min-h-10">Join</Link></DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="mx-auto min-h-[calc(100dvh-4rem)] max-w-7xl px-4 pt-6 pb-[calc(9rem+env(safe-area-inset-bottom))] sm:px-6 sm:pt-8 lg:pb-24">
        <ShopFiltersProvider
          value={{
            open: shopFiltersOpen,
            popoverRoot: shopFiltersPopoverRoot,
          }}
        >
          {children}
        </ShopFiltersProvider>
      </main>
      <StorefrontFooter businessInfo={businessInfo} branches={branches} canBook={canAccessStorefront && displayUser?.scope === "customer"} />
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-lg justify-around">
          {navigation(true)}
        </div>
      </div>
    </div>
  );
}
