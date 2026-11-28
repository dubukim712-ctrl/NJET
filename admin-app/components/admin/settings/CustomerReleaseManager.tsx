'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { CustomerReleaseForm } from '@/components/admin/settings/CustomerReleaseForm';
import { deleteCustomerRelease, updateCustomerRelease } from '@/data/actions/customer-releases';
import type { ReleaseOrderOption } from '@/lib/customer-releases';
import type { CustomerRelease } from '@/types/customer-releases';

type ReleaseItem = CustomerRelease & { photoUrl: string };

export function CustomerReleaseManager({ items, orders, linkedOrderIds, orderNumbers, userId, canApprove, onDataChanged }: {
  items: ReleaseItem[];
  orders: ReleaseOrderOption[];
  linkedOrderIds: string[];
  orderNumbers: Record<string, string>;
  userId: string;
  canApprove: boolean;
  onDataChanged: () => void;
}) {
  const [editor, setEditor] = useState<ReleaseItem | null>(null);
  const [removing, setRemoving] = useState<ReleaseItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const linked = new Set(linkedOrderIds);
  const availableOrders = orders.filter(({ orderId }) => !linked.has(orderId));

  async function changePublication(item: ReleaseItem) {
    setBusy(true);
    setStatus(null);
    try {
      const result = await updateCustomerRelease(item.id, { is_approved: !item.is_approved });
      if (result.error) setStatus(result.error);
      else onDataChanged();
    } catch {
      setStatus('The release could not be changed.');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!removing) return;
    setBusy(true);
    setDeleteError(null);
    try {
      const result = await deleteCustomerRelease(removing.id);
      if (result.error) setDeleteError(result.error);
      else {
        setStatus(result.warning ?? 'Release removed.');
        setRemoving(null);
        onDataChanged();
      }
    } catch {
      setDeleteError('The release could not be removed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
      <section className="min-w-0 space-y-4 rounded-xl border bg-card p-4 sm:p-5">
        <h2 className="text-lg font-semibold">Upload a release photo</h2>
        <CustomerReleaseForm orders={availableOrders} userId={userId} canApprove={canApprove}
          onSaved={() => { setStatus(canApprove ? 'Release saved.' : 'Photo submitted for admin review.'); onDataChanged(); }} />
      </section>
      <section className="min-w-0 space-y-4 rounded-xl border bg-card p-4 sm:p-5">
        <h2 className="text-lg font-semibold">{canApprove ? 'Gallery and approval queue' : 'Your release photos'}</h2>
        {status && <p role="status" className="rounded-lg bg-muted p-3 text-sm">{status}</p>}
        {items.length === 0 && <p className="text-sm text-muted-foreground">No release photos yet.</p>}
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <li key={item.id} className="min-w-0 overflow-hidden rounded-xl border">
              <div className="relative aspect-[4/3] bg-muted">
                <Image src={item.photoUrl} alt={item.model_name ?? 'Customer release photo'} fill
                  quality={70} sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
              </div>
              <div className="space-y-2 p-3">
                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                  <span className={`rounded-full px-2 py-1 ${item.is_approved ? 'bg-primary/10 text-primary' : 'bg-muted text-foreground'}`}>
                    {item.is_approved ? 'Published' : 'Pending Approval'}
                  </span>
                  {item.order_id && <span className="rounded-full bg-muted px-2 py-1">{orderNumbers[item.order_id] ?? 'Linked order'}</span>}
                </div>
                <h3 className="break-words font-semibold">{item.model_name || 'Customer release'}</h3>
                <p className="break-words text-sm text-muted-foreground">{[item.customer_name, item.branch_name].filter(Boolean).join(' · ')}</p>
                {canApprove && <p className="text-xs text-muted-foreground">Display order {item.display_order}</p>}
                {(canApprove || !item.is_approved) && <div className="flex flex-wrap gap-2">
                  {canApprove && (
                    <>
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => void changePublication(item)}>
                        {item.is_approved ? 'Unpublish' : 'Approve'}
                      </Button>
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => setEditor(item)}>Edit</Button>
                    </>
                  )}
                  <Button size="sm" variant="ghost" disabled={busy} className="text-destructive"
                    onClick={() => { setDeleteError(null); setRemoving(item); }}>Delete</Button>
                </div>}
              </div>
            </li>
          ))}
        </ul>
      </section>
      <Modal open={Boolean(editor)} title="Edit release photo" onClose={() => setEditor(null)}>
        {editor && <CustomerReleaseForm key={editor.id} orders={orders.filter(({ orderId }) => orderId === editor.order_id || !linked.has(orderId))} userId={userId} canApprove={canApprove}
          release={editor} onSaved={() => { setEditor(null); onDataChanged(); }} />}
      </Modal>
      <ConfirmDialog open={Boolean(removing)} onOpenChange={(open) => { if (!open) setRemoving(null); }}
        title="Delete release photo?" description="This removes the release from the gallery and deletes its stored image."
        confirmLabel="Delete photo" destructive loading={busy} error={deleteError} onConfirm={() => void remove()} />
    </div>
  );
}
