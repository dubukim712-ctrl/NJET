import { z } from 'zod';

const searchQuerySchema = z.string().trim().min(2).max(200);
const coordinateSchema = (minimum: number, maximum: number) =>
  z
    .string()
    .regex(/^-?(?:\d+\.?\d*|\.\d+)$/)
    .transform(Number)
    .pipe(z.number().finite().min(minimum).max(maximum));

const nominatimResultsSchema = z.array(
  z.object({
    display_name: z.string().min(1).max(500),
    lat: coordinateSchema(-90, 90),
    lon: coordinateSchema(-180, 180),
  })
).max(5);
  const reverseCoordinatesSchema = z.object({
    latitude: z.number().finite().min(-90).max(90),
    longitude: z.number().finite().min(-180).max(180),
  });
  const nominatimAddressSchema = z.object({
    display_name: z.string().trim().min(1).max(500),
  });

export type LocationSearchResult = {
  displayName: string;
  latitude: number;
  longitude: number;
};

export async function searchBranchLocations(
  query: string,
  signal?: AbortSignal
): Promise<LocationSearchResult[]> {
  const parsedQuery = searchQuerySchema.safeParse(query);
  if (!parsedQuery.success) {
    throw new Error('Search text must be between 2 and 200 characters.');
  }

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '5');
  url.searchParams.set('q', parsedQuery.data);

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal,
  });
  if (!response.ok) {
    throw new Error(`Location search failed with status ${response.status}.`);
  }

  const parsedResults = nominatimResultsSchema.safeParse(await response.json());
  if (!parsedResults.success) {
    throw new Error('Location search returned invalid results.');
  }

  return parsedResults.data.map((result) => ({
    displayName: result.display_name,
    latitude: result.lat,
    longitude: result.lon,
  }));
}

export async function getBranchAddressFromLocation(
  latitude: number,
  longitude: number,
  signal?: AbortSignal
): Promise<string> {
  const parsedCoordinates = reverseCoordinatesSchema.safeParse({
    latitude,
    longitude,
  });
  if (!parsedCoordinates.success) {
    throw new Error('The selected map location is invalid.');
  }

  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('lat', String(parsedCoordinates.data.latitude));
  url.searchParams.set('lon', String(parsedCoordinates.data.longitude));

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal,
  });
  if (!response.ok) {
    throw new Error(`Address lookup failed with status ${response.status}.`);
  }

  const parsedAddress = nominatimAddressSchema.safeParse(await response.json());
  if (!parsedAddress.success) {
    throw new Error('No address was found for the selected map location.');
  }

  return parsedAddress.data.display_name;
}
