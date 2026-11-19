'use client';

import Link from 'next/link';
import { Package } from 'lucide-react';
import { OrderStatusBadge } from '@/components/commerce/OrderStatusBadge';
import { ProductPrice } from '@/components/shop/ProductPrice';
import type { CustomerOrder } from '@/data/commerce/customer-orders';
import { formatPhp } from '@/lib/commerce';

export function CustomerOrderCard({
  order,
  isPlaced,
}: {
  order: CustomerOrder;
  isPlaced: boolean;
}) {
  const needsPayment =
    order.status === 'awaiting_payment' ||
    ((order.payment_method === 'online' ||
      (order.payment_method === 'home_credit' &&
        order.home_credit_downpayment_due_minor > 0)) &&
      order.status === 'awaiting_confirmation');

  return (
    <li className="rounded-xl border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-primary">
            <Package className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            {needsPayment ? (
              <Link href={`/dashboard/orders/${order.id}`} className="font-semibold text-primary hover:underline">
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
              className="inline-flex min-h-10 items-center rounded-md border px-3 text-sm font-medium hover:bg-accent"
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
          <li key={`${order.id}-${index}`} className="flex justify-between gap-3">
            <span className="min-w-0">
              {item.product_name} · {item.variant_name} × {item.quantity}
            </span>
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
            {order.payment_method === 'online' ? ' online' : ' at store'}
          </p>
        )}
        <p>
          <span className="text-muted-foreground">Due at store:</span>{' '}
          {formatPhp(
            order.balance_due_minor +
              (order.payment_method === 'online' ? 0 : order.reservation_due_minor)
          )}
        </p>
        {order.online_due_minor > 0 && (
          <p>
            <span className="text-muted-foreground">Online payment due:</span>{' '}
            {formatPhp(order.online_due_minor)}
          </p>
        )}
        {order.home_credit_downpayment_due_minor > 0 && (
          <p>
            <span className="text-muted-foreground">Home Credit downpayment due:</span>{' '}
            {formatPhp(order.home_credit_downpayment_due_minor)}
          </p>
        )}
      </div>
      {order.status === 'completed' &&
        (order.invoiceNo || order.certificateUrl || order.receiptUrl) && (
          <section className="mt-4 flex flex-wrap items-center gap-3 border-t pt-4">
            {order.invoiceNo && (
              <p className="text-sm">
                <span className="text-muted-foreground">Invoice number:</span> {order.invoiceNo}
              </p>
            )}
            {order.certificateUrl && (
              <a href={order.certificateUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center rounded-md border px-3 text-sm font-medium hover:bg-accent">
                Download ownership certificate
              </a>
            )}
            {order.receiptUrl && (
              <a href={order.receiptUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center rounded-md border px-3 text-sm font-medium hover:bg-accent">
                Download sales receipt
              </a>
            )}
          </section>
        )}
    </li>
  );
}
