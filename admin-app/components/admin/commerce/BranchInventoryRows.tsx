"use client";

import { ArrowLeftRight, Eye } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { Database } from "@/types/database";

type Product = Database["public"]["Tables"]["products"]["Row"];
type Variant = Database["public"]["Tables"]["product_variants"]["Row"];
type Branch = Database["public"]["Tables"]["branches"]["Row"];
type Inventory = Database["public"]["Tables"]["branch_inventory"]["Row"];

export type InventoryStock = { available: number; onHand: number; needsIds: number; isEbike: boolean };

function StockBadge({ stock, onView }: { stock: InventoryStock; onView: () => void }) {
  return (
    <div className="flex flex-col items-end gap-1">
      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
        stock.available > 0
          ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200'
          : 'bg-muted text-muted-foreground'
      }`}>
        {stock.available > 0 ? `${stock.available} in stock` : 'Out of stock'}
      </span>
      {stock.isEbike && (
        <>
          <span className={`text-xs ${
            stock.needsIds > 0 ? 'font-medium text-amber-800 dark:text-amber-200' : 'text-muted-foreground'
          }`}>
            {stock.needsIds > 0 ? `${stock.needsIds} need IDs` : 'No missing IDs'}
          </span>
          {stock.onHand > 0 && stock.available > 0 && (
            <Button type="button" variant="link" size={null} className="min-h-8 px-1 text-xs" onClick={onView}>
              View IDs
            </Button>
          )}
        </>
      )}
    </div>
  );
}

export function BranchInventoryRows({
  products,
  variants,
  branches,
  activeTransferBranchIds,
  rows,
  canManage,
  stockFor,
  onView,
  onTransfer,
}: {
  products: Product[];
  variants: Variant[];
  branches: Branch[];
  activeTransferBranchIds: string[];
  rows: Inventory[];
  canManage: boolean;
  stockFor: (row: Inventory) => InventoryStock;
  onView: (row: Inventory) => void;
  onTransfer: (branchId: string, variantId: string) => void;
}) {
  const branchById = new Map(branches.map((branch) => [branch.id, branch]));
  const variantById = new Map(variants.map((variant) => [variant.id, variant]));
  const productById = new Map(products.map((product) => [product.id, product]));

  const canTransfer = (row: Inventory) => row.stock > 0 &&
    stockFor(row).available > 0 && activeTransferBranchIds.length > 1 &&
    activeTransferBranchIds.includes(row.branch_id);

  return (
    <>
      <div className="hidden overflow-x-auto rounded-xl border bg-card lg:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-muted/40 text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                Branch
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Product
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Variant
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                SKU
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                Stock
              </th>
              {canManage && (
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => {
              const variant = variantById.get(row.variant_id);
              const product = variant
                ? productById.get(variant.product_id)
                : null;
              return (
                <tr
                  key={`${row.branch_id}-${row.variant_id}`}
                  className="hover:bg-accent/50"
                >
                  <td className="px-4 py-3">
                    {branchById.get(row.branch_id)?.name ?? "Inactive branch"}
                  </td>
                  <td className="px-4 py-3">
                    <Button type="button" variant="link" size={null} className="text-left whitespace-normal" onClick={() => onView(row)}>
                      {product?.name ?? "Inactive product"}
                    </Button>
                  </td>
                  <td className="px-4 py-3">
                    {variant?.name ?? "Inactive variant"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {variant?.sku ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    <StockBadge stock={stockFor(row)} onView={() => onView(row)} />
                  </td>

                  {canManage && (
                    <td className="text-right py-4">
                      <Button
                        type="button"
                        variant="ghost"
                        aria-label={`Transfer ${variant?.name ?? "inventory"} from ${branchById.get(row.branch_id)?.name ?? "branch"}`}
                        title="Transfer inventory"
                        disabled={!variant || !canTransfer(row)}
                        onClick={() =>
                          onTransfer(row.branch_id, row.variant_id)
                        }
                      >
                        <ArrowLeftRight
                          className="mr-2 size-4"
                          aria-hidden="true"
                        />
                        Transfer
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
            <li
              key={`${row.branch_id}-${row.variant_id}`}
              className="rounded-xl border bg-card p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold">
                    <Button type="button" variant="link" size={null} className="text-left whitespace-normal" onClick={() => onView(row)}>
                      {product?.name ?? "Inactive product"}
                    </Button>
                  </h3>
                  <p className="mt-1 text-sm">
                    {variant?.name ?? "Inactive variant"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {variant?.sku ?? "—"}
                  </p>
                </div>
                <StockBadge stock={stockFor(row)} onView={() => onView(row)} />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {branchById.get(row.branch_id)?.name ?? "Inactive branch"}
              </p>
              <div className="mt-3 flex flex-wrap  gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onView(row)}
                >
                  <Eye className="mr-2 size-4" aria-hidden="true" />
                  View inventory
                </Button>
                {canManage && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-9"
                    aria-label={`Transfer ${variant?.name ?? "inventory"} from ${branchById.get(row.branch_id)?.name ?? "branch"}`}
                    title="Transfer inventory"
                    disabled={!variant || !canTransfer(row)}
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
