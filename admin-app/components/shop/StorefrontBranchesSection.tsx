'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowUpRight, Clock3, MapPin, Navigation } from 'lucide-react';
import { GoogleMapsEmbed } from '@/components/maps/GoogleMapsEmbed';
import { Button } from '@/components/ui/Button';
import { defaultBusinessHours, orderStorefrontBranches } from '@/lib/storefront-branches';
import type { StorefrontBranchLocation } from '@/lib/validations/storefront-branches';
import { serviceBookingPath, serviceSignInPath } from '@/lib/storefront-service';

export function StorefrontBranchesSection({ branches, hours, canBook }: {
  branches: StorefrontBranchLocation[] | null;
  hours: string | undefined;
  canBook: boolean;
}) {
  const searchParams = useSearchParams();
  const locations = orderStorefrontBranches(branches ?? []);
  const selected = locations.find(({ id }) => id === searchParams.get('branch')) ?? locations[0];
  const location = selected && (selected.latitude !== null && selected.longitude !== null
    ? `${selected.latitude},${selected.longitude}`
    : selected.address.trim());
  const mapQuery = selected ? encodeURIComponent(location || `${selected.name}, Cavite`) : '';

  function selectBranch(id: string) {
    const url = new URL(window.location.href);
    url.searchParams.set('branch', id);
    window.history.replaceState(null, '', url);
  }

  return (
    <section id="branches" aria-labelledby="branch-finder-title" className="scroll-mt-32 border-t pt-8 sm:pt-12">
      <h2 id="branch-finder-title" className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Visit us on our branch!
      </h2>
      {selected ? (
        <div className="mt-6 grid gap-5 lg:grid-cols-2 lg:gap-8">
          <div className="flex min-w-0 flex-col gap-3 lg:col-start-2 lg:row-start-1">
            <div role="group" aria-label="Choose an NJET branch" className="flex max-h-44 flex-col gap-2 overflow-y-auto overscroll-y-contain p-1 md:max-h-none md:flex-row md:flex-wrap md:overflow-visible">
              {locations.map((branch) => (
                <Button key={branch.id} type="button" size={null}
                  variant={branch.id === selected.id ? 'default' : 'outline'}
                  aria-pressed={branch.id === selected.id}
                  onClick={() => selectBranch(branch.id)}
                  className="min-h-11 shrink-0 justify-start whitespace-normal rounded-full px-4 py-2 text-left md:justify-center"
                >
                  {branch.name}
                </Button>
              ))}
            </div>
            <article aria-labelledby="selected-branch-name" className="flex flex-1 flex-col rounded-2xl border bg-card p-5 text-card-foreground sm:p-7">
              <h3 id="selected-branch-name" className="text-xl font-semibold sm:text-2xl">{selected.name}</h3>
              <address className="mt-4 flex gap-2 text-sm leading-6 text-muted-foreground not-italic">
                <MapPin className="mt-1 size-4 shrink-0 text-primary" aria-hidden="true" />
                {selected.address.trim() || 'Street address unavailable'}
              </address>
              <p className="mt-3 flex gap-2 text-sm leading-6 text-muted-foreground">
                <Clock3 className="mt-1 size-4 shrink-0 text-primary" aria-hidden="true" />
                <span><strong className="block font-medium text-foreground">Posted business hours</strong>{hours?.trim() || defaultBusinessHours}</span>
              </p>
              <div className="mt-auto grid grid-cols-2 gap-2 pt-6">
                <Button asChild variant="outline" className="min-h-11 w-full gap-1 whitespace-normal px-2 text-center sm:gap-2">
                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${mapQuery}`} target="_blank" rel="noopener noreferrer">
                    <Navigation className="size-4" aria-hidden="true" /> Map Directions
                  </a>
                </Button>
                <Button asChild variant="outline" className="min-h-11 w-full whitespace-normal px-2"><Link href="/shop">Explore Shop</Link></Button>
                <Button asChild className="col-span-2 min-h-11 w-full whitespace-normal">
                  <Link href={canBook ? serviceBookingPath : serviceSignInPath}>{canBook ? 'Book a Service' : 'Sign in to Book Service'}</Link>
                </Button>
              </div>
            </article>
          </div>
          <div className="flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-card lg:col-start-1 lg:row-start-1">
            {location ? (
              <GoogleMapsEmbed query={location} title={`Map of ${selected.name}`} className="h-64 w-full flex-1 border-0 sm:min-h-72" />
            ) : (
              <div className="grid min-h-48 flex-1 place-content-center gap-2 bg-muted p-5 text-center text-sm text-muted-foreground">
                <MapPin className="mx-auto size-6 text-primary" aria-hidden="true" />
                Search for {selected.name} on Google Maps.
              </div>
            )}
            <div className="border-t p-3 sm:p-4">
              <Button asChild className="min-h-11 w-full gap-2 sm:w-auto">
                <a href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`} target="_blank" rel="noopener noreferrer">
                  Open in Google Maps <ArrowUpRight className="size-4" aria-hidden="true" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      ) : <p className="mt-4 text-sm text-muted-foreground">{branches ? 'No active branches are listed.' : 'Branch locations are temporarily unavailable.'}</p>}
    </section>
  );
}
