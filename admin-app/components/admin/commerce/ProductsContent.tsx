'use client';

import { useAdminProfile } from '@/components/providers/AdminProvider';
import { ProductsQuery } from '@/components/admin/commerce/ProductsQuery';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

export function ProductsContent() {
  const profile = useAdminProfile();

  return (
    <ProductsQuery
      userId={profile.id}
      canManageProducts={hasPermission(profile, PERMISSIONS.productsManage)}
      canModerateProductReviews={hasPermission(
        profile,
        PERMISSIONS.productReviewsModerate
      )}
      isBranchScopedStaff={profile.scope === 'staff' && !profile.is_full_access}
      assignedBranchId={profile.branch_id}
    />
  );
}
