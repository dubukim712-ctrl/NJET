"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
import type {
  OrderBranchOption,
  StaffOrder,
} from "@/data/commerce/admin-orders";
import {
  OrderDetailsPanel,
  type OrderMutationAction,
} from "@/components/admin/commerce/OrderDetailsPanel";
import { OrderStatusBadge } from "@/components/commerce/OrderStatusBadge";
import { OrdersFilters } from "@/components/admin/commerce/OrdersFilters";
import { Button } from "@/components/ui/Button";
import { formatPhp } from "@/lib/commerce";
import type { OrderFilters } from "@/lib/validations/order-filters";

type OrderAction = (
  payload: unknown,
) => Promise<{ success: boolean; error?: string }>;

export function OrderManager({
  orders,
  branches,
  filters,
  canManage,
  branchLocked,
  isUpdating,
  onDataChanged,
}: {
  orders: StaffOrder[];
  branches: OrderBranchOption[];
  filters: OrderFilters;
  canManage: boolean;
  branchLocked: boolean;
  isUpdating: boolean;
  onDataChanged: () => void;
}) {
  const [pendingAction, setPendingAction] = useState<{
    orderId: string;
    mutation: OrderMutationAction;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const updateOrder = async (
    orderId: string,
    action: OrderAction,
    mutation: OrderMutationAction,
  ) => {
    setPendingAction({ orderId, mutation });
    setError(null);
    try {
      const result = await action({ orderId });
      if (!result.success) {
        const message = result.error ?? "Could not update this order.";
        setError(message);
        toast.error(message);
        return;
      }
      toast.success("Order status updated.");
      onDataChanged();
    } catch (actionError) {
      console.error("Could not update order status.", actionError);
      const message = "Could not update this order. Please try again.";
      setError(message);
      toast.error(message);
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <div className="space-y-4">
      <OrdersFilters
        branches={branches}
        filters={filters}
        branchLocked={branchLocked}
      />
      <div className="space-y-4" aria-busy={isUpdating}>
        {isUpdating && (
          <p className="text-sm text-muted-foreground" role="status">
            Updating orders…
          </p>
        )}
        {error && (
          <p
            className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
            role="alert"
          >
            {error}
          </p>
        )}
        {!orders.length && !isUpdating && (
          <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
            {filters.q || filters.status || (!branchLocked && filters.branch)
              ? "No orders match the selected filters."
              : "No orders have been placed yet."}
          </p>
        )}
        {orders.map((order) => {
          const storeDue =
            order.payment_method === "home_credit"
              ? 0
              : order.balance_due_minor +
                (order.payment_method === "online"
                  ? 0
                  : order.reservation_due_minor);
          const isExpanded = expandedOrderId === order.id;
          const detailsId = `order-details-${order.id}`;
          return (
            <article
              key={order.id}
              className="rounded-xl border bg-card p-4 sm:p-5"
            >
              <header className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold">
                    {order.order_number}
                  </h2>
                  <p className="mt-1 break-words text-sm text-muted-foreground">
                    {new Date(order.created_at).toLocaleString("en-PH")} ·{" "}
                    {order.customer_name} · {order.contact_number}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      order.order_source === "walk_in"
                        ? "bg-violet-100 text-violet-900 dark:bg-violet-900/30 dark:text-violet-200"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {order.order_source === "walk_in" ? "Walk-in" : "Online"}
                  </span>
                  <OrderStatusBadge status={order.status} />
                  <Button
                    variant="link"
                    size="sm"
                    type="button"
                    aria-expanded={isExpanded}
                    aria-controls={isExpanded ? detailsId : undefined}
                    onClick={() =>
                      setExpandedOrderId(isExpanded ? null : order.id)
                    }
                    className="flex items-center gap-1 text-sm font-medium"
                  >
                    {isExpanded ? "Hide details" : "View details"}
                    <ChevronDown
                      aria-hidden="true"
                      className={`size-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    />
                  </Button>
                </div>
              </header>
              {isExpanded && (
                <OrderDetailsPanel
                  order={order}
                  storeDue={storeDue}
                  canManage={canManage}
                  busyAction={
                    pendingAction?.orderId === order.id
                      ? pendingAction.mutation
                      : null
                  }
                  isAnyOrderBusy={pendingAction !== null}
                  onUpdateOrder={(action, mutation) => {
                    void updateOrder(order.id, action, mutation);
                  }}
                  onDataChanged={onDataChanged}
                />
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
