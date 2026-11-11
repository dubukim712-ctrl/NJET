'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  generateOrderCertificateAction,
  saveOrderInvoiceAction,
} from '@/data/actions/order-documents';
import { Button } from '@/components/ui/Button';

export function CompletedOrderDocuments({
  orderId,
  invoiceNo,
  isEbikeOrder,
  certificate,
  canManage,
  onDataChanged,
}: {
  orderId: string;
  invoiceNo: string | null;
  isEbikeOrder: boolean;
  certificate: { url: string | null } | null;
  canManage: boolean;
  onDataChanged: () => void;
}) {
  const router = useRouter();
  const [invoiceNumber, setInvoiceNumber] = useState(invoiceNo ?? '');
  const [savedInvoiceNo, setSavedInvoiceNo] = useState(invoiceNo ?? '');
  const [busy, setBusy] = useState<'invoice' | 'certificate' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const saveInvoice = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy('invoice');
    setError(null);
    try {
      const result = await saveOrderInvoiceAction({ orderId, invoiceNo: invoiceNumber });
      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      setSavedInvoiceNo(invoiceNumber.trim());
      toast.success('Invoice number saved.');
      onDataChanged();
      router.refresh();
    } catch (actionError) {
      console.error('Could not save order invoice.', actionError);
      setError('Could not save the invoice number. Please try again.');
      toast.error('Could not save the invoice number. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const generateCertificate = async () => {
    setBusy('certificate');
    setError(null);
    try {
      const result = await generateOrderCertificateAction({ orderId });
      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success('Ownership certificate generated.');
      if (result.data.warning) toast.warning(result.data.warning);
      onDataChanged();
      router.refresh();
    } catch (actionError) {
      console.error('Could not generate ownership certificate.', actionError);
      setError('Could not generate the certificate. Please try again.');
      toast.error('Could not generate the certificate. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  if (!canManage && !invoiceNo && !(isEbikeOrder && certificate)) return null;

  return (
    <section className="space-y-3 border-t pt-4">
      <h3 className="text-sm font-semibold">Completed order documents</h3>
      {canManage ? (
        <form onSubmit={saveInvoice} className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="w-full space-y-1 text-sm sm:max-w-xs">
            <span>Invoice number</span>
            <input
              value={invoiceNumber}
              onChange={(event) => setInvoiceNumber(event.target.value)}
              maxLength={80}
              required
              disabled={busy !== null}
              className="min-h-10 w-full rounded-md border bg-background px-3"
            />
          </label>
          <Button
            type="submit"
            size="sm"
            loading={busy === 'invoice'}
            disabled={
              busy !== null ||
              !invoiceNumber.trim() ||
              invoiceNumber.trim() === savedInvoiceNo
            }
          >
            Save invoice number
          </Button>
        </form>
      ) : invoiceNo ? (
        <p className="text-sm">
          <span className="text-muted-foreground">Invoice number:</span> {invoiceNo}
        </p>
      ) : null}

      {isEbikeOrder && (
        <div className="flex flex-wrap items-center gap-2">
          {canManage && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              loading={busy === 'certificate'}
              disabled={busy !== null}
              onClick={generateCertificate}
            >
              {certificate ? 'Regenerate certificate' : 'Generate certificate'}
            </Button>
          )}
          {certificate?.url ? (
            <a
              href={certificate.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-10 items-center rounded-md border px-3 text-sm font-medium hover:bg-accent"
            >
              Download ownership certificate
            </a>
          ) : certificate ? (
            <span className="text-sm text-destructive">
              Certificate link unavailable; refresh this page.
            </span>
          ) : canManage ? (
            <p className="text-xs text-muted-foreground">
              Sample certificate; not an official document.
            </p>
          ) : null}
        </div>
      )}
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
    </section>
  );
}
