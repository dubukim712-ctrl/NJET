import { ProductsQuery } from '@/components/admin/commerce/ProductsQuery';
import { requirePermission } from '@/data/auth/guards';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

export async function ProductsContent() {
  const { user, profile } = await requirePermission(PERMISSIONS.productsRead, '/admin/products');

  return (
    <ProductsQuery
      userId={user.id}
      canManageProducts={hasPermission(profile, PERMISSIONS.productsManage)}
      isBranchScopedStaff={profile.scope === 'staff' && !profile.is_full_access}
      assignedBranchId={profile.branch_id}
    />
  );
}
