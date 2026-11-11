import Link from 'next/link';
import { WalkInSaleForm } from '@/components/admin/commerce/WalkInSaleForm';
import { Button } from '@/components/ui/Button';
import { requirePermission } from '@/data/auth/guards';
import {
  getWalkInBranchOptions,
  getWalkInCatalog,
} from '@/data/commerce/walk-in-sales';
import { PERMISSIONS } from '@/lib/permissions';

export const metadata = { title: 'New Walk-in Sale' };

export default async function NewWalkInSalePage() {
  const { supabase, profile } = await requirePermission(
    PERMISSIONS.ordersManage,
    '/admin/orders/new'
  );
  const branchResult = await getWalkInBranchOptions(supabase);
  if (branchResult.error || !branchResult.data) {
    return (
      <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
        {branchResult.error ?? 'Branch data is unavailable.'}
      </p>
    );
  }
  const branches = branchResult.data;
  const initialBranch =
    branches.find((branch) => branch.id === profile.branch_id) ?? branches[0];

  if (!initialBranch) {
    return (
      <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground" role="status">
        No active branch is available to your account. Contact an administrator.
      </p>
    );
  }

  const catalogResult = await getWalkInCatalog(supabase, initialBranch.id);
  if (catalogResult.error || !catalogResult.data) {
    return (
      <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
        {catalogResult.error ?? 'The product catalog is unavailable.'}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
            Commerce · Orders
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            New walk-in sale
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Select branch stock, record payment, and complete the sale.
          </p>
        </div>
        <Button type="button" variant="outline" asChild>
          <Link href="/admin/orders">Back to orders</Link>
        </Button>
      </header>
      <WalkInSaleForm
        branches={branches}
        initialBranchId={initialBranch.id}
        initialCatalog={catalogResult.data}
      />
    </div>
  );
}
