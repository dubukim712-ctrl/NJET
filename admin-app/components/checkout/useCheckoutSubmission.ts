'use client';

import { checkoutOptionsQueryKey } from '@/data/commerce/checkout-options-client';
import { cartVariantsQueryKey, storefrontCatalogQueryKey } from '@/data/commerce/catalog-query-keys';

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createCommerceOrderAction } from '@/data/actions/commerce-checkout';
import { customerProfileQueryKey } from '@/data/commerce/customer-query-keys';
import { adminOrdersQueryKey } from '@/data/commerce/admin-orders-client';
import { useInvalidateCustomerOrdersQuery } from '@/data/commerce/customer-orders-client';
import { uploadOrderDocuments, type UploadedDocument } from '@/data/commerce/documents-client';
import { orderConfirmationPath } from '@/lib/customer-confirmation';
import { checkoutSchema, type CheckoutInput } from '@/lib/validations/commerce';

const ambiguousOrderError =
  'We could not confirm whether your order was placed. Retry with the same checkout details, or check your order history before refreshing this page or starting a new checkout.';

export type CheckoutSubmissionError = {
  message: string;
  nextStep?: 'order-history' | 'sign-in';
};

type Submission = {
  form: HTMLFormElement;
  customerId: string;
  identityFiles: File[];
  hasEbike: boolean;
  getCheckoutError: () => string | null;
  payload: Omit<CheckoutInput, 'submissionId' | 'documents' | 'termsAccepted' | 'privacyAccepted'> & {
    termsAccepted: boolean;
    privacyAccepted: boolean;
  };
};

type Attempt = {
  signature: string;
  id: string;
  identityFiles: File[];
  documents?: UploadedDocument[];
};

export function useCheckoutSubmission(clear: () => { success: boolean }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const invalidateCustomerOrders = useInvalidateCustomerOrdersQuery();
  const attemptRef = useRef<Attempt | null>(null);
  const busyRef = useRef(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<CheckoutSubmissionError | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | undefined>();
  const [retryable, setRetryable] = useState(false);

  useEffect(() => {
    const form = formRef.current;
    if (fieldErrors) {
      const target = form?.querySelector<HTMLElement>(
        '[aria-invalid="true"]:not([disabled]):not([type="hidden"])',
      ) ?? form?.querySelector<HTMLElement>('[data-checkout-items-error]')
        ?? form?.querySelector<HTMLElement>('[data-checkout-error]');
      target?.focus();
    } else if (submissionError) {
      form?.querySelector<HTMLElement>('[data-checkout-submission-error]')?.focus();
    }
  }, [fieldErrors, submissionError]);

  async function submit({
    form, customerId, identityFiles, hasEbike, getCheckoutError, payload,
  }: Submission) {
    if (busyRef.current) return;
    formRef.current = form;
    setError(null);
    setFieldErrors(undefined);
    setSubmissionError(null);

    const signature = JSON.stringify([customerId, payload]);
    let attempt = attemptRef.current;
    const sameAttempt = attempt?.signature === signature &&
      attempt.identityFiles.length === identityFiles.length &&
      attempt.identityFiles.every((file, index) => file === identityFiles[index]);
    if (!attempt || !sameAttempt) {
      attempt = { signature, id: crypto.randomUUID(), identityFiles };
      attemptRef.current = attempt;
      setRetryable(false);
    }

    if (!(sameAttempt && retryable)) {
      const checkoutError = getCheckoutError();
      if (checkoutError) return setError(checkoutError);
    }

    const orderInput = { ...payload, submissionId: attempt.id };
    const validation = checkoutSchema.safeParse({ ...orderInput, documents: [] });
    if (!validation.success) {
      setError('Please review the checkout details.');
      setFieldErrors(validation.error.flatten().fieldErrors);
      return;
    }

    busyRef.current = true;
    setBusy(true);
    try {
      if (!attempt.documents) {
        const uploaded = hasEbike
          ? await uploadOrderDocuments(null, identityFiles)
          : { documents: [], error: null };
        if (uploaded.error) return setSubmissionError({ message: uploaded.error });
        attempt.documents = uploaded.documents;
      }

      const result = await createCommerceOrderAction({ ...orderInput, documents: attempt.documents });
      if (!result.success) {
        if (result.fieldErrors && Object.keys(result.fieldErrors).length) {
          setError(result.error);
          setFieldErrors(result.fieldErrors);
        } else if (result.retryable) {
          setSubmissionError({ message: ambiguousOrderError, nextStep: 'order-history' });
        } else {
          setSubmissionError({
            message: result.error,
            nextStep: result.requiresLogin ? 'sign-in' : undefined,
          });
        }
        setRetryable(Boolean(result.retryable));
        return;
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminOrdersQueryKey }),
        queryClient.invalidateQueries({ queryKey: checkoutOptionsQueryKey }),
        queryClient.invalidateQueries({ queryKey: cartVariantsQueryKey }),
        queryClient.invalidateQueries({ queryKey: storefrontCatalogQueryKey }),
        invalidateCustomerOrders(),
        queryClient.invalidateQueries({ queryKey: [...customerProfileQueryKey, customerId] }),
      ]);
      if (!clear().success) toast.error('Order placed, but your local cart could not be cleared.');
      router.push(orderConfirmationPath(result.data.orderId));
    } catch (submissionError) {
      console.error('Could not complete checkout submission.', submissionError);
      setRetryable(Boolean(attempt.documents));
      setSubmissionError(attempt.documents
        ? { message: ambiguousOrderError, nextStep: 'order-history' }
        : { message: 'A document could not be uploaded. Please try again.' });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return { busy, error, submissionError, fieldErrors, retryable, submit };
}
