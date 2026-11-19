'use client';

import { Button } from '@/components/ui/Button';
import { formatPhp } from '@/lib/commerce';
import type { CartVariant } from '@/data/commerce/catalog-client';
import type { PaymentMethod } from '@/types/commerce-tables';
import { ProductImage } from '@/components/shop/ProductImage';
import { ProductPrice } from '@/components/shop/ProductPrice';
import type { ReactNode } from 'react';

type CheckoutLine = {
  variantId: string;
  quantity: number;
  variant: CartVariant | null;
};

export function CheckoutOrderSummary({
  couponInput,
  items,
  subtotal,
  discountTotal,
  deliveryFee,
  total,
  reservationDue,
  homeCreditDownpaymentDue,
  paymentMethod,
  onlineDue,
  stockAvailable,
  paymentAvailable,
  allVariantsLoaded,
  loading,
  busy,
}: {
  couponInput: ReactNode;
  items: CheckoutLine[];
  subtotal: number;
  discountTotal: number;
  deliveryFee: number;
  total: number;
  reservationDue: number;
  homeCreditDownpaymentDue: number;
  paymentMethod: PaymentMethod;
  onlineDue: number;
  stockAvailable: boolean;
  paymentAvailable: boolean;
  allVariantsLoaded: boolean;
  loading: boolean;
  busy: boolean;
}) {
  return (
    <aside className="h-fit space-y-4 rounded-xl border bg-card p-5 lg:sticky lg:top-24">
      <h2 className="text-lg font-semibold">Order summary</h2>
      {couponInput}
      <ul className="space-y-3 border-b pb-4">
        {items.map((item) => (
          <li key={item.variantId} className="flex gap-3 text-sm">
            <ProductImage
              path={item.variant?.imagePath ?? item.variant?.productImagePath ?? null}
              alt={item.variant ? `${item.variant.productName} - ${item.variant.name}` : 'Unavailable item'}
              className="h-12 w-12 shrink-0 rounded-md aspect-square"
            />
            <span className="min-w-0 flex-1">
              {item.variant?.productName ?? 'Unavailable item'} · {item.variant?.name ?? ''}
              <span className="block text-xs text-muted-foreground">Qty {item.quantity}</span>
            </span>
            <ProductPrice
              priceMinor={(item.variant?.price_minor ?? 0) * item.quantity}
              listPriceMinor={(item.variant?.list_price_minor ?? 0) * item.quantity}
              className="shrink-0 justify-end text-right"
            />
          </li>
        ))}
      </ul>
      <div className="space-y-2 text-sm">
        {discountTotal > 0 && (
          <>
            <p className="flex justify-between">
              <span>Items before discount</span>
              <span>{formatPhp(subtotal + discountTotal)}</span>
            </p>
            <p className="flex justify-between text-primary">
              <span>Discount</span>
              <span>-{formatPhp(discountTotal)}</span>
            </p>
          </>
        )}
        <p className="flex justify-between"><span>Subtotal</span><span>{formatPhp(subtotal)}</span></p>
        <p className="flex justify-between"><span>Delivery</span><span>{formatPhp(deliveryFee)}</span></p>
        <p className="flex justify-between border-t pt-3 font-semibold"><span>Total</span><span>{formatPhp(total)}</span></p>
      </div>
      {reservationDue > 0 && (
        <p className="rounded-lg bg-secondary p-3 text-xs leading-5">
          E-bike reservation: {formatPhp(reservationDue)}. {paymentMethod === 'online'
            ? 'Pay online now; the remaining balance is due at the store.'
            : 'Collected at the store; the remaining balance is due at the store.'}
        </p>
      )}
      {paymentMethod === 'online' && (
        <p className="rounded-lg bg-secondary p-3 text-xs leading-5">
          Online payment due: {formatPhp(onlineDue)}. You will have one hour after placing the order to pay and submit proof.
        </p>
      )}
      {paymentMethod === 'home_credit' && homeCreditDownpaymentDue > 0 && (
        <p className="rounded-lg bg-secondary p-3 text-xs leading-5">
          Home Credit downpayment due online: {formatPhp(homeCreditDownpaymentDue)}. You will have one hour after placing the order to pay and submit proof.
        </p>
      )}
      {!stockAvailable && allVariantsLoaded && (
        <p className="text-xs text-destructive" role="alert">Not enough stock is available for this fulfillment option.</p>
      )}
      {!paymentAvailable && (
        <p className="text-xs text-destructive" role="alert">
          The selected payment account is unavailable for the required downpayment.
        </p>
      )}
      <Button type="submit" className="w-full" loading={busy} disabled={loading || !allVariantsLoaded || !stockAvailable || !paymentAvailable}>
        Place order
      </Button>
      <p className="text-xs leading-5 text-muted-foreground">
        Stock is not held until staff confirms your order. Remaining balance is paid at store visit.
      </p>
    </aside>
  );
}
