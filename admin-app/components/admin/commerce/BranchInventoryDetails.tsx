'use client';

import { Modal } from '@/components/ui/Modal';
import type { Database } from '@/types/database';

type Unit = Database['public']['Tables']['ebike_units']['Row'];

export function BranchInventoryDetails({
  branchName,
  productName,
  variantName,
  sku,
  stock,
  isEbike,
  units,
  specifications,
  onClose,
}: {
  branchName: string;
  productName: string;
  variantName: string;
  sku: string;
  stock: number;
  isEbike: boolean;
  units: Unit[];
  specifications?: Record<string, string> | null;
  onClose: () => void;
}) {
  const details = [
    ['Branch', branchName],
    ['Product', productName],
    ['Variant', variantName],
    ['SKU', sku],
    ...(!isEbike ? [['Quantity on hand', stock]] : []),
  ];

  return (
    <Modal open title="Branch inventory details" size="wide" onClose={onClose}>
      <dl className="grid gap-4 sm:grid-cols-2">
        {details.map(([label, value]) => (
          <div key={label}>
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="break-words font-medium">{value}</dd>
          </div>
        ))}
      </dl>
      {isEbike && (
        <section aria-label="Unit identifiers" className="mt-5 space-y-2">
          <h3 className="text-sm font-semibold">Unit identifiers</h3>
          {units.length ? (
            <ul className="divide-y rounded-lg border">
              {units.map((unit) => {
                const needsIds = unit.status === 'needs_identification';
                const reserved = unit.status === 'warranty_reserved' || Boolean(unit.order_item_id);
                return (
                  <li key={unit.id} className="grid gap-2 p-3 text-sm sm:grid-cols-[1fr_1fr_auto] sm:items-center">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Serial number</p>
                      <p className="break-all font-mono">{unit.serial_number ?? 'Not entered'}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Motor number</p>
                      <p className="break-all font-mono">{unit.motor_number ?? 'Not entered'}</p>
                    </div>
                    <span className={`w-fit rounded-full px-2 py-1 text-xs font-medium ${
                      needsIds || reserved
                        ? 'bg-amber-500/15 text-amber-800 dark:text-amber-200'
                        : 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200'
                    }`}>
                      {needsIds ? 'Needs IDs' : reserved ? 'Reserved' : 'Available'}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No units are currently held at this branch.</p>
          )}
        </section>
      )}
      {specifications && Object.keys(specifications).length > 0 && (
        <section className="mt-5 space-y-2">
          <h3 className="text-sm font-semibold">Specifications</h3>
          <dl className="grid gap-2 sm:grid-cols-2">
            {Object.entries(specifications).map(([name, value]) => (
              <div key={name}>
                <dt className="text-xs text-muted-foreground">{name}</dt>
                <dd className="text-sm">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </Modal>
  );
}
