'use client';

import { useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { FileImage } from 'lucide-react';
import { toast } from 'sonner';
import { submitOrderPaymentProofAction } from '@/data/actions/commerce-checkout';
import { adminOrdersQueryKey } from '@/data/commerce/admin-orders-client';
import {
  useInvalidateCustomerOrderPaymentQuery,
} from '@/data/commerce/customer-order-payment-client';
import { useInvalidateCustomerOrdersQuery } from '@/data/commerce/customer-orders-client';
import { uploadOrderDocuments } from '@/data/commerce/documents-client';
import { getPaymentProviderLabel } from '@/data/commerce/payment-recipients';
import type { CustomerOrderPayment } from '@/data/commerce/customer-payment';
import { formatPhp } from '@/lib/commerce';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export function OrderPaymentPanel({
  details,
  serverNow,
  userId,
  orderId,
}: {
  details: CustomerOrderPayment;
  serverNow: string;
  userId: string;
  orderId: string;
}) {
  const queryClient = useQueryClient();
  const invalidateCustomerOrders = useInvalidateCustomerOrdersQuery();
  const invalidatePaymentDetails = useInvalidateCustomerOrderPaymentQuery(
    userId,
    orderId
  );
  const serverNowMs = Date.parse(serverNow);
  const deadlineMs = details.payment_expires_at
    ? Date.parse(details.payment_expires_at)
    : null;
  const [now, setNow] = useState(serverNowMs);
  const [reference, setReference] = useState(details.payment_reference ?? '');
  const [proof, setProof] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const refreshedAtExpiry = useRef(false);

  useEffect(() => {
    const offset = serverNowMs - Date.now();
    const interval = window.setInterval(() => setNow(Date.now() + offset), 1000);
    return () => window.clearInterval(interval);
  }, [serverNowMs]);

  const secondsLeft = deadlineMs === null
    ? 0
    : Math.max(0, Math.ceil((deadlineMs - now) / 1000));
  const awaitingPayment = details.status === 'awaiting_payment';
  const expired = details.status === 'expired' ||
    (awaitingPayment && (deadlineMs === null || secondsLeft === 0));
  const canSubmit = !expired && (
    (awaitingPayment && secondsLeft > 0) ||
    details.status === 'awaiting_confirmation'
  );
  const showPaymentInstructions = !expired &&
    (awaitingPayment || details.status === 'awaiting_confirmation');

  useEffect(() => {
    if (awaitingPayment && secondsLeft === 0 && !refreshedAtExpiry.current) {
      refreshedAtExpiry.current = true;
      void invalidatePaymentDetails();
    }
  }, [awaitingPayment, invalidatePaymentDetails, secondsLeft]);

  const submitProof = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setError(null);
    setMessage(null);
    if (!proof) return setError('Choose a payment proof image to continue.');
    if (awaitingPayment && secondsLeft === 0) {
      return setError('The one-hour payment window expired. This order can no longer accept payment.');
    }

    setBusy(true);
    try {
      const upload = await uploadOrderDocuments(proof, []);
      if (upload.error) {
        setError(upload.error);
        return;
      }
      const uploadedProof = upload.documents.find((document) => document.kind === 'payment_proof');
      if (!uploadedProof) {
        setError('The payment proof could not be uploaded. Please try again.');
        return;
      }

      const result = await submitOrderPaymentProofAction({
        orderId: details.order_id,
        objectPath: uploadedProof.objectPath,
        paymentReference: reference.trim() || null,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      const successMessage = result.data.warning
        ?? 'Payment proof submitted. Staff will review your order.';
      setMessage(successMessage);
      if (result.data.warning) toast.warning(result.data.warning);
      else toast.success('Payment proof submitted.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminOrdersQueryKey }),
        invalidateCustomerOrders(),
        invalidatePaymentDetails(),
      ]);
      setProof(null);
      setFileInputKey((key) => key + 1);
    } catch (submitError) {
      console.error('Could not submit payment proof.', submitError);
      setError('Payment proof could not be submitted. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {awaitingPayment && !expired && (
        <section className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
          <p className="font-semibold">Complete payment within one hour</p>
          <p className="mt-1 text-sm">
            Submit your payment proof before the countdown ends or this order will expire.
          </p>
          <p
            className={`mt-3 font-mono text-2xl font-semibold tabular-nums ${secondsLeft <= 300 ? 'text-destructive' : ''}`}
            role="timer"
            aria-label="Time remaining to submit payment proof"
          >
            {String(Math.floor(secondsLeft / 3600)).padStart(2, '0')}:
            {String(Math.floor((secondsLeft % 3600) / 60)).padStart(2, '0')}:
            {String(secondsLeft % 60).padStart(2, '0')}
          </p>
        </section>
      )}

      {expired ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm" role="status">
          The one-hour payment window has expired. This order can no longer accept payment.
        </p>
      ) : details.status === 'awaiting_confirmation' && details.has_payment_proof ? (
        <p className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm" role="status">
          Your payment proof is submitted and awaiting staff review. You can replace it below until the order is confirmed.
        </p>
      ) : null}

      {showPaymentInstructions && (
        <section className="space-y-4 rounded-xl border bg-card p-5 sm:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              {getPaymentProviderLabel(details.payment_provider)}
            </p>
            <h2 className="mt-1 text-xl font-semibold">
              Pay {details.recipient_name} for your {details.payment_method === 'home_credit' ? 'Home Credit downpayment' : 'order'}
            </h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_12rem] sm:items-center">
            <div className="space-y-3">
              <p className="whitespace-pre-line text-sm leading-6 text-muted-foreground">
                {details.account_details}
              </p>
              <p className="text-sm">
                Amount to pay: <strong>{formatPhp(details.payment_due_minor)}</strong>
              </p>
              <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                <li>Scan the QR code or use the account details above.</li>
                <li>Pay the exact amount shown.</li>
                <li>Enter the payment reference and upload your receipt.</li>
              </ol>
            </div>
            <Image
              src={details.payment_qr_url}
              alt={`Payment QR code for ${details.recipient_name}`}
              width={480}
              height={480}
              unoptimized
              className="mx-auto aspect-square w-full max-w-48 rounded-md border bg-white object-contain p-2"
            />
          </div>
        </section>
      )}

      {canSubmit ? (
        <form onSubmit={submitProof} className="space-y-4 rounded-xl border bg-card p-5 sm:p-6">
          <Input
            label="Payment reference (optional)"
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            maxLength={120}
          />
          <Input
            key={fileInputKey}
            label={details.has_payment_proof ? 'Replace payment proof' : 'Payment proof'}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => setProof(event.target.files?.[0] ?? null)}
            helperText="JPG, PNG, or WebP, up to 5 MB."
            leadingIcon={<FileImage className="h-4 w-4" />}
          />
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          {message && <p className="text-sm text-primary" role="status">{message}</p>}
          <Button type="submit" loading={busy} disabled={busy || !proof}>
            {details.has_payment_proof ? 'Replace proof' : 'Submit payment proof'}
          </Button>
        </form>
      ) : !expired && details.status !== 'awaiting_confirmation' ? (
        <p className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
          This order is {details.status.replaceAll('_', ' ')} and can no longer accept payment proof or show payment instructions.
        </p>
      ) : null}
    </div>
  );
}
