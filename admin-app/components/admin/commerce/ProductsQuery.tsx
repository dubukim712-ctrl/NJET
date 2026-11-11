'use client';

import { AdminDataFallback } from '@/components/admin/AdminDataFallback';
import { ProductManager } from '@/components/admin/commerce/ProductManager';
import { Button } from '@/components/ui/Button';
import {
  AdminProductsQueryError,
  useCommerceManagementQuery,
} from '@/data/commerce/admin-products-client';

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

  if (!query.data && query.isPending) {
    return <AdminDataFallback label="product and stock data" />;
  }

  if (!query.data) {
    const message = query.error instanceof AdminProductsQueryError
      ? query.error.message
      : 'Catalog and stock data could not be loaded.';
    return (
      <div className="space-y-3">
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
