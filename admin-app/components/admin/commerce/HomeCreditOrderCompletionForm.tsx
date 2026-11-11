'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import {
  HomeCreditProcessingFields,
  type HomeCreditProcessingFormValues,
} from '@/components/admin/commerce/HomeCreditProcessingFields';
import { completeHomeCreditCommerceOrderAction } from '@/data/actions/commerce-admin';

export function HomeCreditOrderCompletionForm({
  orderId,
  totalMinor,
  onCancel,
  onComplete,
}: {
  orderId: string;
  totalMinor: number;
  onCancel: () => void;
  onComplete: () => void;
}) {
  const router = useRouter();
  const [values, setValues] = useState<HomeCreditProcessingFormValues>({
    accountNo: '',
    downpayment: '',
    termsMonths: '',
    monthlyPayment: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await completeHomeCreditCommerceOrderAction({
        orderId,
        ...values,
      });
      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success('Home Credit order completed.');
      onComplete();
      router.refresh();
    } catch (actionError) {
      console.error('Could not complete the Home Credit order.', actionError);
      setError('The order could not be completed. Please try again.');
      toast.error('The order could not be completed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="space-y-4 rounded-lg border border-primary/30 bg-primary/5 p-4" onSubmit={submit}>
      <div>
        <h3 className="font-semibold">Complete Home Credit sale</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Record the actual downpayment and agreed installment terms. Revenue uses the full sale total.
        </p>
      </div>
      <HomeCreditProcessingFields
        values={values}
        onChange={setValues}
        totalMinor={totalMinor}
      />
      {error && (
        <p className="text-sm text-destructive" role="alert">{error}</p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={busy}>
          Complete sale
        </Button>
        <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
