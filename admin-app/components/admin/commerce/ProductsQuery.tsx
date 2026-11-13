'use client';

import { useCallback } from 'react';
import { ProductManager } from '@/components/admin/commerce/ProductManager';
import { ProductsLoadingSkeleton } from '@/components/admin/commerce/ProductsLoadingSkeleton';
import { RealtimeStatus } from '@/components/realtime/RealtimeStatus';
import { useRealtimeChanges } from '@/components/realtime/useRealtimeChanges';
import { Button } from '@/components/ui/Button';
import {
  AdminProductsQueryError,
  useCommerceManagementQuery,
  useInvalidateAdminProductsQuery,
} from '@/data/commerce/admin-products-client';
import type { RealtimeTable } from '@/types/realtime';

const INVENTORY_REALTIME_TABLES: readonly RealtimeTable[] = [
  'products',
  'product_variants',
  'branch_inventory',
  'branches',
  'product_categories',
  'product_subcategories',
  'ebike_units',
  'inventory_movements',
  'branch_transfers',
  'branch_transfer_items',
  'branch_transfer_units',
];

export function ProductsQuery({
  userId,
  canManageProducts,
  isBranchScopedStaff,
  assignedBranchId,
}: {
  userId: string;
  canManageProducts: boolean;
  isBranchScopedStaff: boolean;
  assignedBranchId: string | null;
}) {
  const query = useCommerceManagementQuery(
    userId,
    canManageProducts,
    isBranchScopedStaff,
    assignedBranchId
  );
  const invalidateProducts = useInvalidateAdminProductsQuery();
  const refreshProducts = useCallback(() => {
    void invalidateProducts();
  }, [invalidateProducts]);
  const realtimeState = useRealtimeChanges(
    `admin-products-${userId}`,
    INVENTORY_REALTIME_TABLES,
    refreshProducts
  );

  if (!query.data && query.isPending) {
    return <ProductsLoadingSkeleton canManageProducts={canManageProducts} />;
  }

  if (!query.data) {
    const message = query.error instanceof AdminProductsQueryError
      ? query.error.message
      : 'Catalog and stock data could not be loaded.';
    return (
      <div className="space-y-3">
        <div className="flex justify-end">
          <RealtimeStatus state={realtimeState} />
        </div>
        <p
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
          role="alert"
        >
          {message}
        </p>
        <Button type="button" variant="outline" onClick={() => { void query.refetch(); }}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <RealtimeStatus state={realtimeState} />
      </div>
      {query.isError && (
        <div className="space-y-2" role="alert">
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {query.error instanceof AdminProductsQueryError
              ? query.error.message
              : 'Catalog and stock data could not be refreshed.'}
          </p>
          <Button type="button" variant="outline" onClick={() => { void query.refetch(); }}>
            Try again
          </Button>
        </div>
      )}
      <ProductManager
        {...query.data}
        canManageProducts={canManageProducts}
        isBranchScopedStaff={isBranchScopedStaff}
        assignedBranchId={assignedBranchId}
      />
    </div>
  );
}
