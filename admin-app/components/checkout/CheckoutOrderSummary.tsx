'use client';

import Link from 'next/link';
import type { CheckoutSubmissionError } from '@/components/checkout/useCheckoutSubmission';
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
  itemsError,
  retryable,
  submissionError,
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
  phoneVerificationReady,
}: {
  couponInput: ReactNode;
  itemsError?: string;
  retryable: boolean;
  submissionError: CheckoutSubmissionError | null;
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
  phoneVerificationReady: boolean;
}) {
  return (
    <aside className="h-fit min-w-0 space-y-4 rounded-xl border bg-card p-4 sm:p-5 lg:sticky lg:top-24">
      <h2 className="text-lg font-semibold">Order summary</h2>
      {couponInput}
      {itemsError && <p className="text-sm text-destructive" role="alert" tabIndex={-1} data-checkout-items-error>{itemsError}</p>}
      <ul className="space-y-4 border-b pb-4">
        {items.map((item) => (
          <li key={item.variantId} className="min-w-0 space-y-2 text-sm">
            <div className="flex min-w-0 items-start gap-3">
              <ProductImage
                path={item.variant?.imagePath ?? item.variant?.productImagePath ?? null}
                alt={item.variant ? `${item.variant.productName} - ${item.variant.name}` : 'Unavailable item'}
                className="size-12 shrink-0 rounded-md aspect-square"
              />
              <div className="min-w-0 flex-1">
                <p className="break-words font-medium leading-5">
                  {item.variant?.productName ?? 'Unavailable item'}
                </p>
                {item.variant?.name && (
                  <p className="mt-0.5 break-words text-xs text-muted-foreground">
                    {item.variant.name}
                  </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">Qty {item.quantity}</p>
              </div>
            </div>
            <ProductPrice
              priceMinor={(item.variant?.price_minor ?? 0) * item.quantity}
              listPriceMinor={(item.variant?.list_price_minor ?? 0) * item.quantity}
              className="w-full justify-end text-right"
            />
          </li>
        ))}
      </ul>
      <div className="space-y-2 text-sm">
        {discountTotal > 0 && (
          <>
            <p className="flex items-start justify-between gap-3">
              <span className="min-w-0">Items before discount</span>
              <span className="shrink-0 text-right tabular-nums">{formatPhp(subtotal + discountTotal)}</span>
            </p>
            <p className="flex items-start justify-between gap-3 text-primary">
              <span className="min-w-0">Discount</span>
              <span className="shrink-0 text-right tabular-nums">-{formatPhp(discountTotal)}</span>
            </p>
          </>
        )}
        <p className="flex items-start justify-between gap-3">
          <span className="min-w-0">Subtotal</span>
          <span className="shrink-0 text-right tabular-nums">{formatPhp(subtotal)}</span>
        </p>
        <p className="flex items-start justify-between gap-3">
          <span className="min-w-0">Delivery</span>
          <span className="shrink-0 text-right tabular-nums">{formatPhp(deliveryFee)}</span>
        </p>
        <p className="flex items-start justify-between gap-3 border-t pt-3 font-semibold">
          <span className="min-w-0">Total</span>
          <span className="shrink-0 text-right tabular-nums">{formatPhp(total)}</span>
        </p>
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
      {!phoneVerificationReady && (
        <p className="text-xs text-muted-foreground" role="status">
          Verify your contact number before placing the order.
        </p>
      )}
      {submissionError && (
        <div
          className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
          tabIndex={-1}
          data-checkout-submission-error
        >
          <p>{submissionError.message}</p>
          {submissionError.nextStep && (
            <Link
              href={submissionError.nextStep === 'order-history' ? '/dashboard/orders' : '/login?redirect=%2Fcheckout'}
              className="inline-flex min-h-11 items-center font-medium underline underline-offset-4"
            >
              {submissionError.nextStep === 'order-history' ? 'View order history' : 'Sign in to continue'}
            </Link>
          )}
        </div>
      )}
      <Button type="submit" className="w-full" loading={busy} disabled={!retryable && (loading || !allVariantsLoaded || !stockAvailable || !paymentAvailable || !phoneVerificationReady)}>
        {retryable ? "Retry order" : "Place order"}
      </Button>
      <p className="text-xs leading-5 text-muted-foreground">
        Stock is not held until staff confirms your order. Remaining balance is paid at store visit.
      </p>
    </aside>
  );
}
