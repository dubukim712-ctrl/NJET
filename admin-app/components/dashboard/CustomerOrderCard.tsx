'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { ArrowRight, Package } from 'lucide-react';
import { OrderStatusBadge } from '@/components/commerce/OrderStatusBadge';
import { ProductPrice } from '@/components/shop/ProductPrice';
import { CustomerOrderReviewActions } from '@/components/dashboard/CustomerOrderReviewActions';
import { getCustomerOrderDocumentUrlAction } from '@/data/actions/customer-orders';
import type { CustomerOrder, CustomerOrderDocumentKind } from '@/data/commerce/customer-orders';
import { formatPhp } from '@/lib/commerce';

export function CustomerOrderCard({
  order,
  isPlaced,
  showDetailsLink = true,
}: {
  order: CustomerOrder;
  isPlaced: boolean;
  showDetailsLink?: boolean;
}) {
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloading, startDownload] = useTransition();

  function downloadDocument(kind: CustomerOrderDocumentKind) {
    setDownloadError(null);
    startDownload(async () => {
      try {
        const result = await getCustomerOrderDocumentUrlAction({ orderId: order.id, kind });
        if (!result.success) {
          setDownloadError(result.error);
          return;
        }
        window.location.assign(result.data.url);
      } catch {
        setDownloadError('The document could not be downloaded. Please try again.');
      }
    });
  }

  const noLongerDue = order.status === 'expired' || order.status === 'cancelled';
  const needsPayment = showDetailsLink && (
    order.status === 'awaiting_payment' ||
    ((order.payment_method === 'online' ||
      (order.payment_method === 'home_credit' &&
        order.home_credit_downpayment_due_minor > 0)) &&
      order.status === 'awaiting_confirmation'));
  const reviewItems = order.status === 'completed'
    ? order.items.flatMap((item) =>
        item.productId
          ? [{
              id: item.productId,
              name: `${item.product_name} · ${item.variant_name}`,
              orderItemId: item.id,
            }]
          : []
      )
    : [];

  return (
    <li className="rounded-xl border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-primary">
            <Package className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            {needsPayment ? (
              <Link href={`/dashboard/orders/${order.id}`} className="inline-flex min-h-11 items-center font-semibold text-primary hover:underline">
                {order.order_number}
              </Link>
            ) : (
              <h2 className="font-semibold">{order.order_number}</h2>
            )}
            <p className="text-sm text-muted-foreground">
              {new Date(order.created_at).toLocaleDateString('en-PH')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <OrderStatusBadge status={order.status} />
          {needsPayment && (
            <Link
              href={`/dashboard/orders/${order.id}`}
              className="inline-flex min-h-11 items-center rounded-md border px-3 text-sm font-medium hover:bg-accent"
            >
              {order.status === 'awaiting_payment' ? 'Complete payment' : 'View payment'}
            </Link>
          )}
        </div>
      </div>
      {isPlaced && order.status === 'awaiting_confirmation' && (
        <p
          className="mt-4 rounded-lg border border-primary/20 bg-primary p-4 text-sm text-primary-foreground"
          role="status"
        >
          Order {order.order_number} was placed. Staff will review it before stock is reserved.
        </p>
      )}
      <ul className="mt-4 space-y-2 border-y py-4 text-sm">
        {order.items.map((item, index) => (
          <li
            key={`${order.id}-${index}`}
            className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
          >
            <div className="min-w-0">
              <p>{item.product_name} · {item.variant_name} × {item.quantity}</p>
            </div>
            <ProductPrice
              priceMinor={item.unit_price_minor * item.quantity}
              listPriceMinor={item.regular_unit_price_minor * item.quantity}
              className="shrink-0 justify-end text-right"
            />
          </li>
        ))}
      </ul>
      <div className="grid gap-3 pt-4 text-sm sm:grid-cols-2">
        <p>
          <span className="text-muted-foreground">Fulfillment:</span>{' '}
          {order.fulfillment === 'pickup'
            ? `Pickup at ${order.branch_name}`
            : `Delivery to ${order.delivery_zone_name}`}
        </p>
        <p>
          <span className="text-muted-foreground">Payment:</span>{' '}
          {order.payment_method.replaceAll('_', ' ')}
        </p>
        <p>
          <span className="text-muted-foreground">Total:</span> {formatPhp(order.total_minor)}
        </p>
        {order.discount_total_minor > 0 && (
          <p>
            <span className="text-muted-foreground">
              Discount{order.applied_coupon_code ? ` (${order.applied_coupon_code})` : ''}:
            </span>{' '}
            -{formatPhp(order.discount_total_minor)}
          </p>
        )}
        {order.reservation_due_minor > 0 && (
          <p>
            <span className="text-muted-foreground">Reservation:</span>{' '}
            {formatPhp(order.reservation_due_minor)}
            {noLongerDue ? ' (no longer due)' : order.payment_method === 'online' ? ' online' : ' at store'}
          </p>
        )}
        <p>
          <span className="text-muted-foreground">{noLongerDue ? "Store payment amount:" : "Due at store:"}</span>{' '}
          {formatPhp(
            order.balance_due_minor +
              (order.payment_method === 'online' ? 0 : order.reservation_due_minor)
          )}{noLongerDue && ' (no longer due)'}
        </p>
        {order.online_due_minor > 0 && (
          <p>
            <span className="text-muted-foreground">{noLongerDue ? "Online payment amount:" : "Online payment due:"}</span>{' '}
            {formatPhp(order.online_due_minor)}{noLongerDue && ' (no longer due)'}
          </p>
        )}
        {order.home_credit_downpayment_due_minor > 0 && (
          <p>
            <span className="text-muted-foreground">{noLongerDue ? "Home Credit downpayment:" : "Home Credit downpayment due:"}</span>{' '}
            {formatPhp(order.home_credit_downpayment_due_minor)}{noLongerDue && ' (no longer due)'}
          </p>
        )}
      </div>
      {order.status === 'completed' &&
        (order.invoiceNo || order.hasCertificate || order.hasReceipt || reviewItems.length > 0) && (
          <section className="mt-4 flex flex-wrap items-center gap-3 border-t pt-4">
            {order.invoiceNo && (
              <p className="text-sm">
                <span className="text-muted-foreground">Invoice number:</span> {order.invoiceNo}
              </p>
            )}
            {order.hasCertificate && (
              <button
                type="button"
                disabled={downloading}
                onClick={() => downloadDocument('certificate')}
                className="inline-flex min-h-11 items-center rounded-md border px-3 text-sm font-medium hover:bg-accent disabled:opacity-50"
              >
                Download ownership certificate
              </button>
            )}
            {order.hasReceipt && (
              <button
                type="button"
                disabled={downloading}
                onClick={() => downloadDocument('receipt')}
                className="inline-flex min-h-11 items-center rounded-md border px-3 text-sm font-medium hover:bg-accent disabled:opacity-50"
              >
                Download sales receipt
              </button>
            )}
            {downloading && <p role="status" className="text-sm">Preparing download...</p>}
            {downloadError && (
              <p role="alert" className="basis-full text-sm text-destructive">{downloadError}</p>
            )}
            {reviewItems.length > 0 && (
              <CustomerOrderReviewActions
                orderId={order.id}
                orderNumber={order.order_number}
                items={reviewItems}
              />
            )}
          </section>
        )}
      {showDetailsLink && (
        <div className="mt-3 flex justify-end">
          <Link
            href={`/dashboard/orders/${order.id}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring"
            aria-label={`View details for order ${order.order_number}`}
          >
            View details <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      )}
    </li>
  );
}
