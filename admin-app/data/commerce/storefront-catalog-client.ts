'use client';

import { useAuth } from '@/components/auth/AuthProvider';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getStoreCatalogAction } from '@/data/actions/storefront-catalog';
import { storefrontCatalogQueryKey } from '@/data/commerce/catalog-query-keys';

export class StorefrontCatalogQueryError extends Error {}

export function useStorefrontCatalogQuery(slug?: string) {
  const { user } = useAuth();
  return useQuery({
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
