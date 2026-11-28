'use client';

import { SmartLink } from "@/components/ui/SmartLink";
import { usePathname } from 'next/navigation';
import { CalendarDays, House, MapPin, ShoppingBag, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const tabs = [
  { label: 'Home', href: '/', icon: House },
  { label: 'Catalog', href: '/catalog', icon: ShoppingBag },
  { label: 'Installments', href: '/#installments', icon: CalendarDays },
  { label: 'Service', href: '/#services', icon: Wrench },
  { label: 'Branches', href: '/#branches', icon: MapPin },
] as const;

export function StorefrontMobileNavigation({ activeLink }: { activeLink: string | null }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Mobile storefront navigation" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur lg:hidden">
      {tabs.map(({ label, href, icon: Icon }) => {
        const active = href === activeLink;
        return (
          <Button
            key={href}
            asChild
            variant={null}
            size={null}
            className={cn(
              'mx-0.5 my-1 h-14 min-w-0 flex-col gap-1 rounded-lg px-0.5 text-[10px] font-medium leading-tight whitespace-nowrap focus-visible:ring-inset',
              active ? 'bg-primary/10 font-semibold text-primary-action dark:text-primary' : 'text-muted-foreground',
            )}
          >
            <SmartLink href={href} scroll={pathname === '/' || !href.includes('#')} aria-current={active ? (href.includes('#') ? 'location' : 'page') : undefined} onClick={(event) => {
              if (href !== '/' || pathname !== '/' || event.defaultPrevented || event.button !== 0
                || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              event.preventDefault();
              if (window.location.search || window.location.hash) window.history.pushState(null, '', '/');
              window.scrollTo({ top: 0 });
            }}>
              <Icon className="size-5" strokeWidth={active ? 2.75 : 2} aria-hidden="true" />
              {label}
            </SmartLink>
          </Button>
        );
      })}
    </nav>
  );
}
