'use client';

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createCommerceOrderAction } from '@/data/actions/commerce-checkout';
import { adminOrdersQueryKey } from '@/data/commerce/admin-orders-client';
import { useInvalidateCustomerOrdersQuery } from '@/data/commerce/customer-orders-client';
import { uploadOrderDocuments, type UploadedDocument } from '@/data/commerce/documents-client';
import { checkoutSchema, type CheckoutInput } from '@/lib/validations/commerce';

const ambiguousOrderError =
  'We could not confirm whether your order was placed. Retry with the same checkout details, or check your order history before refreshing this page or starting a new checkout.';

type Submission = {
  form: HTMLFormElement;
  customerId: string;
  identityFiles: File[];
  hasEbike: boolean;
  getCheckoutError: () => string | null;
  paymentProofRequired: boolean;
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
  const [requiresLogin, setRequiresLogin] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | undefined>();
  const [retryable, setRetryable] = useState(false);

  useEffect(() => {
    if (!fieldErrors) return;
    const form = formRef.current;
    const target = form?.querySelector<HTMLElement>(
      '[aria-invalid="true"]:not([disabled]):not([type="hidden"])',
    ) ?? form?.querySelector<HTMLElement>('[data-checkout-items-error]')
      ?? form?.querySelector<HTMLElement>('[data-checkout-error]');
    target?.focus();
  }, [fieldErrors]);

  async function submit({
    form, customerId, identityFiles, hasEbike, getCheckoutError, paymentProofRequired, payload,
  }: Submission) {
    if (busyRef.current) return;
    formRef.current = form;
    setError(null);
    setFieldErrors(undefined);
    setRequiresLogin(false);

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
        if (uploaded.error) return setError(uploaded.error);
        attempt.documents = uploaded.documents;
      }

      const result = await createCommerceOrderAction({ ...orderInput, documents: attempt.documents });
      if (!result.success) {
        setError(result.retryable ? ambiguousOrderError : result.error);
        setFieldErrors(result.fieldErrors);
        setRequiresLogin(Boolean(result.requiresLogin));
        setRetryable(Boolean(result.retryable));
        return;
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminOrdersQueryKey }),
        invalidateCustomerOrders(),
      ]);
      if (!clear().success) toast.error('Order placed, but your local cart could not be cleared.');
      const orderId = encodeURIComponent(result.data.orderId);
      router.push(paymentProofRequired ? `/dashboard/orders/${orderId}` : `/dashboard/orders?placed=${orderId}`);
    } catch (submissionError) {
      console.error('Could not complete checkout submission.', submissionError);
      setRetryable(Boolean(attempt.documents));
      setError(attempt.documents
        ? ambiguousOrderError
        : 'A document could not be uploaded. Please try again.');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return { busy, error, requiresLogin, fieldErrors, retryable, submit };
}
