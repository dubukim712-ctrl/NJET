'use client';

import { useState } from 'react';
import { LocateFixed, LoaderCircle } from 'lucide-react';
import {
  getPhilippineBarangaysAction,
  getPhilippineCitiesAction,
  reverseGeocodePhilippineLocationAction,
  type PhilippineLocationOption,
} from '@/data/actions/philippine-locations';
import type { SearchableSelectOption } from '@/components/ui/SearchableSelect';

type AutofilledAddress = {
  provinceCode: string;
  province: string;
  cityCode: string;
  city: string;
  barangayCode: string;
  barangay: string;
  postalCode: string;
  cities: SearchableSelectOption[];
  barangays: SearchableSelectOption[];
};

function toOptions(locations: PhilippineLocationOption[]): SearchableSelectOption[] {
  return locations.map(({ code, name }) => ({ value: code, label: name }));
}

function normalizeName(value: string): string {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\([^)]*\)/g, ' ')
    .trim()
    .toLocaleLowerCase()
    .replace(/^(province|city|municipality|town) of /, '')
    .replace(/ (city|municipality|town)$/, '')
    .replace(/[^a-z0-9]/g, '');
  return ['ncr', 'metromanila', 'nationalcapitalregion'].includes(normalized)
    ? 'ncr'
    : normalized;
}

function matchOption(
  options: SearchableSelectOption[],
  candidates: string[]
): SearchableSelectOption | undefined {
  for (const candidate of candidates) {
    const normalized = normalizeName(candidate);
    const match = options.find((option) => normalizeName(option.label) === normalized);
    if (match) return match;
  }
}

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      resolve,
      (error) => {
        const message = error.code === error.PERMISSION_DENIED
          ? 'Location permission was denied. Allow access in your browser settings or enter the address manually.'
          : error.code === error.TIMEOUT
            ? 'The location request timed out. Try again or enter the address manually.'
            : 'Your current location is unavailable. Try again or enter the address manually.';
        reject(new Error(message));
      },
      { enableHighAccuracy: false, maximumAge: 60000, timeout: 10000 }
    );
  });
}

export function PhilippineAddressAutofill({
  provinces,
  disabled,
  onAddressFound,
}: {
  provinces: SearchableSelectOption[];
  disabled: boolean;
  onAddressFound: (address: AutofilledAddress) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'error' | 'success';
    message: string;
  } | null>(null);

  const findAddress = async () => {
    if (!navigator.geolocation) {
      setFeedback({
        type: 'error',
        message: 'This browser does not support location access. Enter the address manually.',
      });
      return;
    }
    if (!window.isSecureContext) {
      setFeedback({
        type: 'error',
        message: 'Current location requires a secure connection. Enter the address manually.',
      });
      return;
    }

    setLoading(true);
    setFeedback(null);
    try {
      const position = await getCurrentPosition();
      const lookup = await reverseGeocodePhilippineLocationAction(
        position.coords.latitude,
        position.coords.longitude
      );
      if (!lookup.success) {
        setFeedback({ type: 'error', message: lookup.error });
        return;
      }

      const province = matchOption(provinces, lookup.data.provinceCandidates);
      if (!province) {
        setFeedback({
          type: 'error',
          message: 'Could not match the detected province. Please select your address manually.',
        });
        return;
      }

      const cityResult = await getPhilippineCitiesAction(province.value);
      if (!cityResult.success) {
        setFeedback({ type: 'error', message: cityResult.error });
        return;
      }
      const cities = toOptions(cityResult.data);
      const city = matchOption(cities, lookup.data.cityCandidates);
      if (!city) {
        setFeedback({
          type: 'error',
          message: 'Could not match the detected city or municipality. Please select your address manually.',
        });
        return;
      }

      const barangayResult = await getPhilippineBarangaysAction(city.value);
      const barangays = barangayResult.success ? toOptions(barangayResult.data) : [];
      const barangay = matchOption(barangays, lookup.data.barangayCandidates);
      onAddressFound({
        provinceCode: province.value,
        province: province.label,
        cityCode: city.value,
        city: city.label,
        barangayCode: barangay?.value ?? '',
        barangay: barangay?.label ?? '',
        postalCode: lookup.data.postalCode,
        cities,
        barangays,
      });

      const message = !barangay
        ? barangayResult.success
          ? 'Province and city found. Select your barangay and verify the postal code.'
          : 'Province and city found. Barangays could not be loaded; retry or select one manually.'
        : !lookup.data.postalCode
          ? 'Address found. A postal code was not available; enter it manually if known.'
          : 'Address filled. Please verify it before continuing.';
      setFeedback({ type: 'success', message });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error
          ? error.message
          : 'Could not look up your location. Try again or enter the address manually.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2 md:flex md:flex-col md:items-end md:text-right">
      <button
        type="button"
        onClick={findAddress}
        disabled={disabled || loading || provinces.length === 0}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading
          ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          : <LocateFixed className="size-4" aria-hidden="true" />}
        {loading ? 'Finding your location…' : 'Use current location'}
      </button>
      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer">About location lookup</summary>
        <p className="mt-1">
          Your coordinates are sent to OpenStreetMap; results may need review.
          {' '}© <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >OpenStreetMap contributors</a>.
        </p>
      </details>
      {feedback && (
        <p
          className={`text-sm ${feedback.type === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}
          role={feedback.type === 'error' ? 'alert' : 'status'}
        >
          {feedback.message}
        </p>
      )}
    </div>
  );
}
