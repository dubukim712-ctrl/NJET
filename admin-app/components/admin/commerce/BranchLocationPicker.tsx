'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { LatLngTuple } from 'leaflet';
import { Search } from 'lucide-react';
import {
  getBranchAddressFromLocation,
  searchBranchLocations,
  type LocationSearchResult,
} from '@/data/location-search';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import BranchCoordinateFields from '@/components/admin/commerce/BranchCoordinateFields';
import BranchLocationMap from '@/components/admin/commerce/BranchLocationMap';

function waitForNominatimSlot(
  lastRequestAt: { current: number },
  signal: AbortSignal
): Promise<void> {
  if (signal.aborted) {
    return Promise.reject(new DOMException('Request canceled.', 'AbortError'));
  }

  const delay = Math.max(0, 1000 - (Date.now() - lastRequestAt.current));
  if (delay === 0) {
    lastRequestAt.current = Date.now();
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', cancel);
      lastRequestAt.current = Date.now();
      resolve();
    }, delay);
    const cancel = () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', cancel);
      reject(new DOMException('Request canceled.', 'AbortError'));
    };
    signal.addEventListener('abort', cancel, { once: true });
  });
}

export default function BranchLocationPicker({
  latitude,
  longitude,
  onChange,
  onAddressChange,
  onAddressResolvingChange,
}: {
  latitude: number | null;
  longitude: number | null;
  onChange: (latitude: number | null, longitude: number | null) => void;
  onAddressChange: (address: string) => void;
  onAddressResolvingChange: (resolving: boolean) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocationSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [resolvingAddress, setResolvingAddress] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const reverseRequest = useRef<AbortController | null>(null);
  const reverseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRequestAt = useRef(0);
  const position = useMemo<LatLngTuple | null>(
    () => latitude !== null && longitude !== null ? [latitude, longitude] : null,
    [latitude, longitude]
  );

  useEffect(
    () => () => {
      request.current?.abort();
      if (reverseTimer.current) clearTimeout(reverseTimer.current);
      reverseRequest.current?.abort();
    },
    []
  );

  const cancelAddressLookup = () => {
    if (reverseTimer.current) clearTimeout(reverseTimer.current);
    reverseTimer.current = null;
    reverseRequest.current?.abort();
    reverseRequest.current = null;
    setResolvingAddress(false);
    onAddressResolvingChange(false);
  };

  const resolveAddress = (
    nextLatitude: number,
    nextLongitude: number,
    debounce = false
  ) => {
    cancelAddressLookup();
    const controller = new AbortController();
    reverseRequest.current = controller;
    setResolvingAddress(true);
    onAddressResolvingChange(true);
    onAddressChange('');
    setError(null);

    const lookup = async () => {
      reverseTimer.current = null;
      try {
        await waitForNominatimSlot(lastRequestAt, controller.signal);
        const address = await getBranchAddressFromLocation(
          nextLatitude,
          nextLongitude,
          controller.signal
        );
        if (!controller.signal.aborted) onAddressChange(address);
      } catch (reverseError) {
        if (!controller.signal.aborted) {
          console.error('Could not resolve the branch pin address.', reverseError);
          setError('Could not auto-fill this address. Enter it manually.');
        }
      } finally {
        if (reverseRequest.current === controller) {
          reverseRequest.current = null;
          setResolvingAddress(false);
          onAddressResolvingChange(false);
        }
      }
    };

    if (debounce) {
      reverseTimer.current = setTimeout(() => void lookup(), 600);
    } else {
      void lookup();
    }
  };

  const search = async () => {
    const searchTerm = query.trim();
    if (searchTerm.length < 2) {
      setError('Enter at least 2 characters to search.');
      return;
    }

    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setSearching(true);
    setSearched(false);
    setResults([]);
    setError(null);

    try {
      await waitForNominatimSlot(lastRequestAt, controller.signal);
      const locations = await searchBranchLocations(searchTerm, controller.signal);
      if (!controller.signal.aborted) {
        setResults(locations);
        setSearched(true);
      }
    } catch (searchError) {
      if (!controller.signal.aborted) {
        console.error('Could not search branch locations.', searchError);
        setError('Could not search locations. Check your connection and try again.');
      }
    } finally {
      if (request.current === controller) {
        request.current = null;
        setSearching(false);
      }
    }
  };

  const selectLocation = (location: LocationSearchResult) => {
    cancelAddressLookup();
    onChange(location.latitude, location.longitude);
    onAddressChange(location.displayName);
    setResults([]);
    setSearched(false);
    setError(null);
  };

  const placePin = (nextLatitude: number, nextLongitude: number) => {
    request.current?.abort();
    onChange(nextLatitude, nextLongitude);
    setResults([]);
    setSearched(false);
    resolveAddress(nextLatitude, nextLongitude);
  };

  const handleCoordinatesChange = (
    nextLatitude: number | null,
    nextLongitude: number | null
  ) => {
    if (nextLatitude === null || nextLongitude === null) {
      cancelAddressLookup();
      onChange(null, null);
      onAddressChange('');
      setError(null);
      return;
    }

    onChange(nextLatitude, nextLongitude);
    setResults([]);
    setSearched(false);
    resolveAddress(nextLatitude, nextLongitude, true);
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <Input
          id="branch-location-search"
          label="Find a location"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setError(null);
          }}
          disabled={searching || resolvingAddress}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void search();
            }
          }}
          placeholder="Search an address or place"
          maxLength={200}
          leadingIcon={<Search className="h-4 w-4" />}
        />
        <Button
          type="button"
          loading={searching}
          disabled={resolvingAddress}
          onClick={() => void search()}
        >
          Search map
        </Button>
      </div>

      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      {resolvingAddress && (
        <p className="text-sm text-muted-foreground" role="status">
          Finding the address for this pin...
        </p>
      )}
      {searched && results.length === 0 && !error && (
        <p className="text-sm text-muted-foreground" role="status">
          No locations found. Try a more specific search.
        </p>
      )}
      {results.length > 0 && (
        <ul className="max-h-48 divide-y overflow-y-auto rounded-md border bg-background">
          {results.map((result) => (
            <li key={`${result.latitude},${result.longitude}`}>
              <button
                type="button"
                onClick={() => selectLocation(result)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {result.displayName}
              </button>
            </li>
          ))}
        </ul>
      )}

      <BranchLocationMap position={position} onPick={placePin} />
      <BranchCoordinateFields
        latitude={latitude}
        longitude={longitude}
        onChange={handleCoordinatesChange}
      />
      {position ? (
        <p className="text-xs text-muted-foreground" role="status">
          Pinned location: {position[0].toFixed(6)}, {position[1].toFixed(6)}. Click the map to move the pin.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Choose a search result or click the map to pin this branch.
        </p>
      )}
    </div>
  );
}
