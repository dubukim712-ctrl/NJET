'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { InventoryEditor } from '@/components/admin/commerce/InventoryEditor';
import { BranchInventoryRows } from '@/components/admin/commerce/BranchInventoryRows';
import type { Database } from '@/types/database';

type Product = Database['public']['Tables']['products']['Row'];
type Variant = Database['public']['Tables']['product_variants']['Row'];
type Branch = Database['public']['Tables']['branches']['Row'];
type Inventory = Database['public']['Tables']['branch_inventory']['Row'];
type Unit = Database['public']['Tables']['ebike_units']['Row'];

export function BranchInventorySection({
  products,
  variants,
  branches,
  assignedBranchId,
  inventory,
  units,
  canManageProducts,
  onTransfer,
}: {
  products: Product[];
  variants: Variant[];
  branches: Branch[];
  assignedBranchId: string | null;
  inventory: Inventory[];
  units: Unit[];
  canManageProducts: boolean;
  onTransfer: (branchId: string, variantId: string) => void;
}) {
  const [branchId, setBranchId] = useState(assignedBranchId ?? 'all');
  const [selected, setSelected] = useState<Inventory | null>(null);
  const [receiveStockOpen, setReceiveStockOpen] = useState(false);
  const branchById = new Map(branches.map((branch) => [branch.id, branch]));
  const variantById = new Map(variants.map((variant) => [variant.id, variant]));
  const productById = new Map(products.map((product) => [product.id, product]));
  const stockVariants = variants.flatMap((variant) => {
    const product = productById.get(variant.product_id);
    return product
      ? [{
          id: variant.id,
          name: variant.name,
          sku: variant.sku,
          productType: product.product_type,
        }]
      : [];
  });
  const unitCounts = new Map<string, { identified: number; needsIdentification: number }>();
  for (const unit of units) {
    if (unit.status !== 'in_stock' && unit.status !== 'needs_identification') continue;
    const key = `${unit.branch_id}:${unit.variant_id}`;
    const counts = unitCounts.get(key) ?? { identified: 0, needsIdentification: 0 };
    if (unit.status === 'in_stock') counts.identified += 1;
    else counts.needsIdentification += 1;
    unitCounts.set(key, counts);
  }
  const selectedBranchId = assignedBranchId ?? branchId;
  const rows = inventory.filter((row) =>
    selectedBranchId === 'all' || row.branch_id === selectedBranchId
  );
  const selectedVariant = selected ? variantById.get(selected.variant_id) : null;
  const selectedProduct = selectedVariant ? productById.get(selectedVariant.product_id) : null;
  const selectedUnits = selected
    ? units.filter((unit) =>
        unit.variant_id === selected.variant_id
        && unit.branch_id === selected.branch_id
        && unit.status !== 'sold'
        && unit.status !== 'in_transit'
      )
    : [];
  const identified = selectedUnits.filter((unit) => unit.status === 'in_stock').length;
  const needsIdentification = selectedUnits.filter(
    (unit) => unit.status === 'needs_identification'
  ).length;

  const stockSummary = (row: Inventory) => {
    const variant = variantById.get(row.variant_id);
    const product = variant ? productById.get(variant.product_id) : null;
    if (product?.product_type !== 'ebike') return `${row.stock} on hand`;
    const counts = unitCounts.get(`${row.branch_id}:${row.variant_id}`)
      ?? { identified: 0, needsIdentification: 0 };
    return `${counts.identified} identified · ${counts.needsIdentification} need IDs`;
  };

  return (
    <section className="space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Branch inventory</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Update on-hand stock; orders do not hold stock until confirmed.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-end">
          {canManageProducts && (
            <Button
              type="button"
              size="sm"
              className="h-11 w-full sm:w-auto"
              disabled={!branches.length || !stockVariants.length}
              onClick={() => setReceiveStockOpen(true)}
            >
              Receive Stock
            </Button>
          )}
          {assignedBranchId ? (
            <div className="w-full space-y-1 sm:w-56 sm:shrink-0">
              <p className="text-sm font-medium">Assigned branch</p>
              <p className="flex h-11 items-center rounded-md border bg-muted/40 px-3 text-sm">
                {branches[0]?.name ?? 'Assigned branch'}
              </p>
            </div>
          ) : (
            <Select
              label="Branch"
              value={branchId}
              onChange={(event) => setBranchId(event.target.value)}
              containerClassName="w-full sm:w-56 sm:shrink-0"
            >
              <option value="all">All branches</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </Select>
          )}
        </div>
      </header>

      {canManageProducts && (!branches.length || !stockVariants.length) && (
        <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
          Add an active branch and product variant before recording stock.
        </p>
      )}
      {!rows.length ? (
        <p className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">
          No inventory records for this branch.
        </p>
      ) : (
        <BranchInventoryRows
          products={products}
          variants={variants}
          branches={branches}
          rows={rows}
          canManage={canManageProducts}
          stockSummary={stockSummary}
          onView={setSelected}
          onTransfer={onTransfer}
        />
      )}

      <Modal
        open={receiveStockOpen}
        title="Receive Stock"
        size="wide"
        onClose={() => setReceiveStockOpen(false)}
      >
        {receiveStockOpen && (
          <InventoryEditor
            branches={branches}
            variants={stockVariants}
            inventory={inventory}
            units={units}
            branchId={selectedBranchId === 'all' ? undefined : selectedBranchId}
            onClose={() => setReceiveStockOpen(false)}
          />
        )}
      </Modal>

      <Modal
        open={selected !== null}
        title="Branch inventory details"
        onClose={() => setSelected(null)}
      >
        {selected && (
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-muted-foreground">Branch</dt>
              <dd className="font-medium">{branchById.get(selected.branch_id)?.name ?? 'Inactive branch'}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Product</dt>
              <dd className="font-medium">{selectedProduct?.name ?? 'Inactive product'}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Variant</dt>
              <dd className="font-medium">{selectedVariant?.name ?? 'Inactive variant'}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">SKU</dt>
              <dd className="font-medium">{selectedVariant?.sku ?? '—'}</dd>
            </div>
            {selectedProduct?.product_type === 'ebike' ? (
              <>
                <div>
                  <dt className="text-sm text-muted-foreground">Identified units</dt>
                  <dd className="font-medium">{identified}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Units needing IDs</dt>
                  <dd className="font-medium">{needsIdentification}</dd>
                </div>
                {selectedUnits.length > 0 && (
                  <div className="space-y-2 sm:col-span-2">
                    <dt className="text-sm font-medium">Unit identifiers</dt>
                    <ul className="divide-y rounded-lg border">
                      {selectedUnits.map((unit) => (
                        <li key={unit.id} className="flex flex-wrap justify-between gap-2 p-3 text-sm">
                          <span>{unit.serial_number ?? 'Serial not entered'} · {unit.motor_number ?? 'Motor not entered'}</span>
                          <span className="text-muted-foreground">
                            {unit.status === 'in_stock' ? 'Identified' : 'Needs IDs'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <div>
                <dt className="text-sm text-muted-foreground">Quantity on hand</dt>
                <dd className="font-medium">{selected.stock}</dd>
              </div>
            )}
            {selectedVariant?.specifications && Object.keys(selectedVariant.specifications).length > 0 && (
              <div className="space-y-2 sm:col-span-2">
                <dt className="text-sm font-medium">Specifications</dt>
                <dl className="grid gap-2 sm:grid-cols-2">
                  {Object.entries(selectedVariant.specifications).map(([name, value]) => (
                    <div key={name}>
                      <dt className="text-xs text-muted-foreground">{name}</dt>
                      <dd className="text-sm">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </dl>
        )}
      </Modal>
    </section>
  );
}
