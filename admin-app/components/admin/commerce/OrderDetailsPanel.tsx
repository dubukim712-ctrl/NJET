"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import type { StaffOrder } from "@/data/commerce/admin-orders";
import {
  cancelCommerceOrderAction,
  confirmCommerceOrderAction,
} from "@/data/actions/commerce-admin";
import { CompletedOrderDocuments } from "@/components/admin/commerce/CompletedOrderDocuments";
import { HomeCreditOrderSummary } from "@/components/admin/commerce/HomeCreditOrderSummary";
import { HomeCreditOrderCompletionForm } from "@/components/admin/commerce/HomeCreditOrderCompletionForm";
import { OrderCompletionPaymentForm } from "@/components/admin/commerce/OrderCompletionPaymentForm";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatPhp } from "@/lib/commerce";

type OrderAction = (
  payload: unknown,
) => Promise<{ success: boolean; error?: string }>;
export type OrderMutationAction = "confirm" | "cancel";

export function OrderDetailsPanel({
  order,
  storeDue,
  canManage,
  busyAction,
  isAnyOrderBusy,
  onUpdateOrder,
  onDataChanged,
}: {
  order: StaffOrder;
  storeDue: number;
  canManage: boolean;
  busyAction: OrderMutationAction | null;
  isAnyOrderBusy: boolean;
  onUpdateOrder: (action: OrderAction, mutation: OrderMutationAction) => void;
  onDataChanged: () => void;
}) {
  const [completingHomeCredit, setCompletingHomeCredit] = useState(false);
  const [completingSale, setCompletingSale] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  return (
    <div
      id={`order-details-${order.id}`}
      className="mt-5 space-y-5 border-t pt-5"
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Items</h3>
          <ul className="space-y-2 text-sm">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-3">
                <span>
                  {item.product_name} · {item.variant_name} × {item.quantity}
                </span>
                <span className="shrink-0">
                  {formatPhp(item.unit_price_minor * item.quantity)}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section className="space-y-2 text-sm">
          <h3 className="font-semibold">Fulfillment &amp; payment</h3>
          <p>
            {order.fulfillment === "pickup"
              ? `Pickup at ${order.branch_name}`
              : `Delivery via ${order.delivery_zone_name}`}
          </p>
          {order.address_line1 && (
            <p className="text-muted-foreground">
              {[
                order.address_line1,
                order.barangay,
                order.city,
                order.province,
                order.postal_code,
              ]
                .filter(Boolean)
                .join(", ")}
            </p>
          )}
          <p className="capitalize">
            Checkout method: {order.payment_method.replaceAll("_", " ")}
            {order.payment_provider
              ? ` · ${order.payment_provider.replaceAll("_", " ")}`
              : ""}
          </p>
          {order.paymentRecipientName && (
            <p>Recipient: {order.paymentRecipientName}</p>
          )}
          {order.payment_reference && (
            <p>Reference: {order.payment_reference}</p>
          )}
          <p>
            Total: <strong>{formatPhp(order.total_minor)}</strong>
          </p>
          {order.order_source === "walk_in" &&
            order.cash_tendered_minor !== null && (
              <p>
                Cash tendered:{" "}
                <strong>{formatPhp(order.cash_tendered_minor)}</strong>
                {" · "}Change:{" "}
                <strong>
                  {formatPhp(order.cash_tendered_minor - order.total_minor)}
                </strong>
              </p>
            )}
          {order.reservation_due_minor > 0 && (
            <p>
              Reservation: {formatPhp(order.reservation_due_minor)}
              {order.payment_method === "online"
                ? order.status === "awaiting_payment"
                  ? " · payment proof pending"
                  : " · online proof submitted"
                : order.payment_method === "home_credit"
                  ? " · Home Credit reservation component"
                  : " · due at store"}
            </p>
          )}
          {order.home_credit_downpayment_due_minor > 0 && (
            <p>
              Home Credit downpayment:{" "}
              {formatPhp(order.home_credit_downpayment_due_minor)}
              {order.status === "awaiting_payment"
                ? " · payment proof pending"
                : " · online proof submitted"}
            </p>
          )}
          {order.homeCreditDetails && (
            <HomeCreditOrderSummary
              details={order.homeCreditDetails}
              totalMinor={order.total_minor}
            />
          )}
          {order.payment_method === "home_credit" ? (
            !order.homeCreditDetails && (
              <p>
                Home Credit balance before processing:{" "}
                <strong>{formatPhp(order.balance_due_minor)}</strong>
              </p>
            )
          ) : (
            <p>
              Due at store: <strong>{formatPhp(storeDue)}</strong>
            </p>
          )}
        </section>
      </div>

      {order.documents.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Private documents</h3>
          <ul className="flex flex-wrap gap-2">
            {order.documents.map((document) => (
              <li key={document.id}>
                {document.url ? (
                  <a
                    href={document.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center min-h-10 gap-2 rounded-md border px-3 text-sm font-medium hover:bg-accent"
                  >
                    <Download className="h-4 w-4" />
                    Download{" "}
                    {document.kind === "identity" ? "ID" : "payment proof"}
                  </a>
                ) : (
                  <span className="text-sm text-destructive">
                    Private file link unavailable; refresh this page.
                  </span>
                )}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Links expire after one minute. Verify required IDs and payment proof
            before confirming.
          </p>
        </section>
      )}

      {order.status === "completed" && (
        <CompletedOrderDocuments
          key={`${order.id}:${order.invoiceNo ?? ""}`}
          orderId={order.id}
          invoiceNo={order.invoiceNo}
          isEbikeOrder={order.items.some(
            (item) => item.product_type === "ebike",
          )}
          certificate={order.certificate}
          canManage={canManage}
          onDataChanged={onDataChanged}
        />
      )}

      {canManage && (
        <footer className="flex flex-wrap gap-2 border-t pt-4">
          {order.status === "awaiting_confirmation" && (
            <Button
              type="button"
              loading={busyAction === "confirm"}
              disabled={isAnyOrderBusy}
              onClick={() =>
                onUpdateOrder(confirmCommerceOrderAction, "confirm")
              }
            >
              Confirm and reserve stock
            </Button>
          )}
          {order.status === "confirmed" &&
            (order.payment_method === "home_credit" ? (
              <Button
                type="button"
                variant="secondary"
                disabled={isAnyOrderBusy}
                onClick={() => setCompletingHomeCredit(true)}
              >
                Enter Home Credit details
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                disabled={isAnyOrderBusy}
                onClick={() => setCompletingSale(true)}
              >
                Record payment
              </Button>
            ))}
          {["awaiting_payment", "awaiting_confirmation", "confirmed"].includes(
            order.status,
          ) && (
            <Button
              type="button"
              variant="destructive"
              loading={busyAction === "cancel"}
              disabled={isAnyOrderBusy}
              onClick={() => setCancelDialogOpen(true)}
            >
              Cancel order
            </Button>
          )}
        </footer>
      )}

      <ConfirmDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        title={`Cancel ${order.order_number}?`}
        description="Confirmed stock will be restored."
        confirmLabel="Yes, cancel order"
        cancelLabel="No, keep order"
        onConfirm={() => {
          setCancelDialogOpen(false);
          onUpdateOrder(cancelCommerceOrderAction, "cancel");
        }}
        destructive
      />

      {order.status === "confirmed" &&
        order.payment_method === "home_credit" &&
        completingHomeCredit && (
          <HomeCreditOrderCompletionForm
            orderId={order.id}
            totalMinor={order.total_minor}
            onCancel={() => setCompletingHomeCredit(false)}
            onComplete={() => {
              setCompletingHomeCredit(false);
              onDataChanged();
            }}
          />
        )}
      {order.status === "confirmed" &&
        order.payment_method !== "home_credit" &&
        completingSale && (
          <OrderCompletionPaymentForm
            orderId={order.id}
            balanceDueMinor={storeDue}
            onCancel={() => setCompletingSale(false)}
            onComplete={() => {
              setCompletingSale(false);
              onDataChanged();
            }}
          />
        )}
    </div>
  );
}
