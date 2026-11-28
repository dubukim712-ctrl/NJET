'use client';

import { useVerifiedAdminProfile } from '@/components/providers/AdminProvider';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { ProductsContent } from '@/components/admin/commerce/ProductsContent';

export function AdminProductsView() {
  const profile = useVerifiedAdminProfile();
  if (!profile || !(hasPermission(profile, PERMISSIONS.productsRead))) return null;
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Commerce</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Products &amp; stock</h1>
        <p className="mt-2 text-sm text-muted-foreground">Manage product categories and subcategories, images, variants, serial-tracked e-bikes, batch stock, transfers, and movement logs.</p>
      </header>
      <ProductsContent />
    </div>
  );
}
