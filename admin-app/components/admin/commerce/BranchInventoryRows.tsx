'use client';

import { ArrowLeftRight, Eye } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { Database } from '@/types/database';

type Product = Database['public']['Tables']['products']['Row'];
type Variant = Database['public']['Tables']['product_variants']['Row'];
type Branch = Database['public']['Tables']['branches']['Row'];
type Inventory = Database['public']['Tables']['branch_inventory']['Row'];

export function BranchInventoryRows({
  products,
  variants,
  branches,
  rows,
  canManage,
  stockSummary,
  onView,
  onTransfer,
}: {
  products: Product[];
  variants: Variant[];
  branches: Branch[];
  rows: Inventory[];
  canManage: boolean;
  stockSummary: (row: Inventory) => string;
  onView: (row: Inventory) => void;
  onTransfer: (branchId: string, variantId: string) => void;
}) {
  const branchById = new Map(branches.map((branch) => [branch.id, branch]));
  const variantById = new Map(variants.map((variant) => [variant.id, variant]));
  const productById = new Map(products.map((product) => [product.id, product]));

  return (
    <>
      <div className="hidden overflow-x-auto rounded-xl border bg-card lg:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-muted/40 text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">Branch</th>
              <th scope="col" className="px-4 py-3 font-medium">Product</th>
              <th scope="col" className="px-4 py-3 font-medium">Variant</th>
              <th scope="col" className="px-4 py-3 font-medium">SKU</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Stock</th>
              {canManage && <th scope="col" className="px-4 py-3 text-right font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => {
              const variant = variantById.get(row.variant_id);
              const product = variant ? productById.get(variant.product_id) : null;
              return (
                <tr key={`${row.branch_id}-${row.variant_id}`}>
                  <td className="px-4 py-3">{branchById.get(row.branch_id)?.name ?? 'Inactive branch'}</td>
                  <td className="px-4 py-3">{product?.name ?? 'Inactive product'}</td>
                  <td className="px-4 py-3">{variant?.name ?? 'Inactive variant'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{variant?.sku ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-semibold">{stockSummary(row)}</td>
                  {canManage && (
                    <td className="px-4 py-2 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-9"
                        aria-label={`Transfer ${variant?.name ?? 'inventory'} from ${branchById.get(row.branch_id)?.name ?? 'branch'}`}
                        title="Transfer inventory"
                        disabled={!variant || branches.length < 2}
                        onClick={() => onTransfer(row.branch_id, row.variant_id)}
                      >
                        <ArrowLeftRight className="size-4" aria-hidden="true" />
                      </Button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ul className="space-y-3 lg:hidden">
        {rows.map((row) => {
          const variant = variantById.get(row.variant_id);
          const product = variant ? productById.get(variant.product_id) : null;
          return (
            <li key={`${row.branch_id}-${row.variant_id}`} className="rounded-xl border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold">{product?.name ?? 'Inactive product'}</h3>
                  <p className="mt-1 text-sm">{variant?.name ?? 'Inactive variant'}</p>
                  <p className="text-xs text-muted-foreground">{variant?.sku ?? '—'}</p>
                </div>
                <p className="shrink-0 text-right text-sm font-semibold">{stockSummary(row)}</p>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {branchById.get(row.branch_id)?.name ?? 'Inactive branch'}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => onView(row)}>
                  <Eye className="mr-2 size-4" aria-hidden="true" />
                  View inventory
                </Button>
                {canManage && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-9"
                    aria-label={`Transfer ${variant?.name ?? 'inventory'} from ${branchById.get(row.branch_id)?.name ?? 'branch'}`}
                    title="Transfer inventory"
                    disabled={!variant || branches.length < 2}
                    onClick={() => onTransfer(row.branch_id, row.variant_id)}
                  >
                    <ArrowLeftRight className="size-4" aria-hidden="true" />
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
