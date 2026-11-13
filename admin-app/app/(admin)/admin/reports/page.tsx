import { OrderSalesReport } from '@/components/admin/reports/OrderSalesReport';
import { requirePermission } from '@/data/auth/guards';
import { PERMISSIONS, hasPermission } from '@/lib/permissions';

export const metadata = { title: 'Sales report' };

export default async function SalesReportPage() {
  const { user, profile } = await requirePermission(PERMISSIONS.ordersRead, '/admin/reports');

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Commerce</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Sales report</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Review completed order sales, verified collections, cost-backed profit, and outstanding balances.
        </p>
      </header>
      <OrderSalesReport
        userId={user.id}
        canManage={hasPermission(profile, PERMISSIONS.ordersManage)}
      />
    </div>
  );
}
