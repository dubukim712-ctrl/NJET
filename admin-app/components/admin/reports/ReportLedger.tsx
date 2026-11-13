'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { formatPhp } from '@/lib/commerce';
import {
  formatReportDateTime,
  paymentMethodLabel,
  reportOrderStatus,
} from '@/lib/reports/order-sales-format';
import type { OrderSalesReportRows } from '@/lib/validations/order-sales-report';
import { OrderDetailsDialog } from '@/components/admin/reports/OrderDetailsDialog';

type ReportOrder = OrderSalesReportRows['rows'][number];

export function ReportLedger({
  ledger,
  page,
  pageSize,
  search,
  canManage,
  onPage,
  onPageSize,
  onSearch,
  onPaymentRecorded,
}: {
  ledger: OrderSalesReportRows;
  page: number;
  pageSize: 25 | 50 | 100;
  search: string;
  canManage: boolean;
  onPage: (page: number) => void;
  onPageSize: (size: 25 | 50 | 100) => void;
  onSearch: (value: string) => void;
  onPaymentRecorded: () => Promise<void>;
}) {
  const [selectedOrder, setSelectedOrder] = useState<ReportOrder | null>(null);
  const pageCount = Math.max(1, Math.ceil(ledger.total / pageSize));

  const orderInfo = (order: ReportOrder) => (
    <div className="min-w-40">
      <p className="font-medium">{order.order_number}</p>
      <p className="text-xs text-muted-foreground">
        {formatReportDateTime(order.completed_at ?? order.created_at)}
      </p>
    </div>
  );
  const customerInfo = (order: ReportOrder) => (
    <div className="min-w-36">
      <p className="font-medium">{order.customer_name}</p>
      <p className="text-xs text-muted-foreground">{order.contact_number}</p>
    </div>
  );
  const productInfo = (order: ReportOrder) => (
    <div className="min-w-40">
      <p>{order.items.slice(0, 2).map((item) => `${item.product_name} × ${item.quantity}`).join(', ') || 'No item details'}</p>
      {order.items.length > 2 && <p className="text-xs text-muted-foreground">+{order.items.length - 2} more items</p>}
    </div>
  );
  const status = (order: ReportOrder) => {
    const value = reportOrderStatus(order);
    return (
      <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${value.className}`}>
        {value.label}
      </span>
    );
  };
  const viewButton = (order: ReportOrder) => (
    <Button type="button" size="sm" variant="outline" onClick={() => setSelectedOrder(order)}>
      View
    </Button>
  );

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Order ledger</h2>
          <p className="text-sm text-muted-foreground">
            {ledger.total.toLocaleString()} matching orders by completion date; other orders use order date
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-[minmax(14rem,1fr)_8rem]">
          <Input
            label="Search orders"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Receipt, customer, model, or SKU"
            maxLength={120}
          />
          <label className="space-y-1.5 text-sm font-medium">
            <span>Rows</span>
            <select
              className="min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm"
              value={pageSize}
              onChange={(event) => onPageSize(Number(event.target.value) as 25 | 50 | 100)}
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label>
        </div>
      </div>

      {ledger.rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No orders match these dates and filters.
        </p>
      ) : (
        <>
          <div className="space-y-3 sm:hidden print:hidden">
            {ledger.rows.map((order) => (
              <article key={order.id} className="space-y-3 rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  {orderInfo(order)}
                  {status(order)}
                </div>
                {customerInfo(order)}
                <div className="text-sm">{productInfo(order)}</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p><span className="text-muted-foreground">Checkout:</span> {paymentMethodLabel(order.payment_method, order.payment_provider)}</p>
                  <p><span className="text-muted-foreground">Branch:</span> {order.branch_name}</p>
                  <p><span className="text-muted-foreground">Total:</span> {formatPhp(order.total_minor)}</p>
                  <p><span className="text-muted-foreground">Paid:</span> {formatPhp(order.amount_paid_minor)}</p>
                  <p className="col-span-2"><span className="text-muted-foreground">Balance due:</span> {formatPhp(order.balance_due_minor)}</p>
                </div>
                <div className="flex justify-end">{viewButton(order)}</div>
              </article>
            ))}
          </div>
          <div className="hidden overflow-x-auto sm:block print:block print:overflow-visible">
            <table className="w-full min-w-[1050px] border-collapse text-left text-sm print:min-w-0 print:text-xs">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-3">Sale / order date</th>
                  <th className="px-3 py-3">Customer</th>
                  <th className="px-3 py-3">Items</th>
                  <th className="px-3 py-3">Checkout</th>
                  <th className="px-3 py-3 text-right">Total</th>
                  <th className="px-3 py-3 text-right">Paid</th>
                  <th className="px-3 py-3 text-right">Due</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3"><span className="sr-only">Details</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {ledger.rows.map((order) => (
                  <tr key={order.id} className="align-top hover:bg-muted/30">
                    <td className="px-3 py-3">{orderInfo(order)}</td>
                    <td className="px-3 py-3">{customerInfo(order)}</td>
                    <td className="px-3 py-3">{productInfo(order)}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{paymentMethodLabel(order.payment_method, order.payment_provider)}</td>
                    <td className="px-3 py-3 text-right">{formatPhp(order.total_minor)}</td>
                    <td className="px-3 py-3 text-right">{formatPhp(order.amount_paid_minor)}</td>
                    <td className="px-3 py-3 text-right">{formatPhp(order.balance_due_minor)}</td>
                    <td className="px-3 py-3">{status(order)}</td>
                    <td className="px-3 py-3">{viewButton(order)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {ledger.total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 print:hidden">
          <p className="text-sm text-muted-foreground">Page {page} of {pageCount}</p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Button>
            <Button type="button" variant="outline" size="sm" disabled={page >= pageCount} onClick={() => onPage(page + 1)}>Next</Button>
          </div>
        </div>
      )}
      <OrderDetailsDialog
        order={selectedOrder}
        canManage={canManage}
        onClose={() => setSelectedOrder(null)}
        onPaymentRecorded={async () => {
          await onPaymentRecorded();
          setSelectedOrder(null);
        }}
      />
    </section>
  );
}
