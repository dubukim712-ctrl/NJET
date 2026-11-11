'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ChevronDown } from 'lucide-react';
import {
  cancelCommerceOrderAction,
  completeCommerceOrderAction,
  confirmCommerceOrderAction,
} from '@/data/actions/commerce-admin';
import type {
  OrderBranchOption,
  StaffOrder,
} from '@/data/commerce/admin-orders';
import { CompletedOrderDocuments } from '@/components/admin/commerce/CompletedOrderDocuments';
import { HomeCreditOrderSummary } from '@/components/admin/commerce/HomeCreditOrderSummary';
import { HomeCreditOrderCompletionForm } from '@/components/admin/commerce/HomeCreditOrderCompletionForm';
import { OrderStatusBadge } from '@/components/admin/commerce/OrderStatusBadge';
import { OrdersFilters } from '@/components/admin/commerce/OrdersFilters';
import { Button } from '@/components/ui/Button';
import { formatPhp } from '@/lib/commerce';
import type { OrderFilters } from '@/lib/validations/order-filters';

export function OrderManager({
  orders,
  branches,
  filters,
  canManage,
}: {
  orders: StaffOrder[];
  branches: OrderBranchOption[];
  filters: OrderFilters;
  canManage: boolean;
}) {
  const router = useRouter();
  const [busyOrder, setBusyOrder] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [completingHomeCreditOrderId, setCompletingHomeCreditOrderId] = useState<string | null>(null);

  const updateOrder = async (
    orderId: string,
    action: (payload: unknown) => Promise<{ success: boolean; error?: string }>
  ) => {
    setBusyOrder(orderId);
    setError(null);
    try {
      const result = await action({ orderId });
      if (!result.success) {
        const message = result.error ?? 'Could not update this order.';
        setError(message);
        toast.error(message);
        return;
      }
      toast.success('Order status updated.');
      router.refresh();
    } catch (actionError) {
      console.error('Could not update order status.', actionError);
      const message = 'Could not update this order. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      setBusyOrder(null);
    }
  };

  return (
    <div className="space-y-4">
      <OrdersFilters branches={branches} filters={filters} />
      {error && <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">{error}</p>}
      {canManage && (
        <div className="flex justify-end">
          <Button type="button" asChild>
            <Link href="/admin/orders/new">Create walk-in sale</Link>
          </Button>
        </div>
      )}
      {!orders.length && (
        <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
          {filters.q || filters.status || filters.branch
            ? 'No orders match the selected filters.'
            : 'No orders have been placed yet.'}
        </p>
      )}
      {orders.map((order) => {
        const storeDue = order.payment_method === 'home_credit'
          ? 0
          : order.balance_due_minor +
            (order.payment_method === 'online' ? 0 : order.reservation_due_minor);
        const isExpanded = expandedOrderId === order.id;
        const detailsId = `order-details-${order.id}`;
        return (
          <article key={order.id} className="rounded-xl border bg-card p-4 sm:p-5">
            <header className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold">{order.order_number}</h2>
                <p className="mt-1 break-words text-sm text-muted-foreground">
                  {new Date(order.created_at).toLocaleString('en-PH')} · {order.customer_name} · {order.contact_number}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    order.order_source === 'walk_in'
                      ? 'bg-violet-100 text-violet-900 dark:bg-violet-900/30 dark:text-violet-200'
                      : 'bg-secondary text-secondary-foreground'
                  }`}
                >
                  {order.order_source === 'walk_in' ? 'Walk-in' : 'Online'}
                </span>
                <OrderStatusBadge status={order.status} />
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  aria-controls={isExpanded ? detailsId : undefined}
                  onClick={() =>
                    setExpandedOrderId(isExpanded ? null : order.id)
                  }
                  className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md border border-input px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                  {isExpanded ? 'Hide details' : 'View details'}
                  <ChevronDown
                    aria-hidden="true"
                    className={`size-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </button>
              </div>
            </header>

            {isExpanded && (
              <div id={detailsId} className="mt-5 space-y-5 border-t pt-5">
                <div className="grid gap-4 lg:grid-cols-2">
                <section className="space-y-2">
                  <h3 className="text-sm font-semibold">Items</h3>
                  <ul className="space-y-2 text-sm">
                    {order.items.map((item) => (
                      <li key={item.id} className="flex justify-between gap-3">
                        <span>{item.product_name} · {item.variant_name} × {item.quantity}</span>
                        <span className="shrink-0">{formatPhp(item.unit_price_minor * item.quantity)}</span>
                      </li>
                    ))}
                  </ul>
                </section>
                <section className="space-y-2 text-sm">
                  <h3 className="font-semibold">Fulfillment &amp; payment</h3>
                  <p>{order.fulfillment === 'pickup' ? `Pickup at ${order.branch_name}` : `Delivery via ${order.delivery_zone_name}`}</p>
                  {order.address_line1 && (
                    <p className="text-muted-foreground">
                      {[order.address_line1, order.barangay, order.city, order.province, order.postal_code]
                        .filter(Boolean).join(', ')}
                    </p>
                  )}
                  <p className="capitalize">
                    {order.payment_method.replaceAll('_', ' ')}
                    {order.payment_provider ? ` · ${order.payment_provider.replaceAll('_', ' ')}` : ''}
                  </p>
                  {order.paymentRecipientName && (
                    <p>Recipient: {order.paymentRecipientName}</p>
                  )}
                  {order.payment_reference && <p>Reference: {order.payment_reference}</p>}
                  <p>Total: <strong>{formatPhp(order.total_minor)}</strong></p>
                  {order.order_source === 'walk_in' &&
                    order.cash_tendered_minor !== null && (
                      <p>
                        Cash tendered: <strong>{formatPhp(order.cash_tendered_minor)}</strong>
                        {' · '}Change: <strong>{formatPhp(order.cash_tendered_minor - order.total_minor)}</strong>
                      </p>
                    )}
                  {order.reservation_due_minor > 0 && (
                    <p>
                      Reservation: {formatPhp(order.reservation_due_minor)}
                      {order.payment_method === 'online'
                        ? order.status === 'awaiting_payment'
                          ? ' · payment proof pending'
                          : ' · online proof submitted'
                        : order.payment_method === 'home_credit'
                          ? ' · Home Credit reservation component'
                          : ' · due at store'}
                    </p>
                  )}
                  {order.home_credit_downpayment_due_minor > 0 && (
                    <p>
                      Home Credit downpayment: {formatPhp(order.home_credit_downpayment_due_minor)}
                      {order.status === 'awaiting_payment'
                        ? ' · payment proof pending'
                        : ' · online proof submitted'}
                    </p>
                  )}
                  {order.homeCreditDetails && (
                    <HomeCreditOrderSummary details={order.homeCreditDetails} totalMinor={order.total_minor} />
                  )}
                  {order.payment_method === 'home_credit' ? (
                    !order.homeCreditDetails && (
                      <p>
                        Home Credit balance before processing:{' '}
                        <strong>{formatPhp(order.balance_due_minor)}</strong>
                      </p>
                    )
                  ) : (
                    <p>Due at store: <strong>{formatPhp(storeDue)}</strong></p>
                  )}
                </section>
                </div>

                {order.documents.length > 0 && (
                <section className="space-y-2">
                  <h3 className="text-sm font-semibold">Private documents</h3>
                  <ul className="flex flex-wrap gap-2">
                    {order.documents.map((document) => (
                      <li key={document.id}>
                        {document.url ? (
                          <a
                            href={document.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex min-h-10 items-center rounded-md border px-3 text-sm font-medium hover:bg-accent"
                          >
                            Download {document.kind === 'identity' ? 'ID' : 'payment proof'}
                          </a>
                        ) : (
                          <span className="text-sm text-destructive">Private file link unavailable; refresh this page.</span>
                        )}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-muted-foreground">Links expire after one minute. Verify required IDs and payment proof before confirming.</p>
                  </section>
                )}

                {order.status === 'completed' && (
                  <CompletedOrderDocuments
                    key={`${order.id}:${order.invoiceNo ?? ''}`}
                    orderId={order.id}
                    invoiceNo={order.invoiceNo}
                    isEbikeOrder={order.items.some((item) => item.product_type === 'ebike')}
                    certificate={order.certificate}
                    canManage={canManage}
                  />
                )}

                {canManage && (
                  <footer className="flex flex-wrap gap-2 border-t pt-4">
                    {order.status === 'awaiting_confirmation' && (
                      <Button type="button" loading={busyOrder === order.id} disabled={busyOrder !== null} onClick={() => updateOrder(order.id, confirmCommerceOrderAction)}>
                        Confirm and reserve stock
                      </Button>
                    )}
                    {order.status === 'confirmed' && (
                      order.payment_method === 'home_credit' ? (
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={busyOrder !== null}
                          onClick={() => setCompletingHomeCreditOrderId(order.id)}
                        >
                          Enter Home Credit details
                        </Button>
                      ) : (
                        <Button type="button" variant="secondary" loading={busyOrder === order.id} disabled={busyOrder !== null} onClick={() => updateOrder(order.id, completeCommerceOrderAction)}>
                          Mark complete
                        </Button>
                      )
                    )}
                    {['awaiting_payment', 'awaiting_confirmation', 'confirmed'].includes(order.status) && (
                      <Button
                        type="button"
                        variant="destructive"
                        loading={busyOrder === order.id}
                        disabled={busyOrder !== null}
                        onClick={() => {
                          if (window.confirm(`Cancel ${order.order_number}? Confirmed stock will be restored.`)) {
                            void updateOrder(order.id, cancelCommerceOrderAction);
                          }
                        }}
                      >
                        Cancel order
                      </Button>
                    )}
                  </footer>
                )}
                {order.status === 'confirmed' &&
                  order.payment_method === 'home_credit' &&
                  completingHomeCreditOrderId === order.id && (
                    <HomeCreditOrderCompletionForm
                      orderId={order.id}
                      totalMinor={order.total_minor}
                      onCancel={() => setCompletingHomeCreditOrderId(null)}
                      onComplete={() => setCompletingHomeCreditOrderId(null)}
                    />
                  )}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
