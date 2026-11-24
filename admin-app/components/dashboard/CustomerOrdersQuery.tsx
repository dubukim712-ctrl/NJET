"use client";

import { useCallback, useState } from "react";
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

const statusFilters = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "completed", label: "Completed" },
  { id: "closed", label: "Expired & Cancelled" },
] as const;

export function CustomerOrdersQuery() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<(typeof statusFilters)[number]["id"]>("all");
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

  const orders = query.data.pages.flatMap((page) => page.orders);
  const visibleOrders = orders.filter(({ status }) => {
    switch (filter) {
      case "active":
        return status === "awaiting_payment" || status === "awaiting_confirmation" || status === "confirmed";
      case "completed":
        return status === "completed";
      case "closed":
        return status === "expired" || status === "cancelled";
      default:
        return true;
    }
  });
  const errorMessage =
    query.error instanceof CustomerOrdersQueryError
      ? query.error.message
      : "Order history could not be refreshed. Please try again.";
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <RealtimeStatus state={realtimeState} />
      </div>
      {query.isRefetchError && (
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

      <div role="group" aria-label="Filter orders by status" className="flex flex-wrap gap-2">
        {statusFilters.map(({ id, label }) => (
          <Button
            key={id}
            type="button"
            variant={filter === id ? "default" : "outline"}
            aria-pressed={filter === id}
            className="min-h-11 rounded-full"
            onClick={() => setFilter(id)}
          >
            {label}
          </Button>
        ))}
      </div>
      {visibleOrders.length ? (
        <ul className="space-y-4">
          {visibleOrders.map((order) => (
            <CustomerOrderCard
              key={order.id}
              order={order}
              isPlaced={order.id === placedOrderId}
            />
          ))}
        </ul>
      ) : orders.length ? (
        <p role="status" className="rounded-xl border bg-card p-5 text-center text-sm text-muted-foreground">
          No loaded orders match this filter.{query.hasNextPage && " Load older orders to see more."}
        </p>
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
      {(query.hasNextPage || query.isFetchNextPageError) && (
        <div className="space-y-2 text-center">
          {query.isFetchNextPageError && (
            <p role="alert" className="text-sm text-destructive">{errorMessage}</p>
          )}
          <Button
            type="button"
            variant="outline"
            loading={query.isFetchingNextPage}
            disabled={query.isFetching}
            onClick={() => { void query.fetchNextPage({ cancelRefetch: false }); }}
          >
            {query.isFetchNextPageError ? "Retry loading older orders" : "Load older orders"}
          </Button>
        </div>
      )}
    </div>
  );
}
