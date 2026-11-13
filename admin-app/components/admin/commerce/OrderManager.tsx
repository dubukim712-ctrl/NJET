"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
import type { OrderBranchOption, StaffOrder } from "@/data/commerce/admin-orders";
import { OrderDetailsPanel } from "@/components/admin/commerce/OrderDetailsPanel";
import { OrderStatusBadge } from "@/components/commerce/OrderStatusBadge";
import { OrdersFilters } from "@/components/admin/commerce/OrdersFilters";
import { Button } from "@/components/ui/Button";
import { formatPhp } from "@/lib/commerce";
import type { OrderFilters } from "@/lib/validations/order-filters";

type OrderAction = (payload: unknown) => Promise<{ success: boolean; error?: string }>;

export function OrderManager({
  orders,
  branches,
  filters,
  canManage,
  onDataChanged,
}: {
  orders: StaffOrder[];
  branches: OrderBranchOption[];
  filters: OrderFilters;
  canManage: boolean;
  onDataChanged: () => void;
}) {
  const [busyOrder, setBusyOrder] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const updateOrder = async (orderId: string, action: OrderAction) => {
    setBusyOrder(orderId);
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
      setBusyOrder(null);
    }
  };

  return (
    <div className="space-y-4">
      <OrdersFilters branches={branches} filters={filters} />
      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {!orders.length && (
        <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
          {filters.q || filters.status || filters.branch
            ? "No orders match the selected filters."
            : "No orders have been placed yet."}
        </p>
      )}
      {orders.map((order) => {
        const storeDue = order.payment_method === "home_credit"
          ? 0
          : order.balance_due_minor
            + (order.payment_method === "online" ? 0 : order.reservation_due_minor);
        const isExpanded = expandedOrderId === order.id;
        const detailsId = `order-details-${order.id}`;
        return (
          <article key={order.id} className="rounded-xl border bg-card p-4 sm:p-5">
            <header className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold">{order.order_number}</h2>
                <p className="mt-1 break-words text-sm text-muted-foreground">
                  {new Date(order.created_at).toLocaleString("en-PH")} · {order.customer_name} · {order.contact_number}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                  order.order_source === "walk_in"
                    ? "bg-violet-100 text-violet-900 dark:bg-violet-900/30 dark:text-violet-200"
                    : "bg-secondary text-secondary-foreground"
                }`}>
                  {order.order_source === "walk_in" ? "Walk-in" : "Online"}
                </span>
                <OrderStatusBadge status={order.status} />
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  aria-controls={isExpanded ? detailsId : undefined}
                  onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                  className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md border border-input px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                  {isExpanded ? "Hide details" : "View details"}
                  <ChevronDown aria-hidden="true" className={`size-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </button>
              </div>
            </header>
            {isExpanded && (
              <OrderDetailsPanel
                order={order}
                storeDue={storeDue}
                canManage={canManage}
                isBusy={busyOrder === order.id}
                isAnyOrderBusy={busyOrder !== null}
                onUpdateOrder={(action) => { void updateOrder(order.id, action); }}
                onDataChanged={onDataChanged}
              />
            )}
          </article>
        );
      })}
    </div>
  );
}
