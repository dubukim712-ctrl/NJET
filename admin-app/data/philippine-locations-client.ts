'use client';

import { queryOptions, useQuery } from '@tanstack/react-query';
import {
  getPhilippineBarangaysAction,
  getPhilippineCitiesAction,
  getPhilippineProvincesAction,
  reverseGeocodePhilippineLocationAction,
} from '@/data/actions/philippine-locations';

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

const STALE_TIME = 24 * 60 * 60 * 1000;

function getActionData<T>(result: ActionResult<T>): T {
  if (!result.success) throw new Error(result.error);
  return result.data;
}

export function philippineProvincesQueryOptions() {
  return queryOptions({
    queryKey: ['philippine-locations', 'provinces'],
    queryFn: async () => getActionData(await getPhilippineProvincesAction()),
    staleTime: STALE_TIME,
    retry: false,
  });
}

export function philippineCitiesQueryOptions(provinceCode: string) {
  return queryOptions({
    queryKey: ['philippine-locations', 'cities', provinceCode],
    queryFn: async () =>
      getActionData(await getPhilippineCitiesAction(provinceCode)),
    staleTime: STALE_TIME,
    retry: false,
  });
}

export function philippineBarangaysQueryOptions(cityCode: string) {
  return queryOptions({
    queryKey: ['philippine-locations', 'barangays', cityCode],
    queryFn: async () =>
      getActionData(await getPhilippineBarangaysAction(cityCode)),
    staleTime: STALE_TIME,
    retry: false,
  });
}

export function philippineReverseGeocodeQueryOptions(
  latitude: number,
  longitude: number
) {
  return queryOptions({
    queryKey: ['philippine-locations', 'reverse-geocode', latitude, longitude],
    queryFn: async () =>
      getActionData(
        await reverseGeocodePhilippineLocationAction(latitude, longitude)
      ),
    staleTime: STALE_TIME,
    retry: false,
  });
}

export function usePhilippineProvincesQuery() {
  return useQuery(philippineProvincesQueryOptions());
}

export function usePhilippineCitiesQuery(provinceCode: string) {
  return useQuery({
    ...philippineCitiesQueryOptions(provinceCode),
    enabled: Boolean(provinceCode),
  });
}

export function usePhilippineBarangaysQuery(cityCode: string) {
  return useQuery({
    ...philippineBarangaysQueryOptions(cityCode),
    enabled: Boolean(cityCode),
  });
}
