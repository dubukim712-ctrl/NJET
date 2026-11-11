'use client';

import { getPaymentProviderLabel } from '@/data/commerce/payment-recipients';
import { formatPhp } from '@/lib/commerce';
import type { PaymentMethod, PaymentProvider } from '@/types/commerce-tables';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import {
  HomeCreditProcessingFields,
  type HomeCreditProcessingFormValues,
} from '@/components/admin/commerce/HomeCreditProcessingFields';

const PAYMENT_PROVIDERS: PaymentProvider[] = [
  'gcash',
  'bank_transfer',
  'card',
];

export type WalkInSalePaymentValues = {
  paymentMethod: PaymentMethod;
  paymentProvider: PaymentProvider;
  paymentReference: string;
  cashTendered: string;
  addressLine1: string;
  barangay: string;
  city: string;
  province: string;
  postalCode: string;
  homeCreditDetails: HomeCreditProcessingFormValues;
};

export function WalkInSalePayment({
  values,
  onChange,
  totalMinor,
  cashTenderedMinor,
  cashIsShort,
  changeMinor,
  disabled,
}: {
  values: WalkInSalePaymentValues;
  onChange: (values: WalkInSalePaymentValues) => void;
  totalMinor: number;
  cashTenderedMinor: number | null;
  cashIsShort: boolean;
  changeMinor: number | null;
  disabled: boolean;
}) {
  const update = <Key extends keyof WalkInSalePaymentValues>(
    key: Key,
    value: WalkInSalePaymentValues[Key]
  ) => onChange({ ...values, [key]: value });

  return (
    <section className="space-y-4 rounded-xl border bg-card p-4 sm:p-5">
      <h2 className="text-lg font-semibold">Payment</h2>
      <Select
        label="Payment method"
        value={values.paymentMethod}
        disabled={disabled}
        onChange={(event) =>
          update('paymentMethod', event.target.value as PaymentMethod)
        }
      >
        <option value="cash">Cash</option>
        <option value="online">Online payment</option>
        <option value="home_credit">Home Credit</option>
      </Select>

      {values.paymentMethod === 'cash' && (
        <>
          <Input
            label="Cash tendered"
            type="number"
            min="0"
            step="0.01"
            className="number-no-spinner"
            onWheel={(event) => event.currentTarget.blur()}
            placeholder="0.00"
            required
            aria-invalid={Boolean(values.cashTendered) && cashTenderedMinor === null}
            value={values.cashTendered}
            onChange={(event) => update('cashTendered', event.target.value)}
          />
          <p className="text-sm" aria-live="polite">
            {values.cashTendered && cashTenderedMinor === null ? (
              <span className="text-destructive">
                Enter a valid amount with up to two decimal places.
              </span>
            ) : changeMinor !== null && changeMinor >= 0 ? (
              <>
                Change: <strong>{formatPhp(changeMinor)}</strong>
              </>
            ) : cashTenderedMinor !== null && cashIsShort ? (
              <span className="text-destructive">
                Cash tendered must cover the sale total of {formatPhp(totalMinor)}.
              </span>
            ) : (
              <>
                Cash due: <strong>{formatPhp(totalMinor)}</strong>
              </>
            )}
          </p>
        </>
      )}

      {values.paymentMethod === 'online' && (
        <>
          <Select
            label="Online payment provider"
            value={values.paymentProvider}
            disabled={disabled}
            onChange={(event) =>
              update('paymentProvider', event.target.value as PaymentProvider)
            }
          >
            {PAYMENT_PROVIDERS.map((provider) => (
              <option key={provider} value={provider}>
                {getPaymentProviderLabel(provider)}
              </option>
            ))}
          </Select>
          <Input
            label="Payment reference number"
            required
            maxLength={120}
            value={values.paymentReference}
            onChange={(event) => update('paymentReference', event.target.value)}
          />
        </>
      )}

      {values.paymentMethod === 'home_credit' && (
        <HomeCreditProcessingFields
          values={values.homeCreditDetails}
          onChange={(homeCreditDetails) =>
            onChange({ ...values, homeCreditDetails })
          }
          totalMinor={totalMinor}
        />
      )}
    </section>
  );
}
