import type { Database } from "@/types/database";

type Movement = Database["public"]["Tables"]["inventory_movements"]["Row"];

const LABELS: Record<Movement["movement_type"], string> = {
  opening_balance: "Opening balance",
  adjustment: "Stock adjustment",
  order_confirmed: "Order confirmed",
  order_cancelled: "Order cancelled",
  serial_identified: "E-bike identified",
  serial_stock_received: "E-bike received",
  stock_received: "Stock received",
  transfer_dispatched: "Transfer dispatched",
  transfer_received: "Transfer received",
};

export function InventoryMovementLog({
  movements,
  branches,
  variants,
}: {
  movements: Movement[];
  branches: { id: string; name: string }[];
  variants: { id: string; sku: string; name: string }[];
}) {
  const branchNames = new Map(
    branches.map((branch) => [branch.id, branch.name]),
  );
  const variantNames = new Map(
    variants.map((variant) => [variant.id, `${variant.sku} · ${variant.name}`]),
  );

  return (
    <section className="space-y-4 rounded-xl border bg-card p-5">
      <div>
        <h2 className="text-xl font-semibold">Inventory movements</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Most recent stock changes, including orders and branch transfers.
        </p>
      </div>
      {!movements.length ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          No inventory movements recorded yet.
        </p>
      ) : (
        <ul className="divide-y">
          {movements.map((movement) => (
            <li
              key={movement.id}
              className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0"
            >
              <div className="min-w-0">
                <p className="font-medium text-sm sm:text-base">
                  {LABELS[movement.movement_type]}
                </p>
                <p className="mt-1 break-words text-xs text-muted-foreground">
                  {branchNames.get(movement.branch_id) ?? "Branch"} ·{" "}
                  {variantNames.get(movement.variant_id) ?? "Product variant"}
                </p>
                {movement.reference_id && (
                  <p className="mt-1 text-[0.6rem] sm:text-xs  text-muted-foreground">
                    Reference: {movement.reference_id.slice(0, 8)}
                  </p>
                )}
              </div>
              <div className="shrink-0 min-[376px]:text-right">
                <p className="font-semibold tabular-nums">
                  {movement.quantity_delta > 0 ? "+" : ""}
                  {movement.quantity_delta}
                </p>
                <time
                  className="text-xs text-muted-foreground"
                  dateTime={movement.created_at}
                >
                  {new Date(movement.created_at).toLocaleString()}
                </time>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
