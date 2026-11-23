'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import type { WalkInSaleSubmissionError } from '@/components/admin/commerce/useWalkInSaleSubmission';

const FIELD_LABELS: Record<string, string> = {
  customerName: 'Customer name',
  contactNumber: 'Contact number',
  branchId: 'Selling branch',
  paymentMethod: 'Payment method',
  paymentProvider: 'Online payment provider',
  paymentReference: 'Payment reference number',
  cashTenderedMinor: 'Cash tendered',
  addressLine1: 'Street address',
  barangay: 'Barangay',
  city: 'City / municipality',
  province: 'Province',
  postalCode: 'Postal code',
  couponCode: 'Coupon code',
  items: 'Cart',
  homeCreditDetails: 'Home Credit agreement',
  'homeCreditDetails.accountNo': 'Home Credit account number',
  'homeCreditDetails.downpayment': 'Downpayment',
  'homeCreditDetails.termsMonths': 'Terms (months)',
  'homeCreditDetails.monthlyPayment': 'Monthly payment',
};

export function WalkInSaleActions({
  busy,
  blockingReason,
  error,
}: {
  busy: boolean;
  blockingReason: string | null;
  error: WalkInSaleSubmissionError | null;
}) {
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  return (
    <footer className="space-y-3">
      {error && (
        <div
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          <p>{error.message}</p>
          {error.fieldErrors && (
            <ul className="list-disc space-y-1 pl-5">
              {Object.entries(error.fieldErrors).map(([field, messages]) => (
                <li key={field}>
                  {FIELD_LABELS[field] && <strong>{FIELD_LABELS[field]}: </strong>}
                  {messages.join(' ')}
                </li>
              ))}
            </ul>
          )}
          {error.outcomeUncertain && (
            <Link href="/admin/orders" className="inline-flex min-h-11 items-center font-medium underline underline-offset-4">
              View orders
            </Link>
          )}
        </div>
      )}
      {blockingReason && <p className="text-sm text-muted-foreground sm:text-right" role="status">{blockingReason}</p>}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        {busy ? (
          <Button type="button" variant="outline" disabled className="min-h-11">Cancel</Button>
        ) : (
          <Button variant="outline" asChild className="min-h-11">
            <Link href="/admin/orders">Cancel</Link>
          </Button>
        )}
        <Button type="submit" className="min-h-11" loading={busy} disabled={Boolean(blockingReason)}>
          Complete sale
        </Button>
      </div>
    </footer>
  );
}
