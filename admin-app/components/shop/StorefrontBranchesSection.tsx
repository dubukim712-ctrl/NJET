import Link from 'next/link';
import { Clock3, MapPin, Navigation } from 'lucide-react';
import type { StorefrontBranchLocation } from '@/lib/validations/storefront-branches';
import { serviceBookingPath, serviceSignInPath } from '@/lib/storefront-service';

export function StorefrontBranchesSection({ branches, hours, canBook }: {
  branches: StorefrontBranchLocation[] | null;
  hours: string | undefined;
  canBook: boolean;
}) {
  const locations = [...(branches ?? [])].sort((a, b) =>
    Number(/hillsview/i.test(b.name + b.address)) - Number(/hillsview/i.test(a.name + a.address)));
  return (
    <section id="business-contact" className="scroll-mt-32 border-t pt-8 sm:pt-12">
      <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Visit us on our branch!</h2>
      {locations.length ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {locations.map((branch) => {
            const location = branch.latitude !== null && branch.longitude !== null
              ? `${branch.latitude},${branch.longitude}` : branch.address;
            return (
              <article key={branch.id} className="flex flex-col rounded-2xl border bg-card p-5">
                <h3 className="text-lg font-semibold">{branch.name}</h3>
                <p className="mt-3 flex gap-2 text-sm leading-6 text-muted-foreground"><MapPin className="mt-1 size-4 shrink-0 text-primary" aria-hidden="true" />{branch.address}</p>
                {hours && <p className="mt-2 flex gap-2 text-sm leading-6 text-muted-foreground"><Clock3 className="mt-1 size-4 shrink-0 text-primary" aria-hidden="true" /><span className="whitespace-pre-line"><span className="font-medium">Posted business hours</span><br />{hours}</span></p>}
                <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-4 text-sm font-semibold text-primary">
                  {location && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center hover:underline">Map</a>}
                  {location && <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location)}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-1.5 hover:underline"><Navigation className="size-4" aria-hidden="true" />Directions</a>}
                  <Link href="/shop" className="inline-flex min-h-10 items-center hover:underline">Explore Shop</Link>
                  <Link href={canBook ? serviceBookingPath : serviceSignInPath} className="inline-flex min-h-10 items-center hover:underline">{canBook ? 'Book Service' : 'Sign in to Book Service'}</Link>
                </div>
              </article>
            );
          })}
        </div>
      ) : <p className="mt-4 text-sm text-muted-foreground">{branches ? 'No active branches are listed.' : 'Branch locations are temporarily unavailable.'}</p>}
    </section>
  );
}
