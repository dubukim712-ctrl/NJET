'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { saveOrderInvoiceAction } from '@/data/actions/order-documents';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function CompletedOrderDocuments({ orderId, invoiceNo, canManage, onDataChanged }: {
  orderId: string; invoiceNo: string | null; canManage: boolean; onDataChanged: () => void;
}) {
  const [invoiceNumber, setInvoiceNumber] = useState(invoiceNo ?? '');
  const [savedInvoice, setSavedInvoice] = useState(invoiceNo ?? '');
  const [busy, setBusy] = useState(false);

  async function saveInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const result = await saveOrderInvoiceAction({ orderId, invoiceNo: invoiceNumber });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setSavedInvoice(invoiceNumber.trim());
      toast.success('Invoice number saved.');
      onDataChanged();
    } catch {
      toast.error('Could not save the invoice number.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3 border-t pt-4">
      <h3 className="text-sm font-semibold">Sales Receipt</h3>
      {canManage ? (
        <form className="flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={saveInvoice}>
          <Input label="Invoice number" value={invoiceNumber} maxLength={80} required disabled={busy}
            onChange={(event) => setInvoiceNumber(event.target.value)} />
          <Button type="submit" loading={busy} disabled={!invoiceNumber.trim() || invoiceNumber.trim() === savedInvoice}>
            Save invoice number
          </Button>
        </form>
      ) : invoiceNo ? <p className="text-sm">Invoice number {invoiceNo}</p> : null}
      <Button asChild>
        <Link href={`/admin/orders/${orderId}/receipt`} prefetch={false}>Print Receipt</Link>
      </Button>
    </section>
  );
}
