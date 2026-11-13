'use client';

import { useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { createInventoryReceiptAction } from '@/data/actions/commerce-admin';
import { useInvalidateAdminProductsQuery } from '@/data/commerce/admin-products-client';
import { useInvalidateInventoryValuationQuery } from '@/data/commerce/inventory-valuation-client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { ProductType } from '@/types/commerce-tables';

type Variant = { id: string; name: string; sku: string; productType: ProductType };
type ReceiptLine = {
  key: number;
  variantId: string;
  quantity: string;
  supplierUnitCost: string;
  units: string;
};

function localDateTimeValue() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function toMinor(value: string) {
  if (!value.trim()) return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 && amount <= 21474836.47
    ? Math.round(amount * 100)
    : null;
}

function parseUnits(value: string) {
  return value.split(/\r?\n/).filter((line) => line.trim()).map((line) => {
    const parts = line.split(',').map((part) => part.trim());
    const [serialNumber = '', motorNumber = ''] = parts.length === 2 ? parts : [];
    return { serialNumber, motorNumber };
  });
}

export function InventoryReceiptForm({
  branches,
  variants,
  branchId: initialBranchId,
  variantId: initialVariantId,
  onClose,
}: {
  branches: { id: string; name: string }[];
  variants: Variant[];
  branchId?: string;
  variantId?: string;
  onClose: () => void;
}) {
  const invalidateProducts = useInvalidateAdminProductsQuery();
  const invalidateValuation = useInvalidateInventoryValuationQuery();
  const [branchId, setBranchId] = useState(initialBranchId ?? branches[0]?.id ?? '');
  const [lines, setLines] = useState<ReceiptLine[]>([{
    key: 0,
    variantId: initialVariantId ?? variants[0]?.id ?? '',
    quantity: '1',
    supplierUnitCost: '',
    units: '',
  }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateLine = (key: number, patch: Partial<ReceiptLine>) => {
    setLines((current) => current.map((line) =>
      line.key === key ? { ...line, ...patch } : line
    ));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const items = lines.map((line) => {
      const variant = variants.find((entry) => entry.id === line.variantId);
      return {
        variantId: line.variantId,
        quantity: Number(line.quantity),
        unitSupplierCostMinor: toMinor(line.supplierUnitCost),
        units: variant?.productType === 'ebike' ? parseUnits(line.units) : [],
      };
    });
    const sharedCostMinor = toMinor(String(formData.get('sharedCost') ?? ''));
    const receivedAt = new Date(String(formData.get('receivedAt') ?? ''));
    if (!branchId || sharedCostMinor === null || items.some((item) =>
      !item.variantId || !Number.isInteger(item.quantity) || item.quantity < 1
      || item.unitSupplierCostMinor === null
      || (variants.find((variant) => variant.id === item.variantId)?.productType === 'ebike'
        && item.units.length !== item.quantity)
    ) || !Number.isFinite(receivedAt.getTime())) {
      const message = 'Enter a branch, valid costs and quantities, and one serial/motor pair per e-bike.';
      setError(message);
      toast.error(message);
      setBusy(false);
      return;
    }
    const validItems: {
      variantId: string;
      quantity: number;
      unitSupplierCostMinor: number;
      units: { serialNumber: string; motorNumber: string }[];
    }[] = [];
    for (const item of items) {
      if (item.unitSupplierCostMinor === null) {
        setError('Enter a valid supplier unit price for every product.');
        toast.error('Enter a valid supplier unit price for every product.');
        setBusy(false);
        return;
      }
      validItems.push({ ...item, unitSupplierCostMinor: item.unitSupplierCostMinor });
    }

    try {
      const result = await createInventoryReceiptAction({
        branchId,
        supplierName: formData.get('supplierName'),
        documentReference: String(formData.get('documentReference') ?? '') || null,
        receivedAt: receivedAt.toISOString(),
        sharedCostMinor,
        items: validItems,
      });
      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success('Inventory receipt recorded.');
      void invalidateProducts();
      void invalidateValuation();
      onClose();
    } catch (receiptError) {
      console.error('Could not record inventory receipt.', receiptError);
      const message = 'Could not record this receipt. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="space-y-5" onSubmit={submit}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="Receiving branch" value={branchId} onChange={(event) => setBranchId(event.target.value)} required>
          <option value="">Select a branch</option>
          {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
        </Select>
        <Input name="supplierName" label="Supplier" required maxLength={120} />
        <Input name="documentReference" label="Delivery receipt / invoice #" maxLength={120} />
        <Input name="receivedAt" label="Received date and time" type="datetime-local" defaultValue={localDateTimeValue()} required />
        <Input name="sharedCost" label="Shared freight / assembly (PHP)" type="number" min="0" max="21474836.47" step="0.01" defaultValue="0" required />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-medium">Received products</h3>
          <Button
            type="button"
            variant="outline"
            disabled={lines.length >= Math.min(30, variants.length)}
            onClick={() => setLines((current) => [...current, {
              key: Math.max(...current.map((line) => line.key)) + 1,
              variantId: variants.find((variant) => !current.some((line) => line.variantId === variant.id))?.id ?? '',
              quantity: '1',
              supplierUnitCost: '',
              units: '',
            }])}
          >
            <Plus className="mr-2 size-4" aria-hidden="true" />
            Add product
          </Button>
        </div>
        {lines.map((line, index) => {
          const variant = variants.find((entry) => entry.id === line.variantId);
          const usedVariantIds = lines.filter((entry) => entry.key !== line.key).map((entry) => entry.variantId);
          return (
            <fieldset key={line.key} className="space-y-3 rounded-lg border p-3">
              <legend className="px-1 text-sm font-medium">Product {index + 1}</legend>
              <div className="grid gap-3 sm:grid-cols-3">
                <Select
                  label="Product variant"
                  value={line.variantId}
                  onChange={(event) => updateLine(line.key, { variantId: event.target.value })}
                  required
                >
                  <option value="">Select a variant</option>
                  {variants.filter((entry) => !usedVariantIds.includes(entry.id) || entry.id === line.variantId)
                    .map((entry) => <option key={entry.id} value={entry.id}>{entry.sku} - {entry.name}</option>)}
                </Select>
                <Input
                  label="Quantity"
                  type="number"
                  min="1"
                  max={variant?.productType === 'ebike' ? '50' : '1000000'}
                  step="1"
                  value={line.quantity}
                  onChange={(event) => updateLine(line.key, { quantity: event.target.value })}
                  required
                />
                <Input
                  label="Supplier unit price (PHP)"
                  type="number"
                  min="0"
                  max="21474836.47"
                  step="0.01"
                  value={line.supplierUnitCost}
                  onChange={(event) => updateLine(line.key, { supplierUnitCost: event.target.value })}
                  required
                />
              </div>
              {variant?.productType === 'ebike' && (
                <label className="block space-y-1 text-sm font-medium">
                  E-bike serial and motor numbers
                  <textarea
                    className="min-h-28 w-full rounded-md border bg-background px-3 py-2 font-normal"
                    value={line.units}
                    onChange={(event) => updateLine(line.key, { units: event.target.value })}
                    placeholder={'One unit per line: serial number, motor number'}
                    aria-label={`Serial and motor numbers for product ${index + 1}`}
                    required
                  />
                </label>
              )}
              {lines.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLines((current) => current.filter((entry) => entry.key !== line.key))}
                  aria-label={`Remove product ${index + 1}`}
                >
                  <Trash2 className="mr-2 size-4" aria-hidden="true" />
                  Remove product
                </Button>
              )}
            </fieldset>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Shared costs are allocated across products in proportion to supplier line value.
      </p>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button type="submit" loading={busy}>Record receipt</Button>
      </div>
    </form>
  );
}
