'use client';

import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Barcode, Boxes, Cog } from 'lucide-react';
import { registerEbikeUnitsAction, saveCommerceInventoryAction } from '@/data/actions/commerce-admin';
import { InventoryReceiptForm } from '@/components/admin/commerce/InventoryReceiptForm';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useInvalidateAdminProductsQuery } from '@/data/commerce/admin-products-client';
import { useInvalidateInventoryValuationQuery } from '@/data/commerce/inventory-valuation-client';
import type { ProductType } from '@/types/commerce-tables';

type Variant = { id: string; name: string; sku: string; productType: ProductType };
type Unit = {
  id: string;
  variant_id: string;
  branch_id: string;
  serial_number: string | null;
  motor_number: string | null;
  status: 'needs_identification' | 'in_stock' | 'in_transit' | 'sold';
};
type Stock = { branch_id: string; variant_id: string; stock: number };

function BatchStockForm({
  branchId,
  variantId,
  stock,
  onCancel,
  onSaved,
}: {
  branchId: string;
  variantId: string;
  stock: number;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const invalidateProducts = useInvalidateAdminProductsQuery();
  const invalidateValuation = useInvalidateInventoryValuationQuery();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    try {
      const result = await saveCommerceInventoryAction({
        branchId,
        variantId,
        stock: Number(formData.get('stock')),
      });
      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success('Stock quantity saved.');
      void invalidateProducts();
      void invalidateValuation();
      onSaved();
    } catch (saveError) {
      console.error('Could not update batch stock.', saveError);
      const message = 'Could not update stock. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={submit}>
      <Input name="stock" label="Adjusted on-hand quantity" type="number" min="0" max="1000000" step="1" defaultValue={stock} required leadingIcon={<Boxes className="h-4 w-4" />} />
      <p className="text-xs text-muted-foreground">
        Quantity increases without a supplier receipt are tracked as unknown-cost stock.
      </p>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" loading={busy}>Save adjustment</Button>
      </div>
    </form>
  );
}

function EbikeUnitForm({
  branchId,
  variantId,
  pendingUnits,
  onCancel,
  onSaved,
}: {
  branchId: string;
  variantId: string;
  pendingUnits: Unit[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const invalidateProducts = useInvalidateAdminProductsQuery();
  const invalidateValuation = useInvalidateInventoryValuationQuery();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unitId, setUnitId] = useState(pendingUnits[0]?.id ?? '');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    try {
      const result = await registerEbikeUnitsAction({
        branchId,
        variantId,
        units: [{
          unitId,
          serialNumber: formData.get('serialNumber'),
          motorNumber: formData.get('motorNumber'),
        }],
      });
      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success('Legacy e-bike identifiers saved.');
      void invalidateProducts();
      void invalidateValuation();
      onSaved();
    } catch (saveError) {
      console.error('Could not save e-bike identifiers.', saveError);
      const message = 'Could not save this e-bike. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="space-y-3" onSubmit={submit}>
      <Select label="Unit" value={unitId} onChange={(event) => setUnitId(event.target.value)} required>
        {pendingUnits.map((unit) => (
          <option key={unit.id} value={unit.id}>
            Complete existing stock unit {unit.id.slice(0, 8)}
          </option>
        ))}
      </Select>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input name="serialNumber" label="Serial number" maxLength={100} required leadingIcon={<Barcode className="h-4 w-4" />} />
        <Input name="motorNumber" label="Motor number" maxLength={100} required leadingIcon={<Cog className="h-4 w-4" />} />
      </div>
      <p className="text-xs text-muted-foreground">
        Identifying a legacy unit does not change stock. New e-bikes must be entered as a costed receipt.
      </p>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" loading={busy} disabled={!unitId}>Save identifiers</Button>
      </div>
    </form>
  );
}

export function InventoryEditor({
  branches,
  variants,
  inventory,
  units,
  branchId: initialBranchId,
  variantId: initialVariantId,
  onClose,
}: {
  branches: { id: string; name: string }[];
  variants: Variant[];
  inventory: Stock[];
  units: Unit[];
  branchId?: string;
  variantId?: string;
  onClose: () => void;
}) {
  const [branchId, setBranchId] = useState(initialBranchId ?? branches[0]?.id ?? '');
  const [variantId, setVariantId] = useState(initialVariantId ?? variants[0]?.id ?? '');
  const [mode, setMode] = useState<'receipt' | 'adjustment'>('receipt');
  const variant = variants.find((entry) => entry.id === variantId);
  const stock = inventory.find((entry) => entry.branch_id === branchId && entry.variant_id === variantId)?.stock ?? 0;
  const pendingUnits = units.filter((unit) =>
    unit.branch_id === branchId && unit.variant_id === variantId && unit.status === 'needs_identification'
  );
  const knownUnitCount = units.filter((unit) =>
    unit.branch_id === branchId && unit.variant_id === variantId
  ).length;
  const sellableUnits = units.filter((unit) =>
    unit.branch_id === branchId && unit.variant_id === variantId && unit.status === 'in_stock'
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant={mode === 'receipt' ? 'default' : 'outline'}
          onClick={() => setMode('receipt')}
        >
          Receive with costs
        </Button>
        <Button
          type="button"
          variant={mode === 'adjustment' ? 'default' : 'outline'}
          onClick={() => setMode('adjustment')}
        >
          Adjust stock / legacy IDs
        </Button>
      </div>
      {mode === 'receipt' ? (
        <InventoryReceiptForm
          branches={branches}
          variants={variants}
          branchId={branchId}
          variantId={variantId}
          onClose={onClose}
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select label="Branch" value={branchId} onChange={(event) => setBranchId(event.target.value)} required>
              <option value="">Select a branch</option>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </Select>
            <Select label="Product variant" value={variantId} onChange={(event) => setVariantId(event.target.value)} required>
              <option value="">Select a variant</option>
              {variants.map((entry) => <option key={entry.id} value={entry.id}>{entry.sku} - {entry.name}</option>)}
            </Select>
          </div>
          {!branchId || !variant ? (
            <p className="text-sm text-muted-foreground">Select a branch and variant to manage its inventory.</p>
          ) : variant.productType === 'ebike' ? (
            pendingUnits.length ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {sellableUnits} identified and sellable · {pendingUnits.length} need serial and motor numbers
                </p>
                <EbikeUnitForm
                  key={`${branchId}-${variantId}-${knownUnitCount}`}
                  branchId={branchId}
                  variantId={variantId}
                  pendingUnits={pendingUnits}
                  onCancel={onClose}
                  onSaved={onClose}
                />
              </div>
            ) : (
              <p className="rounded-lg border p-4 text-sm text-muted-foreground">
                No legacy e-bike units need identification. Record new units as a costed receipt.
              </p>
            )
          ) : (
            <BatchStockForm
              key={`${branchId}-${variantId}-${stock}`}
              branchId={branchId}
              variantId={variantId}
              stock={stock}
              onCancel={onClose}
              onSaved={onClose}
            />
          )}
        </>
      )}
    </div>
  );
}
