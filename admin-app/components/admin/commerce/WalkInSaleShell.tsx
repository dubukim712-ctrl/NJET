import type { ReactNode } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export function WalkInSaleShell({ children }: { children?: ReactNode }) {
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
          <Link prefetch={true} href="/admin/orders">Back to orders</Link>
        </Button>
      </header>
      {children ?? <p role="status" className="rounded-xl border bg-card p-4">Loading selling branches…</p>}
    </div>
  );
}
