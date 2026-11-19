"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { RealtimeStatus } from "@/components/realtime/RealtimeStatus";
import {
  CustomerOrdersQueryError,
  useInvalidateCustomerOrdersQuery,
  useCustomerOrdersQuery,
} from "@/data/commerce/customer-orders-client";
import { useRealtimeChanges } from "@/components/realtime/useRealtimeChanges";
import { CustomerOrderCard } from "@/components/dashboard/CustomerOrderCard";
import type { RealtimeTable } from "@/types/realtime";

const CUSTOMER_ORDER_REALTIME_TABLES: readonly RealtimeTable[] = [
  "orders",
  "order_items",
  "order_documents",
  "order_invoices",
  "order_certificates",
  "order_receipts",
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

      {query.data.length ? (
        <ul className="space-y-4">
          {query.data.map((order) => (
            <CustomerOrderCard
              key={order.id}
              order={order}
              isPlaced={order.id === placedOrderId}
            />
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
