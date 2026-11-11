'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowDownToLine } from 'lucide-react';
import { receiveBranchTransferAction } from '@/data/actions/commerce-admin';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { BranchTransferForm } from '@/components/admin/commerce/BranchTransferForm';
import type { Database } from '@/types/database';
import type { ProductType } from '@/types/commerce-tables';

type Transfer = Database['public']['Tables']['branch_transfers']['Row'];
type TransferItem = Database['public']['Tables']['branch_transfer_items']['Row'];
type Variant = { id: string; sku: string; name: string; productType: ProductType };
type Unit = {
  id: string;
  variant_id: string;
  branch_id: string;
  serial_number: string | null;
  motor_number: string | null;
  status: string;
  transfer_id: string | null;
};
export function BranchTransferManager({
  branches,
  variants,
  inventory,
  units,
  transfers,
  transferItems,
  transferUnits,
  canManage,
  assignedBranchId,
  transferRequest,
  onCloseTransfer,
}: {
  branches: { id: string; name: string; active: boolean }[];
  variants: Variant[];
  inventory: { branch_id: string; variant_id: string; stock: number }[];
  units: Unit[];
  transfers: Transfer[];
  transferItems: TransferItem[];
  transferUnits: { transferItemId: string; serial_number: string | null; motor_number: string | null }[];
  canManage: boolean;
  assignedBranchId: string | null;
  transferRequest: { sourceBranchId: string; variantId: string } | null;
  onCloseTransfer: () => void;
}) {
  const router = useRouter();
  const [receivingId, setReceivingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const branchName = new Map(branches.map((branch) => [branch.id, branch.name]));
  const variantName = new Map(variants.map((variant) => [variant.id, `${variant.sku} · ${variant.name}`]));

  const receive = async (transferId: string) => {
    setReceivingId(transferId);
    setError(null);
    try {
      const result = await receiveBranchTransferAction({ transferId });
      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success('Branch transfer received.');
      router.refresh();
    } catch (receiveError) {
      console.error('Could not receive branch transfer.', receiveError);
      const message = 'Could not receive this transfer. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      setReceivingId(null);
    }
  };

  return (
    <section className="space-y-4 rounded-xl border bg-card p-5">
      <div>
        <h2 className="text-xl font-semibold">Branch transfers</h2>
        <p className="mt-1 text-sm text-muted-foreground">Dispatch removes stock from the source; receipt adds it to the destination.</p>
      </div>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      {!transfers.length ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No branch transfers yet.</p>
      ) : (
        <ul className="divide-y">
          {transfers.map((transfer) => {
            const items = transferItems.filter((item) => item.transfer_id === transfer.id);
            return (
              <li key={transfer.id} className="space-y-2 py-4 first:pt-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {branchName.get(transfer.source_branch_id)} <span aria-hidden="true">→</span> {branchName.get(transfer.destination_branch_id)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(transfer.dispatched_at).toLocaleString()} · {transfer.status.replace('_', ' ')}
                    </p>
                  </div>
                  {canManage && transfer.status === 'in_transit'
                    && (!assignedBranchId || transfer.destination_branch_id === assignedBranchId) && (
                    <Button type="button" size="sm" loading={receivingId === transfer.id} onClick={() => receive(transfer.id)}>
                      <ArrowDownToLine className="mr-2 h-4 w-4" aria-hidden="true" /> Receive
                    </Button>
                  )}
                  {transfer.status === 'received' && <span className="text-sm text-muted-foreground">Received</span>}
                </div>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {items.map((item) => (
                    <li key={item.id}>
                      {variantName.get(item.variant_id) ?? 'Variant'} · {item.quantity}
                      {transferUnits.some((unit) =>
                        unit.transferItemId === item.id && unit.serial_number
                      ) && (
                        <span className="block text-xs">
                          {transferUnits
                            .filter((unit) => unit.transferItemId === item.id && unit.serial_number)
                            .map((unit) => `${unit.serial_number} (motor ${unit.motor_number})`)
                            .join(', ')}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                {transfer.note && <p className="text-sm">{transfer.note}</p>}
              </li>
            );
          })}
        </ul>
      )}
      <Modal
        open={transferRequest !== null}
        title="Transfer inventory"
        size="wide"
        onClose={onCloseTransfer}
      >
        {canManage && branches.filter((branch) => branch.active).length > 1 && transferRequest && (
          <BranchTransferForm
            key={`${transferRequest.sourceBranchId}-${transferRequest.variantId}`}
            branches={branches}
            variants={variants}
            inventory={inventory}
            units={units}
            sourceBranchId={transferRequest.sourceBranchId}
            variantId={transferRequest.variantId}
            assignedBranchId={assignedBranchId}
            onCancel={onCloseTransfer}
            onSaved={onCloseTransfer}
          />
        )}
      </Modal>
    </section>
  );
}
