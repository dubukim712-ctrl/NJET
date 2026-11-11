import { ProductManager } from '@/components/admin/commerce/ProductManager';
import { requirePermission } from '@/data/auth/guards';
import { getCommerceManagementData } from '@/data/commerce/admin-queries';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

export async function ProductsContent() {
  const { supabase, profile } = await requirePermission(PERMISSIONS.productsRead, '/admin/products');
  const result = await getCommerceManagementData(supabase);

  if (result.error || !result.data) {
    return (
      <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
        {result.error ?? 'Commerce data is unavailable.'}
      </p>
    );
  }

  return (
    <ProductManager
      {...result.data}
      canManageProducts={hasPermission(profile, PERMISSIONS.productsManage)}
      isBranchScopedStaff={profile.scope === 'staff' && !profile.is_full_access}
      assignedBranchId={profile.branch_id}
    />
  );
}
