"use client";

import dynamic from 'next/dynamic';

import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { BranchInventoryDetails } from "@/components/admin/commerce/BranchInventoryDetails";
import { TablePagination } from "@/components/ui/TablePagination";
import { Select } from "@/components/ui/Select";
import { BranchInventoryRows, type InventoryStock } from "@/components/admin/commerce/BranchInventoryRows";
import type { Database } from "@/types/database";

type Product = Database["public"]["Tables"]["products"]["Row"];
type Variant = Database["public"]["Tables"]["product_variants"]["Row"];
type Branch = Database["public"]["Tables"]["branches"]["Row"];
type Inventory = Database["public"]["Tables"]["branch_inventory"]["Row"];
type Unit = Database["public"]["Tables"]["ebike_units"]["Row"];

const pageSize = 10;

const InventoryEditor = dynamic(() => import('./InventoryEditor').then((module) => module.InventoryEditor));

export function BranchInventorySection({
  products,
  variants,
  branches,
  transferBranches,
  assignedBranchId,
  inventory,
  units,
  canManageProducts,
  onTransfer,
}: {
  products: Product[];
  variants: Variant[];
  branches: Branch[];
  transferBranches: { id: string; active: boolean }[];
  assignedBranchId: string | null;
  inventory: Inventory[];
  units: Unit[];
  canManageProducts: boolean;
  onTransfer: (branchId: string, variantId: string) => void;
}) {
  const [branchId, setBranchId] = useState(assignedBranchId ?? "all");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Inventory | null>(null);
  const [receiveStockOpen, setReceiveStockOpen] = useState(false);
  const branchById = useMemo(() => new Map(branches.map((branch) => [branch.id, branch])), [branches]);
  const variantById = useMemo(() => new Map(variants.map((variant) => [variant.id, variant])), [variants]);
  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const stockVariants = useMemo(() => variants.flatMap((variant) => {
    const product = productById.get(variant.product_id);
    return product && product.active && variant.active
      ? [
          {
            id: variant.id,
            name: variant.name,
            modelName: product.name,
            sku: variant.sku,
            productType: product.product_type,
          },
        ]
      : [];
  }), [variants, productById]);
  const { unitsByRow, unitCounts } = useMemo(() => {
    const unitsByRow = new Map<string, Unit[]>();
    const unitCounts = new Map<
      string,
      { available: number; reserved: number; needsIds: number }
    >();
    for (const unit of units) {
      if (unit.status !== "in_stock" && unit.status !== "needs_identification" && unit.status !== "warranty_reserved")
        continue;
      const key = `${unit.branch_id}:${unit.variant_id}`;
      const held = unitsByRow.get(key) ?? [];
      held.push(unit);
      unitsByRow.set(key, held);
      const counts = unitCounts.get(key) ?? { available: 0, reserved: 0, needsIds: 0 };
      if (unit.status === "needs_identification") counts.needsIds += 1;
      else if (unit.status === "warranty_reserved" || unit.order_item_id) counts.reserved += 1;
      else counts.available += 1;
      unitCounts.set(key, counts);
    }
    return { unitsByRow, unitCounts };
  }, [units]);
  const selectedBranchId = assignedBranchId ?? branchId;
  const branchRows = useMemo(() => inventory.filter(
    (row) => selectedBranchId === "all" || row.branch_id === selectedBranchId,
  ), [inventory, selectedBranchId]);
  const stockFor = useCallback((row: Inventory): InventoryStock => {
    const variant = variantById.get(row.variant_id);
    const isEbike = productById.get(variant?.product_id ?? "")?.product_type === "ebike";
    const counts = unitCounts.get(`${row.branch_id}:${row.variant_id}`);
    return {
      available: isEbike ? counts?.available ?? 0 : row.stock,
      onHand: isEbike ? (counts?.available ?? 0) + (counts?.needsIds ?? 0) + (counts?.reserved ?? 0) : row.stock,
      needsIds: counts?.needsIds ?? 0,
      isEbike,
    };
  }, [variantById, productById, unitCounts]);
  const searchTerm = search.trim().toLowerCase();
  const rows = useMemo(() => branchRows.filter((row) => {
    const variant = variantById.get(row.variant_id);
    const product = productById.get(variant?.product_id ?? "");
    if (searchTerm && ![product?.name, variant?.name, variant?.sku].some(
      (value) => value?.toLowerCase().includes(searchTerm),
    )) return false;
    const stock = stockFor(row);
    if (status === "in-stock") return stock.available > 0;
    if (status === "out-of-stock") return stock.available === 0;
    if (status === "needs-ids") return stock.needsIds > 0;
    return true;
  }), [branchRows, variantById, productById, searchTerm, status, stockFor]);
  const currentPage = Math.min(page, Math.max(1, Math.ceil(rows.length / pageSize)));
  const pageStart = (currentPage - 1) * pageSize;
  const pageRows = rows.slice(pageStart, pageStart + pageSize);
  let totalOnHand = 0;
  let totalNeedsIds = 0;
  for (const row of rows) {
    const stock = stockFor(row);
    totalOnHand += stock.onHand;
    totalNeedsIds += stock.needsIds;
  }
  const metrics = [
    { label: "Total Units on Hand", value: totalOnHand },
    { label: "Out-of-Stock Rows", value: rows.filter((row) => stockFor(row).onHand === 0).length },
    { label: "Units Needing IDs", value: totalNeedsIds },
  ];
  const selectedVariant = selected ? variantById.get(selected.variant_id) : null;
  const selectedProduct = productById.get(selectedVariant?.product_id ?? "");

  return (
    <section className="space-y-4">
      <header className="space-y-3">
        <div>
          <h2 className="text-xl font-semibold">Branch inventory</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Update on-hand stock; orders do not hold stock until confirmed.
          </p>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex min-w-0 grow basis-full flex-wrap items-end gap-3 md:basis-[43.5rem]">
            <Input
              label="Search"
              type="search"
              placeholder="Search product, variant, or SKU..."
              leadingIcon={<Search className="size-4" />}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              containerClassName="w-full sm:w-80 sm:shrink-0"
            />
            <Select label="Stock status" value={status} onValueChange={(value) => {
              setStatus(value);
              setPage(1);
            }} containerClassName="w-full sm:w-40">
              <option value="all">All</option>
              <option value="in-stock">In stock</option>
              <option value="out-of-stock">Out of stock</option>
              <option value="needs-ids">Needs IDs</option>
            </Select>
            {assignedBranchId ? (
              <div className="w-full min-w-0 space-y-1.5 sm:w-48">
                <p className="text-sm font-medium">Assigned branch</p>
                <p className="h-11 truncate rounded-md border bg-muted/40 px-3 leading-[2.625rem] text-sm">
                  {branches[0]?.name ?? "Assigned branch"}
                </p>
              </div>
            ) : (
              <Select
                label="Branch"
                value={branchId}
                onValueChange={(value) => {
                  setBranchId(value);
                  setPage(1);
                }}
                containerClassName="w-full sm:w-48"
              >
                <option value="all">All branches</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </Select>
            )}
          </div>
          {canManageProducts && (
            <Button
              type="button"
              size="sm"
              className="ml-auto h-11 w-full shrink-0 sm:w-auto"
              disabled={!branches.length || !stockVariants.length}
              onClick={() => setReceiveStockOpen(true)}
            >
              Receive Stock
            </Button>
          )}
        </div>
      </header>

      {canManageProducts && (!branches.length || !stockVariants.length) && (
        <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
          Add an active branch and product variant before recording stock.
        </p>
      )}
      <dl className="grid grid-cols-3 divide-x rounded-xl border bg-card">
        {metrics.map(({ label, value }) => (
          <div key={label} className="min-w-0 space-y-1 px-3 py-3 sm:px-4">
            <dt className="text-xs leading-4 text-muted-foreground">{label}</dt>
            <dd className="text-lg font-semibold tabular-nums">{value.toLocaleString()}</dd>
          </div>
        ))}
      </dl>
      {!rows.length ? (
        <p className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">
          {branchRows.length ? "No inventory matches these filters." : "No inventory records for this branch."}
        </p>
      ) : (
        <BranchInventoryRows
          products={products}
          variants={variants}
          branches={branches}
          activeTransferBranchIds={transferBranches.filter(({ active }) => active).map(({ id }) => id)}
          rows={pageRows}
          canManage={canManageProducts}
          stockFor={stockFor}
          onView={setSelected}
          onTransfer={onTransfer}
        />
      )}

      {rows.length > 0 && (
        <TablePagination page={currentPage} pageSize={pageSize} total={rows.length} onPageChange={setPage} />
      )}

      {receiveStockOpen && (
        <InventoryEditor
          branches={branches}
          assignedBranchId={assignedBranchId}
          variants={stockVariants}
          inventory={inventory}
          units={units}
          branchId={selectedBranchId === "all" ? undefined : selectedBranchId}
          onClose={() => setReceiveStockOpen(false)}
        />
      )}

      {selected && (
        <BranchInventoryDetails
          branchName={branchById.get(selected.branch_id)?.name ?? "Inactive branch"}
          productName={selectedProduct?.name ?? "Inactive product"}
          variantName={selectedVariant?.name ?? "Inactive variant"}
          sku={selectedVariant?.sku ?? "—"}
          stock={selected.stock}
          isEbike={selectedProduct?.product_type === "ebike"}
          units={unitsByRow.get(`${selected.branch_id}:${selected.variant_id}`) ?? []}
          specifications={selectedVariant?.specifications}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}
