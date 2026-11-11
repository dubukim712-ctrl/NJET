'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Home,
  LayoutDashboard,
  Package,
  ShoppingBag,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { UserNav } from '@/components/auth/UserNav';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import type { UserProfile } from '@/types/database';
import type { StorefrontBusinessInfo } from '@/data/commerce/system-settings';

interface StorefrontShellProps {
  user: UserProfile | null;
  businessInfo: StorefrontBusinessInfo | null;
  businessInfoError: string | null;
  children: React.ReactNode;
}

const NAVIGATION: {
  name: string;
  href: string;
  icon: LucideIcon;
}[] = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Shop', href: '/shop', icon: ShoppingBag },
  { name: 'Orders', href: '/dashboard/orders', icon: Package },
];

export function StorefrontShell({
  user,
  businessInfo,
  businessInfoError,
  children,
}: StorefrontShellProps) {
  const pathname = usePathname();
  const { user: clientUser } = useAuth();
  const displayUser = clientUser ?? user;
  const canAccessStorefront = hasPermission(
    displayUser,
    PERMISSIONS.storefrontAccess
  );
  const navigationItems = [
    NAVIGATION[0],
    ...(canAccessStorefront
      ? [
          { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
          NAVIGATION[2],
        ]
      : []),
    NAVIGATION[1],
  ];

  const navigation = (mobile = false) => (
    <nav
      aria-label="Storefront navigation"
      className={cn(
        'flex items-center',
        mobile ? 'w-full justify-around' : 'gap-1'
      )}
    >
      {navigationItems.map((item) => {
        const href = item.href;
        const active =
          item.name === 'Home'
            ? pathname === '/'
            : item.name === 'Dashboard'
              ? pathname === '/dashboard'
              : item.name === 'Shop'
                ? pathname.startsWith('/shop')
                : pathname.startsWith('/dashboard/orders');

        return (
          <Link
            key={item.name}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              mobile
                ? 'flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-xs font-medium'
                : 'inline-flex min-h-10 items-center justify-center gap-2 rounded-full px-3 text-sm font-medium transition-colors sm:px-4',
              active
                ? 'text-primary'
                : 'text-muted-foreground hover:text-accent-foreground',
              !mobile && active && 'bg-primary/10',
              mobile && active && 'bg-primary/5'
            )}
          >
            <item.icon
              className={mobile ? 'h-5 w-5' : 'h-4 w-4'}
              aria-hidden="true"
            />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-dvh bg-background pb-[calc(4rem+env(safe-area-inset-bottom))] sm:pb-0">
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
            <span className="truncate">{businessInfo?.businessName || 'NJET'}</span>
          </Link>

          <div className="hidden sm:block">{navigation()}</div>
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
      <footer
        id="business-contact"
        className="scroll-mt-20 border-t bg-card/40"
      >
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
          <section>
            <h2 className="font-semibold">{businessInfo?.businessName || 'NJET'}</h2>
            <p
              className="mt-2 text-sm text-muted-foreground"
              role={businessInfoError ? 'status' : undefined}
            >
              {businessInfoError
                ? 'Business contact information is temporarily unavailable.'
                : businessInfo?.phone || businessInfo?.email || businessInfo?.address || businessInfo?.businessHours
                  ? 'Get in touch with our team.'
                  : 'Business contact details have not been added yet.'}
            </p>
          </section>
          <address className="space-y-2 text-sm not-italic">
            {businessInfo?.phone && (
              <p>
                <span className="font-medium">Phone: </span>
                <a className="underline underline-offset-4" href={`tel:${businessInfo.phone.replace(/[^+0-9]/g, '')}`}>
                  {businessInfo.phone}
                </a>
              </p>
            )}
            {businessInfo?.email && (
              <p>
                <span className="font-medium">Email: </span>
                <a className="break-all underline underline-offset-4" href={`mailto:${businessInfo.email}`}>
                  {businessInfo.email}
                </a>
              </p>
            )}
            {businessInfo?.address && (
              <p><span className="font-medium">Address: </span>{businessInfo.address}</p>
            )}
          </address>
          {businessInfo?.businessHours && (
            <section>
              <h2 className="text-sm font-semibold">Business hours</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {businessInfo.businessHours}
              </p>
            </section>
          )}
        </div>
      </footer>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-lg justify-around">
          {navigation(true)}
        </div>
      </div>
    </div>
  );
}
