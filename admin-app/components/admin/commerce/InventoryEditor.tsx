'use client';

import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Barcode, Boxes, Cog } from 'lucide-react';
import { registerEbikeUnitsAction, saveCommerceInventoryAction } from '@/data/actions/commerce-admin';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useInvalidateAdminProductsQuery } from '@/data/commerce/admin-products-client';
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
      <Input name="stock" label="On-hand quantity" type="number" min="0" max="1000000" step="1" defaultValue={stock} required leadingIcon={<Boxes className="h-4 w-4" />} />
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" loading={busy}>Save quantity</Button>
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unitId, setUnitId] = useState('');

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
          unitId: unitId || null,
          serialNumber: formData.get('serialNumber'),
          motorNumber: formData.get('motorNumber'),
        }],
      });
      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success(unitId ? 'E-bike identifiers saved.' : 'E-bike added to stock.');
      void invalidateProducts();
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
      <Select label="Unit" value={unitId} onChange={(event) => setUnitId(event.target.value)}>
        <option value="">Add newly received e-bike</option>
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
        Existing units needing identification retain their stock count; a new unit increases stock by one.
      </p>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" loading={busy}>{unitId ? 'Save identifiers' : 'Add e-bike to stock'}</Button>
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
        <BatchStockForm
          key={`${branchId}-${variantId}-${stock}`}
          branchId={branchId}
          variantId={variantId}
          stock={stock}
          onCancel={onClose}
          onSaved={onClose}
        />
      )}
    </div>
  );
}
