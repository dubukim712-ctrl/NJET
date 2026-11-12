'use client';

import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { dispatchBranchTransferAction } from '@/data/actions/commerce-admin';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useInvalidateAdminProductsQuery } from '@/data/commerce/admin-products-client';
import type { ProductType } from '@/types/commerce-tables';

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
type Line = { variantId: string; quantity: number; unitIds: string[] };

export function BranchTransferForm({
  branches,
  variants,
  inventory,
  units,
  sourceBranchId: initialSourceBranchId,
  variantId: initialVariantId,
  assignedBranchId,
  onCancel,
  onSaved,
}: {
  branches: { id: string; name: string; active: boolean }[];
  variants: Variant[];
  inventory: { branch_id: string; variant_id: string; stock: number }[];
  units: Unit[];
  sourceBranchId: string;
  variantId: string;
  assignedBranchId: string | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const invalidateProducts = useInvalidateAdminProductsQuery();
  const activeBranches = branches.filter((branch) => branch.active);
  const sourceBranchId = assignedBranchId
    ?? (activeBranches.some((branch) => branch.id === initialSourceBranchId)
      ? initialSourceBranchId
      : activeBranches[0]?.id ?? '');
  const [selectedSourceBranchId, setSourceBranchId] = useState(sourceBranchId);
  const [destinationBranchId, setDestinationBranchId] = useState(
    activeBranches.find((branch) => branch.id !== sourceBranchId)?.id ?? ''
  );
  const [lines, setLines] = useState<Line[]>([{
    variantId: variants.some((variant) => variant.id === initialVariantId) ? initialVariantId : '',
    quantity: 1,
    unitIds: [],
  }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    try {
      const result = await dispatchBranchTransferAction({
        sourceBranchId: selectedSourceBranchId,
        destinationBranchId,
        note: String(formData.get('note') ?? '').trim() || null,
        items: lines.map((line) => ({
          variantId: line.variantId,
          quantity: line.unitIds.length || line.quantity,
          unitIds: line.unitIds,
        })),
      });
      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success('Branch transfer dispatched.');
      void invalidateProducts();
      onSaved();
    } catch (dispatchError) {
      console.error('Could not dispatch branch transfer.', dispatchError);
      const message = 'Could not dispatch this transfer. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const updateLine = (index: number, patch: Partial<Line>) => {
    setLines((current) => current.map((line, lineIndex) =>
      lineIndex === index ? { ...line, ...patch } : line
    ));
  };

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="grid gap-3 sm:grid-cols-2">
        {assignedBranchId ? (
          <p className="self-end rounded-md border px-3 py-3 text-sm">
            From branch: {branches.find((branch) => branch.id === assignedBranchId)?.name ?? 'Assigned branch'}
            {!branches.find((branch) => branch.id === assignedBranchId)?.active && ' (inactive)'}
          </p>
        ) : (
          <Select label="From branch" value={selectedSourceBranchId} onChange={(event) => {
            setSourceBranchId(event.target.value);
            if (destinationBranchId === event.target.value) {
              setDestinationBranchId(activeBranches.find((branch) => branch.id !== event.target.value)?.id ?? '');
            }
            setLines((current) => current.map((line) => ({ ...line, unitIds: [] })));
          }} required>
            {activeBranches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </Select>
        )}
        <Select label="To branch" value={destinationBranchId} onChange={(event) => setDestinationBranchId(event.target.value)} required>
          {activeBranches.filter((branch) => branch.id !== selectedSourceBranchId).map((branch) => (
            <option key={branch.id} value={branch.id}>{branch.name}</option>
          ))}
        </Select>
      </div>
      {lines.map((line, index) => {
        const variant = variants.find((entry) => entry.id === line.variantId);
        const available = units.filter((unit) =>
          unit.variant_id === line.variantId
          && unit.branch_id === selectedSourceBranchId
          && unit.status === 'in_stock'
        );
        const batchStock = inventory.find((entry) =>
          entry.branch_id === selectedSourceBranchId && entry.variant_id === line.variantId
        )?.stock ?? 0;
        return (
          <div key={index} className="space-y-3 rounded-lg border p-3">
            <div className="flex items-start gap-3">
              <Select label={`Variant ${index + 1}`} value={line.variantId} onChange={(event) => updateLine(index, {
                variantId: event.target.value, quantity: 1, unitIds: [],
              })} required containerClassName="flex-1">
                <option value="">Select a variant</option>
                {variants.map((entry) => <option key={entry.id} value={entry.id}>{entry.sku} - {entry.name}</option>)}
              </Select>
              {lines.length > 1 && (
                <Button type="button" variant="ghost" size="icon" aria-label="Remove transfer line" className="mt-7" onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              )}
            </div>
            {variant?.productType === 'ebike' ? (
              <Select
                label="E-bikes to dispatch (select serial numbers)"
                multiple
                size={5}
                value={line.unitIds}
                required
                onChange={(event) => updateLine(index, {
                  unitIds: Array.from(event.target.selectedOptions, (option) => option.value),
                })}
                className="h-auto min-h-32 py-2"
                helperText={`${available.length} identified e-bikes available at the source branch.`}
              >
                {available.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.serial_number} · Motor {unit.motor_number}
                  </option>
                ))}
              </Select>
            ) : variant ? (
              <Input
                label={`Quantity to dispatch (${batchStock} on hand)`}
                type="number"
                min="1"
                max={batchStock}
                value={line.quantity}
                onChange={(event) => updateLine(index, { quantity: Number(event.target.value) })}
                required
              />
            ) : null}
          </div>
        );
      })}
      <Button type="button" variant="outline" onClick={() => setLines((current) => [
        ...current, { variantId: '', quantity: 1, unitIds: [] },
      ])}>
        <Plus className="mr-2 h-4 w-4" aria-hidden="true" /> Add another variant
      </Button>
      <Input name="note" label="Transfer note (optional)" maxLength={500} />
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button
          type="submit"
          loading={busy}
          disabled={
            activeBranches.length < 2
            || !activeBranches.some((branch) => branch.id === selectedSourceBranchId)
            || !activeBranches.some((branch) => branch.id === destinationBranchId)
          }
        >
          Dispatch transfer
        </Button>
      </div>
    </form>
  );
}
