'use server';

import { z } from 'zod';

const API_BASE_URL = 'https://psgc.gitlab.io/api';
const locationCodeSchema = z.string().regex(/^\d{9}$/);
const locationOptionsSchema = z
  .array(z.object({ code: locationCodeSchema, name: z.string().trim().min(1).max(120) }))
  .max(1000);
const reverseAddressSchema = z.object({
  address: z.object({
    country_code: z.string().optional(),
    state: z.string().trim().max(120).optional(),
    province: z.string().trim().max(120).optional(),
    region: z.string().trim().max(120).optional(),
    city: z.string().trim().max(120).optional(),
    town: z.string().trim().max(120).optional(),
    municipality: z.string().trim().max(120).optional(),
    county: z.string().trim().max(120).optional(),
    barangay: z.string().trim().max(120).optional(),
    neighbourhood: z.string().trim().max(120).optional(),
    quarter: z.string().trim().max(120).optional(),
    suburb: z.string().trim().max(120).optional(),
    village: z.string().trim().max(120).optional(),
    city_district: z.string().trim().max(120).optional(),
    postcode: z.string().trim().max(20).optional(),
  }).passthrough(),
});

export type PhilippineLocationOption = {
  code: string;
  name: string;
};

type LocationResult =
  | { success: true; data: PhilippineLocationOption[] }
  | { success: false; error: string };

export type PhilippineReverseGeocode = {
  provinceCandidates: string[];
  cityCandidates: string[];
  barangayCandidates: string[];
  postalCode: string;
};

type ReverseGeocodeResult =
  | { success: true; data: PhilippineReverseGeocode }
  | { success: false; error: string };

async function fetchLocations(
  path: string,
  failureMessage: string
): Promise<LocationResult> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      next: { revalidate: 86400 },
    });
    if (!response.ok) {
      throw new Error(`PSGC request failed with status ${response.status}.`);
    }

    const parsed = locationOptionsSchema.safeParse(await response.json());
    if (!parsed.success) {
      throw new Error(`PSGC response did not match the location contract: ${parsed.error.message}`);
    }
    return {
      success: true,
      data: parsed.data.sort((first, second) => first.name.localeCompare(second.name)),
    };
  } catch (error) {
    console.error(failureMessage, error);
    return { success: false, error: 'Locations could not be loaded. Check your connection and retry.' };
  }
}

export async function getPhilippineProvincesAction(): Promise<LocationResult> {
  const result = await fetchLocations('/provinces/', 'Could not load Philippine provinces.');
  if (!result.success) return result;
  return {
    success: true,
    data: [
      ...result.data.filter((province) => province.code !== '130000000'),
      { code: '130000000', name: 'Metro Manila (NCR)' },
    ].sort((first, second) => first.name.localeCompare(second.name)),
  };
}

export async function getPhilippineCitiesAction(
  provinceCode: unknown
): Promise<LocationResult> {
  const parsedCode = locationCodeSchema.safeParse(provinceCode);
  if (!parsedCode.success) {
    return { success: false, error: 'Choose a valid province.' };
  }
  const path = parsedCode.data === '130000000'
    ? '/regions/130000000/cities-municipalities/'
    : `/provinces/${parsedCode.data}/cities-municipalities/`;
  return fetchLocations(path, 'Could not load cities and municipalities.');
}

export async function getPhilippineBarangaysAction(
  cityCode: unknown
): Promise<LocationResult> {
  const parsedCode = locationCodeSchema.safeParse(cityCode);
  if (!parsedCode.success) {
    return { success: false, error: 'Choose a valid city or municipality.' };
  }
  return fetchLocations(
    `/cities-municipalities/${parsedCode.data}/barangays/`,
    'Could not load barangays.'
  );
}

export async function reverseGeocodePhilippineLocationAction(
  latitude: unknown,
  longitude: unknown
): Promise<ReverseGeocodeResult> {
  const coordinates = z.object({
    latitude: z.number().finite().min(4.5).max(21.5),
    longitude: z.number().finite().min(116).max(127),
  }).safeParse({ latitude, longitude });
  if (!coordinates.success) {
    return { success: false, error: 'Your location must be within the Philippines.' };
  }

  const query = new URLSearchParams({
    format: 'jsonv2',
    lat: String(coordinates.data.latitude),
    lon: String(coordinates.data.longitude),
    zoom: '18',
    addressdetails: '1',
  });
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?${query}`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'NJET Commerce Address Autofill',
        },
        next: { revalidate: 86400 },
        signal: AbortSignal.timeout(10000),
      }
    );
    if (!response.ok) {
      throw new Error(`OpenStreetMap request failed with status ${response.status}.`);
    }

    const parsed = reverseAddressSchema.safeParse(await response.json());
    if (!parsed.success) {
      throw new Error(`OpenStreetMap response did not match the address contract: ${parsed.error.message}`);
    }
    const { address } = parsed.data;
    if (address.country_code?.toLowerCase() !== 'ph') {
      return { success: false, error: 'The current location could not be matched to a Philippine address.' };
    }

    const candidates = (...values: (string | undefined)[]) =>
      values.filter((value): value is string => Boolean(value));
    return {
      success: true,
      data: {
        provinceCandidates: candidates(address.state, address.province, address.region),
        cityCandidates: candidates(
          address.city,
          address.town,
          address.municipality,
          address.county
        ),
        barangayCandidates: candidates(
          address.barangay,
          address.neighbourhood,
          address.quarter,
          address.suburb,
          address.village,
          address.city_district
        ),
        postalCode: address.postcode ?? '',
      },
    };
  } catch {
    console.error('Could not look up the current Philippine address.');
    return {
      success: false,
      error: 'Could not look up your location. Check your connection and try again.',
    };
  }
}
