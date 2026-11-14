"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Package } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { OrderStatusBadge } from "@/components/commerce/OrderStatusBadge";
import { Button } from "@/components/ui/Button";
import { RealtimeStatus } from "@/components/realtime/RealtimeStatus";
import {
  CustomerOrdersQueryError,
  useInvalidateCustomerOrdersQuery,
  useCustomerOrdersQuery,
} from "@/data/commerce/customer-orders-client";
import { useRealtimeChanges } from "@/components/realtime/useRealtimeChanges";
import { formatPhp } from "@/lib/commerce";
import type { RealtimeTable } from "@/types/realtime";

const CUSTOMER_ORDER_REALTIME_TABLES: readonly RealtimeTable[] = [
  "orders",
  "order_items",
  "order_documents",
  "order_invoices",
  "order_certificates",
];

export function CustomerOrdersQuery() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const placedOrderId = useSearchParams().get("placed") ?? undefined;
  const query = useCustomerOrdersQuery(userId);
  const invalidateOrders = useInvalidateCustomerOrdersQuery();
  const refreshOrders = useCallback(() => {
    void invalidateOrders();
  }, [invalidateOrders]);
  const realtimeState = useRealtimeChanges(
    `customer-orders-${userId}`,
    user ? CUSTOMER_ORDER_REALTIME_TABLES : [],
    refreshOrders,
  );

  if (!user) {
    return (
      <p
        className="rounded-lg border bg-card p-4 text-sm text-muted-foreground"
        role="alert"
      >
        Your session has ended. Sign in to view your orders.
      </p>
    );
  }

  if (!query.data && query.isPending) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <RealtimeStatus state={realtimeState} />
        </div>
        <div role="status" aria-label="Loading orders" aria-busy="true">
          <div className="h-36 animate-pulse rounded-xl border bg-card" />
          <div className="mt-4 h-36 animate-pulse rounded-xl border bg-card" />
        </div>
      </div>
    );
  }

  if (!query.data) {
    const message =
      query.error instanceof CustomerOrdersQueryError
        ? query.error.message
        : "Order history could not be loaded. Please try again later.";
    return (
      <div className="space-y-3">
        <div className="flex justify-end">
          <RealtimeStatus state={realtimeState} />
        </div>
        <p
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
          role="alert"
        >
          {message}
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            void query.refetch();
          }}
        >
          Try again
        </Button>
      </div>
    );
  }

  const placedOrder = query.data.find((order) => order.id === placedOrderId);
  const errorMessage =
    query.error instanceof CustomerOrdersQueryError
      ? query.error.message
      : "Order history could not be refreshed. Please try again.";
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <RealtimeStatus state={realtimeState} />
      </div>
      {query.isError && (
        <div className="space-y-2" role="alert">
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {errorMessage}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void query.refetch();
            }}
          >
            Try again
          </Button>
        </div>
      )}

      {placedOrder?.status === "awaiting_confirmation" && (
        <p
          className="rounded-lg border border-primary/20 bg-primary text-primary-foreground p-4 text-sm"
          role="status"
        >
          Order {placedOrder.order_number} was placed. Staff will review it
          before stock is reserved.
        </p>
      )}
      {query.data.length ? (
        <ul className="space-y-4">
          {query.data.map((order) => (
            <li key={order.id} className="rounded-xl border bg-card p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-primary">
                    <Package className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    {order.status === "awaiting_payment" ||
                    ((order.payment_method === "online" ||
                      (order.payment_method === "home_credit" &&
                        order.home_credit_downpayment_due_minor > 0)) &&
                      order.status === "awaiting_confirmation") ? (
                      <Link
                        href={`/dashboard/orders/${order.id}`}
                        className="font-semibold text-primary hover:underline"
                      >
                        {order.order_number}
                      </Link>
                    ) : (
                      <h2 className="font-semibold">{order.order_number}</h2>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString("en-PH")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <OrderStatusBadge status={order.status} />
                  {(order.status === "awaiting_payment" ||
                    ((order.payment_method === "online" ||
                      (order.payment_method === "home_credit" &&
                        order.home_credit_downpayment_due_minor > 0)) &&
                      order.status === "awaiting_confirmation")) && (
                    <Link
                      href={`/dashboard/orders/${order.id}`}
                      className="inline-flex min-h-10 items-center rounded-md border px-3 text-sm font-medium hover:bg-accent"
                    >
                      {order.status === "awaiting_payment"
                        ? "Complete payment"
                        : "View payment"}
                    </Link>
                  )}
                </div>
              </div>
              <ul className="mt-4 space-y-2 border-y py-4 text-sm">
                {order.items.map((item, index) => (
                  <li
                    key={`${order.id}-${index}`}
                    className="flex justify-between gap-3"
                  >
                    <span>
                      {item.product_name} · {item.variant_name} ×{" "}
                      {item.quantity}
                    </span>
                    <span className="shrink-0">
                      {formatPhp(item.unit_price_minor * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="grid gap-3 pt-4 text-sm sm:grid-cols-2">
                <p>
                  <span className="text-muted-foreground">Fulfillment:</span>{" "}
                  {order.fulfillment === "pickup"
                    ? `Pickup at ${order.branch_name}`
                    : `Delivery to ${order.delivery_zone_name}`}
                </p>
                <p>
                  <span className="text-muted-foreground">Payment:</span>{" "}
                  {order.payment_method.replaceAll("_", " ")}
                </p>
                <p>
                  <span className="text-muted-foreground">Total:</span>{" "}
                  {formatPhp(order.total_minor)}
                </p>
                {order.reservation_due_minor > 0 && (
                  <p>
                    <span className="text-muted-foreground">Reservation:</span>{" "}
                    {formatPhp(order.reservation_due_minor)}
                    {order.payment_method === "online"
                      ? " online"
                      : " at store"}
                  </p>
                )}
                <p>
                  <span className="text-muted-foreground">Due at store:</span>{" "}
                  {formatPhp(
                    order.balance_due_minor +
                      (order.payment_method === "online"
                        ? 0
                        : order.reservation_due_minor),
                  )}
                </p>
                {order.online_due_minor > 0 && (
                  <p>
                    <span className="text-muted-foreground">
                      Online payment due:
                    </span>{" "}
                    {formatPhp(order.online_due_minor)}
                  </p>
                )}
                {order.home_credit_downpayment_due_minor > 0 && (
                  <p>
                    <span className="text-muted-foreground">
                      Home Credit downpayment due:
                    </span>{" "}
                    {formatPhp(order.home_credit_downpayment_due_minor)}
                  </p>
                )}
              </div>
              {order.status === "completed" &&
                (order.invoiceNo || order.certificateUrl) && (
                  <section className="mt-4 flex flex-wrap items-center gap-3 border-t pt-4">
                    {order.invoiceNo && (
                      <p className="text-sm">
                        <span className="text-muted-foreground">
                          Invoice number:
                        </span>{" "}
                        {order.invoiceNo}
                      </p>
                    )}
                    {order.certificateUrl && (
                      <a
                        href={order.certificateUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-10 items-center rounded-md border px-3 text-sm font-medium hover:bg-accent"
                      >
                        Download ownership certificate
                      </a>
                    )}
                  </section>
                )}
            </li>
          ))}
        </ul>
      ) : (
        <section className="rounded-xl border bg-card p-8 text-center">
          <h2 className="font-semibold">No orders yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your completed checkouts will appear here.
          </p>
          <Link
            href="/shop"
            className="mt-4 inline-flex min-h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Browse products
          </Link>
        </section>
      )}
    </div>
  );
}
