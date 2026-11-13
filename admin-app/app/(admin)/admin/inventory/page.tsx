import { InventoryValuationReport } from '@/components/admin/commerce/InventoryValuationReport';
import { requirePermission } from '@/data/auth/guards';
import { PERMISSIONS } from '@/lib/permissions';

export const metadata = { title: 'Inventory valuation' };

export default async function InventoryPage() {
  const { profile } = await requirePermission(PERMISSIONS.productsManage, '/admin/inventory');

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Commerce</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Inventory valuation</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Review on-hand quantities, known receipt costs, and stock whose historical cost is not available.
        </p>
      </header>
      <InventoryValuationReport profile={profile} />
    </div>
  );
}
