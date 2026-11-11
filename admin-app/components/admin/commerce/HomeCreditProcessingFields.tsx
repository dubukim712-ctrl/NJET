'use client';

import { Input } from '@/components/ui/Input';
import { formatPhp, parsePhpAmount } from '@/lib/commerce';

export type HomeCreditProcessingFormValues = {
  accountNo: string;
  downpayment: string;
  termsMonths: string;
  monthlyPayment: string;
};

export function HomeCreditProcessingFields({
  values,
  onChange,
  totalMinor,
}: {
  values: HomeCreditProcessingFormValues;
  onChange: (values: HomeCreditProcessingFormValues) => void;
  totalMinor: number;
}) {
  const update = <Key extends keyof HomeCreditProcessingFormValues>(
    key: Key,
    value: HomeCreditProcessingFormValues[Key]
  ) => onChange({ ...values, [key]: value });
  const downpaymentMinor = parsePhpAmount(values.downpayment);
  const financedBalance =
    downpaymentMinor !== null && downpaymentMinor <= totalMinor
      ? totalMinor - downpaymentMinor
      : null;

  return (
    <section className="space-y-4 rounded-lg border p-4">
      <h3 className="font-semibold">Home Credit agreement</h3>
      <div className="grid gap-4">
        <Input
          label="Home Credit account number"
          autoComplete="off"
          maxLength={80}
          required
          value={values.accountNo}
          onChange={(event) => update('accountNo', event.target.value)}
        />
        <Input
          label="Downpayment (PHP)"
          type="number"
          min="0"
          step="0.01"
          className="number-no-spinner"
          onWheel={(event) => event.currentTarget.blur()}
          placeholder="0.00"
          required
          value={values.downpayment}
          onChange={(event) => update('downpayment', event.target.value)}
        />
        <Input
          label="Terms (months)"
          type="number"
          min="1"
          max="120"
          step="1"
          className="number-no-spinner"
          onWheel={(event) => event.currentTarget.blur()}
          required
          value={values.termsMonths}
          onChange={(event) => update('termsMonths', event.target.value)}
        />
        <Input
          label="Monthly payment (PHP)"
          type="number"
          min="0"
          step="0.01"
          className="number-no-spinner"
          onWheel={(event) => event.currentTarget.blur()}
          placeholder="0.00"
          required
          value={values.monthlyPayment}
          onChange={(event) => update('monthlyPayment', event.target.value)}
        />
      </div>
      {financedBalance === null ? (
        <p className="text-sm text-destructive" role="alert">
          Enter a valid downpayment no greater than {formatPhp(totalMinor)}.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          Sale revenue: {formatPhp(totalMinor - financedBalance)} downpayment +{' '}
          {formatPhp(financedBalance)} financed balance ={' '}
          <strong className="text-foreground">{formatPhp(totalMinor)}</strong>.
        </p>
      )}
    </section>
  );
}
