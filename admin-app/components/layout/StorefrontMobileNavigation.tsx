'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Ellipsis, House, MapPin, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { serviceBookingPath, serviceSignInPath } from '@/lib/storefront-service';
import { cn } from '@/lib/utils';

const tabs = [
  { id: 'home', label: 'Home', href: '/', icon: House },
  { id: 'shop', label: 'Catalog', href: '/shop', icon: ShoppingBag },
  { id: 'branches', label: 'Branches', href: '/#branches', icon: MapPin },
] as const;

function subscribeToHash(listener: () => void) {
  window.addEventListener('hashchange', listener);
  window.addEventListener('popstate', listener);
  // App Router hash links can scroll after updating history without a hashchange event.
  window.addEventListener('scroll', listener, { passive: true });
  return () => {
    window.removeEventListener('hashchange', listener);
    window.removeEventListener('popstate', listener);
    window.removeEventListener('scroll', listener);
  };
}

const tabClass = (active: boolean) => cn(
  'h-16 min-w-0 flex-col gap-1 rounded-none px-1 text-xs',
  active ? 'bg-primary/10 font-semibold text-primary' : 'text-muted-foreground',
);

export function StorefrontMobileNavigation({ signedIn, canBook }: { signedIn: boolean; canBook: boolean }) {
  const pathname = usePathname();
  const hash = useSyncExternalStore(subscribeToHash, () => window.location.hash, () => '');
  const [open, setOpen] = useState(false);
  const [visibleBranchPage, setVisibleBranchPage] = useState<string | null>(null);
  const home = pathname === '/';

  useEffect(() => {
    if (!home) return;
    const section = document.getElementById('branches');
    if (!section) return;
    const observer = new IntersectionObserver(([entry]) => {
      setVisibleBranchPage(entry?.isIntersecting ? pathname : null);
    }, { rootMargin: '-20% 0px -35% 0px' });
    observer.observe(section);
    return () => observer.disconnect();
  }, [home, pathname]);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 48rem)');
    const closeOnDesktop = () => { if (desktop.matches) setOpen(false); };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, []);

  let active = 'more';
  if (!open) {
    if (pathname === '/shop' || pathname.startsWith('/shop/')) active = 'shop';
    else if (home && (hash === '#branches' || visibleBranchPage === pathname)) active = 'branches';
    else if (home && hash !== '#service-center' && hash !== '#installments') active = 'home';
  }

  const moreLinks = [
    { label: 'Parts & Service', href: '/#service-center' },
    { label: 'Installments', href: '/#installments' },
    { label: canBook ? 'Book Service' : 'Sign in to Book Service', href: canBook ? serviceBookingPath : serviceSignInPath },
    ...(signedIn ? [{ label: 'My account', href: '/dashboard/profile' }]
      : [{ label: 'Sign in', href: '/login' }, { label: 'Join', href: '/register' }]),
    { label: 'Chat with us', href: '/chat' },
  ];

  return (
    <>
      <nav aria-label="Mobile storefront navigation" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur md:hidden">
        {tabs.map(({ id, label, href, icon: Icon }) => (
          <Button key={id} asChild variant={null} size={null} className={tabClass(active === id)}>
            <Link href={href} aria-current={active === id ? 'page' : undefined} onClick={(event) => {
              if (id !== 'home' || !home || event.defaultPrevented || event.button !== 0
                || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              event.preventDefault();
              if (window.location.search || window.location.hash) window.history.pushState(null, '', '/');
              window.scrollTo({ top: 0 });
            }}>
              <Icon className="size-5" strokeWidth={active === id ? 2.75 : 2} aria-hidden="true" />
              {label}
            </Link>
          </Button>
        ))}
        <Button type="button" variant={null} size={null} className={tabClass(active === 'more')}
          aria-haspopup="dialog" aria-expanded={open} aria-current={active === 'more' ? 'page' : undefined}
          onClick={() => setOpen(true)}
        >
          <Ellipsis className="size-5" strokeWidth={active === 'more' ? 2.75 : 2} aria-hidden="true" />
          More
        </Button>
      </nav>
      <Modal open={open} title="More" placement="bottom" onClose={() => setOpen(false)}>
        <nav aria-label="More storefront links" className="grid gap-1">
          {moreLinks.map(({ href, label }) => (
            <Button key={href} asChild variant="ghost" className="min-h-11 justify-start">
              <Link href={href} onClick={() => setOpen(false)} prefetch={href === '/chat' ? false : undefined}>{label}</Link>
            </Button>
          ))}
        </nav>
      </Modal>
    </>
  );
}
