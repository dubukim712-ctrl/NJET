'use client';

import { HomeCreditOrderSummary } from '@/components/admin/commerce/HomeCreditOrderSummary';
import { ProductPrice } from '@/components/shop/ProductPrice';
import { formatPhp } from '@/lib/commerce';
import type { StaffOrder } from '@/data/commerce/admin-orders';

export function OrderOverviewSections({
  order,
  storeDue,
}: {
  order: StaffOrder;
  storeDue: number;
}) {
  const paymentClosed = order.status === "expired" || order.status === "cancelled";
  const proofSubmitted = order.documents.some((document) => document.kind === "payment_proof");
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Items</h3>
        <ul className="space-y-2 text-sm">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-3">
              <span className="min-w-0">
                {item.product_name} · {item.variant_name} × {item.quantity}
                {item.discount_name_snapshot && (
                  <span className="block text-xs text-muted-foreground">
                    {item.discount_name_snapshot}
                  </span>
                )}
              </span>
              <ProductPrice
                priceMinor={item.unit_price_minor * item.quantity}
                listPriceMinor={item.regular_unit_price_minor * item.quantity}
                className="shrink-0 justify-end text-right"
              />
            </li>
          ))}
        </ul>
      </section>
      <section className="space-y-2 text-sm">
        <h3 className="font-semibold">Fulfillment &amp; payment</h3>
        <DetailRow label="Contact number" value={order.contact_number} />
        <DetailRow label="Placed at" value={new Date(order.created_at).toLocaleString('en-PH', {
          dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila',
        }) + ' (Philippine time)'} />
        {paymentClosed && (
          <DetailRow label="Payment" value={order.status === 'expired' ? 'Payment window expired' : 'Order cancelled'} />
        )}
        {order.fulfillment === 'pickup' ? (
          <DetailRow label="Pickup at" value={order.branch_name} />
        ) : (
          <DetailRow label="Delivery via" value={order.delivery_zone_name ?? 'Delivery'} />
        )}
        {order.address_line1 && (
          <DetailRow
            label="Address"
            value={[
              order.address_line1,
              order.barangay,
              order.city,
              order.province,
              order.postal_code,
            ].filter(Boolean).join(', ')}
          />
        )}
        <DetailRow
          label="Checkout method"
          value={`${order.payment_method.replaceAll('_', ' ')}${
            order.payment_provider ? ` · ${order.payment_provider.replaceAll('_', ' ')}` : ''
          }`}
        />
        {order.paymentRecipientName && (
          <DetailRow label="Recipient" value={order.paymentRecipientName} />
        )}
        {order.payment_reference && (
          <DetailRow label="Reference" value={order.payment_reference} />
        )}
        <DetailRow label="Total" value={formatPhp(order.total_minor)} />
        {order.discount_total_minor > 0 && (
          <DetailRow
            label={`Discount${order.applied_coupon_code ? ` · ${order.applied_coupon_code}` : ''}`}
            value={`-${formatPhp(order.discount_total_minor)}`}
            emphasis
          />
        )}
        {order.order_source === 'walk_in' && order.cash_tendered_minor !== null && (
          <DetailRow
            label="Cash tendered · Change"
            value={`${formatPhp(order.cash_tendered_minor)} · ${formatPhp(
              order.cash_tendered_minor - order.total_minor
            )}`}
          />
        )}
        {!paymentClosed && order.reservation_due_minor > 0 && (
          <DetailRow
            label="Reservation"
            value={`${formatPhp(order.reservation_due_minor)}${
              order.payment_method === 'online'
                ? !proofSubmitted
                  ? ' · payment proof pending'
                  : ' · online proof submitted'
                : order.payment_method === 'home_credit'
                  ? ' · Home Credit reservation component'
                  : ' · due at store'
            }`}
          />
        )}
        {!paymentClosed && order.home_credit_downpayment_due_minor > 0 && (
          <DetailRow
            label="Home Credit downpayment"
            value={`${formatPhp(order.home_credit_downpayment_due_minor)}${
              !proofSubmitted
                ? ' · payment proof pending'
                : ' · online proof submitted'
            }`}
          />
        )}
        {order.homeCreditDetails && (
          <HomeCreditOrderSummary details={order.homeCreditDetails} totalMinor={order.total_minor} />
        )}
        {!paymentClosed && (order.payment_method === 'home_credit' ? (
          !order.homeCreditDetails && (
            <DetailRow
              label="Home Credit balance before processing"
              value={formatPhp(order.balance_due_minor)}
            />
          )
        ) : (
          <DetailRow label="Due at store" value={formatPhp(storeDue)} />
        ))}
      </section>
    </div>
  );
}

function DetailRow({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <p className={`flex justify-between gap-2 rounded-md p-2 ${
      emphasis ? 'bg-primary/5 text-primary' : 'bg-muted-foreground/5 text-muted-foreground'
    }`}>
      {label}
      <span className={`text-right ${emphasis ? 'font-bold' : 'font-bold text-foreground'}`}>
        {value}
      </span>
    </p>
  );
}
