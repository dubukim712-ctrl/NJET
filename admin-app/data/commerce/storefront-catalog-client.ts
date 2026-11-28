'use client';

import type { CatalogData, ShopCatalogPage } from '@/data/commerce/catalog';
import { useAuth } from '@/components/auth/AuthProvider';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ShopCatalogFilters } from "@/lib/validations/storefront-catalog-page";
import { getShopCatalogPageAction, getStoreCatalogAction } from '@/data/actions/storefront-catalog';
import { storefrontCatalogQueryKey } from '@/data/commerce/catalog-query-keys';

export class StorefrontCatalogQueryError extends Error {}

export function useStorefrontCatalogQuery(slug?: string, initialData?: CatalogData) {
  const { user } = useAuth();
  return useQuery({
    placeholderData: initialData,
    queryKey: [...storefrontCatalogQueryKey, slug ?? null, user?.id ?? null],
    queryFn: async () => {
      const result = await getStoreCatalogAction(slug);
      if (!result.success) throw new StorefrontCatalogQueryError(result.error);
      return result.data;
    },
    retry: false,
    staleTime: 15_000,
    gcTime: 30 * 60_000,
  });
}

export function useInvalidateStorefrontCatalogQuery() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: storefrontCatalogQueryKey });
}

export function useShopCatalogPage(filters: ShopCatalogFilters, initialData?: ShopCatalogPage) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  return useQuery({
    queryKey: [...storefrontCatalogQueryKey, 'shop', userId, filters],
    queryFn: async () => {
      const result = await getShopCatalogPageAction(filters);
      if (!result.success) throw new StorefrontCatalogQueryError(result.error);
      return result.data;
    },
    initialData: userId === null ? initialData : undefined,
    // Retain filter options while loading without carrying results across sign-in or sign-out.
    placeholderData: (previous, query) =>
      initialData ?? (query?.queryKey.at(-2) === userId ? previous : undefined),
    retry: false,
    staleTime: 15_000,
  });
}
