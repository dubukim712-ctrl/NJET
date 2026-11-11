import { Suspense } from 'react';
import { AdminDataFallback } from '@/components/admin/AdminDataFallback';
import {
  OrdersContent,
  type OrdersSearchParams,
} from '@/components/admin/commerce/OrdersContent';

export const metadata = { title: 'Orders' };

export default function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<OrdersSearchParams>;
}) {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Commerce</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Orders</h1>
        <p className="mt-2 text-sm text-muted-foreground">Manage online orders and completed walk-in sales. Online order stock is deducted atomically on confirmation.</p>
      </header>
      <Suspense fallback={<AdminDataFallback label="orders" />}>
        <OrdersContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
