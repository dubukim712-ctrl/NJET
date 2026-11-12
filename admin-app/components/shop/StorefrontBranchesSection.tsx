'use client';

import { useState } from 'react';
import { ExternalLink, MapPin, Navigation, Store } from 'lucide-react';
import { GoogleMapsEmbed } from '@/components/maps/GoogleMapsEmbed';
import { Button } from '@/components/ui/Button';
import {
  StorefrontBranchesQueryError,
  useStorefrontBranchesQuery,
} from '@/data/commerce/storefront-branches-client';

export function StorefrontBranchesSection() {
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const query = useStorefrontBranchesQuery();
  const branches = query.data ?? [];
  const selectedBranch =
    branches.find((branch) => branch.id === selectedBranchId) ?? branches[0];
  const locationQuery = selectedBranch
    ? selectedBranch.latitude !== null && selectedBranch.longitude !== null
      ? `${selectedBranch.latitude},${selectedBranch.longitude}`
      : selectedBranch.address
    : '';
  const mapUrl = locationQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationQuery)}`
    : null;
  const directionsUrl = locationQuery
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(locationQuery)}`
    : null;

  return (
    <section
      id="business-contact"
      className="scroll-mt-24 space-y-8 border-t pt-10 sm:space-y-10 sm:pt-14"
    >
      <header className="mx-auto max-w-2xl space-y-2 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Our locations
        </p>
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Visit us on our branch!
        </h2>
        <p className="text-sm leading-6 text-muted-foreground sm:text-base">
          Find the branch that works for you and see it on the map.
        </p>
      </header>

      {query.isPending ? (
        <div
          className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:gap-8"
          role="status"
          aria-label="Loading branch locations"
        >
          <div className="min-h-72 animate-pulse rounded-2xl border bg-muted/40" />
          <div className="min-h-72 animate-pulse rounded-2xl bg-muted/40 sm:min-h-96" />
        </div>
      ) : query.isError ? (
        <div className="rounded-2xl border bg-card px-5 py-8 text-center" role="alert">
          <p className="font-medium">
            {query.error instanceof StorefrontBranchesQueryError
              ? query.error.message
              : 'Branch locations are temporarily unavailable.'}
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={() => {
              void query.refetch();
            }}
          >
            Try again
          </Button>
        </div>
      ) : (
        <div className="grid min-w-0 gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:gap-8">
          <div className="min-w-0 rounded-2xl border bg-card p-5 sm:p-7">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xl font-semibold">Available branches</h3>
              <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {branches.length}
              </span>
            </div>
            {branches.length ? (
              <ul className="mt-5 flex w-full min-w-0 snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain pb-2 lg:block lg:space-y-3 lg:overflow-visible lg:pb-0 lg:snap-none">
                {branches.map((branch) => {
                  const isSelected = branch.id === selectedBranch?.id;
                  return (
                    <li
                      key={branch.id}
                      className="w-max max-w-[80vw] flex-none snap-start lg:w-auto lg:max-w-none"
                    >
                      <button
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => setSelectedBranchId(branch.id)}
                        className={`flex min-h-11 w-full min-w-0 items-center gap-2 rounded-full border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:min-h-20 lg:items-start lg:gap-3 lg:rounded-xl lg:p-4 ${
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : 'border-transparent bg-muted/40 hover:border-primary/30 hover:bg-muted/70'
                        }`}
                      >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary lg:size-10">
                          <Store className="size-4 lg:size-5" aria-hidden="true" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">{branch.name}</span>
                          <span className="mt-1 hidden items-start gap-1.5 text-sm leading-5 text-muted-foreground lg:flex">
                            <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                            <span className="break-words">
                              {branch.address || 'Address not provided'}
                            </span>
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-5 rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground">
                There are no active branches to show right now.
              </p>
            )}
          </div>

          <div className="relative isolate z-0 min-h-72 min-w-0 overflow-hidden rounded-2xl border bg-muted sm:min-h-96">
            {locationQuery ? (
              <GoogleMapsEmbed
                key={selectedBranch?.id}
                query={locationQuery}
                title={`Google Map for ${selectedBranch?.name ?? 'branch locations'}`}
                className="absolute inset-0 h-full w-full border-0"
              />
            ) : (
              <div className="flex min-h-72 items-center justify-center p-6 text-center sm:min-h-96">
                <div>
                  <MapPin className="mx-auto size-9 text-primary" aria-hidden="true" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    No active branch is available to show on the map.
                  </p>
                </div>
              </div>
            )}
            {selectedBranch && (
              <div className="absolute bottom-8 left-1/2 z-[1100] flex w-[calc(100%-3rem)] max-w-sm -translate-x-1/2 flex-col gap-1.5 rounded-xl bg-background/95 p-2 shadow-lg backdrop-blur sm:bottom-10 sm:max-w-lg sm:flex-row sm:items-center sm:justify-between md:max-w-2xl md:gap-2 md:p-3">
                <div className="min-w-0">
                  <p className="hidden text-xs font-semibold uppercase tracking-wide text-muted-foreground md:block">
                    Selected branch
                  </p>
                  <p className="truncate text-sm font-semibold md:text-base">
                    {selectedBranch.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {selectedBranch.address ||
                      (selectedBranch.latitude === null
                        ? 'Map location not pinned yet'
                        : 'Location pinned')}
                  </p>
                </div>
                {mapUrl && directionsUrl && (
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
                    <Button
                      asChild
                      size="sm"
                      className="gap-1.5 px-2.5 text-xs md:h-10 md:gap-2 md:px-3 md:text-sm"
                    >
                      <a
                        href={directionsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Get directions to ${selectedBranch.name}`}
                      >
                        Directions
                        <Navigation className="size-4" aria-hidden="true" />
                      </a>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="gap-1.5 px-2.5 text-xs md:h-10 md:gap-2 md:px-3 md:text-sm"
                    >
                      <a
                        href={mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span className="hidden sm:inline">Open in Google Maps</span>
                        <span className="sm:hidden">Open map</span>
                        <ExternalLink className="size-4" aria-hidden="true" />
                      </a>
                    </Button>
                  </div>
                )}
              </div>
            )}
            {!selectedBranch && (
              <p className="absolute inset-x-3 bottom-8 z-[1100] rounded-xl bg-background/95 p-4 text-sm text-muted-foreground shadow-lg sm:inset-x-4 sm:bottom-10">
                No active branches are available right now.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
