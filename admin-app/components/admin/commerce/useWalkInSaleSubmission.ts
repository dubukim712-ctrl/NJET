'use client';

import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createWalkInSaleAction } from '@/data/actions/walk-in-sales';
import { adminOrdersQueryKey } from '@/data/commerce/admin-orders-client';
import { useInvalidateAdminProductsQuery } from '@/data/commerce/admin-products-client';
import { formatPhp } from '@/lib/commerce';
import { walkInSaleSchema } from '@/lib/validations/walk-in-sale';

const uncertainOutcome = 'The sale could not be confirmed. Check Orders before retrying.';

export type WalkInSaleSubmissionError = {
  message: string;
  fieldErrors?: Record<string, string[]>;
  outcomeUncertain?: boolean;
};

export function useWalkInSaleSubmission() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const invalidateProducts = useInvalidateAdminProductsQuery();
  const submitting = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<WalkInSaleSubmissionError | null>(null);

  function clearError() {
    if (!submitting.current) setError(null);
  }

  async function submit(payload: unknown, totalMinor: number, blockingReason: string | null) {
    if (submitting.current) return;
    setError(null);
    if (blockingReason) return setError({ message: blockingReason });

    const validation = walkInSaleSchema.safeParse(payload);
    if (!validation.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of validation.error.issues) {
        const field = issue.path[0] === 'homeCreditDetails' && issue.path.length > 1
          ? issue.path.slice(0, 2).join('.')
          : String(issue.path[0] ?? '');
        (fieldErrors[field] ??= []).push(issue.message);
      }
      setError({ message: 'Review the following sale details.', fieldErrors });
      return;
    }

    const financing = validation.data.homeCreditDetails;
    if (financing && financing.downpayment > totalMinor) {
      setError({
        message: 'Review the Home Credit agreement.',
        fieldErrors: {
          'homeCreditDetails.downpayment': ['Enter a downpayment no greater than ' + formatPhp(totalMinor) + '.'],
        },
      });
      return;
    }
    if (financing && financing.downpayment < totalMinor && financing.monthlyPayment === 0) {
      setError({
        message: 'Review the Home Credit agreement.',
        fieldErrors: {
          'homeCreditDetails.monthlyPayment': ['Enter a monthly payment greater than zero for a financed balance.'],
        },
      });
      return;
    }

    submitting.current = true;
    setBusy(true);
    try {
      // Submit the original values. The server validates and converts financing amounts.
      const result = await createWalkInSaleAction(payload);
      if (!result.success) {
        setError({
          message: result.outcomeUncertain ? uncertainOutcome : result.error,
          fieldErrors: result.fieldErrors,
          outcomeUncertain: result.outcomeUncertain,
        });
        return;
      }
      void invalidateProducts();
      void queryClient.invalidateQueries({ queryKey: adminOrdersQueryKey });
      toast.success('Walk-in sale completed.');
      router.push('/admin/orders');
    } catch (actionError) {
      console.error('Could not confirm the walk-in sale.', actionError);
      setError({ message: uncertainOutcome, outcomeUncertain: true });
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return { busy, error, clearError, submit };
}
