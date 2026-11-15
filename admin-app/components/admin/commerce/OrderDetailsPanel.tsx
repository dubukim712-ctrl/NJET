"use client";

import { useState } from "react";
import type { StaffOrder } from "@/data/commerce/admin-orders";
import {
  cancelCommerceOrderAction,
  confirmCommerceOrderAction,
} from "@/data/actions/commerce-admin";
import { CompletedOrderDocuments } from "@/components/admin/commerce/CompletedOrderDocuments";
import { OrderPrivateDocuments } from "@/components/admin/commerce/OrderPrivateDocuments";
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

          {order.fulfillment === "pickup" ? (
            <p className="text-muted-foreground flex justify-between gap-2 bg-muted-foreground/5 rounded-md p-2">
              Pickup at{" "}
              <span className="text-foreground font-bold text-right">
                {order.branch_name}
              </span>
            </p>
          ) : (
            <p className="text-muted-foreground flex justify-between gap-2 bg-muted-foreground/5 rounded-md p-2">
              Delivery via
              <span className="text-foreground font-bold text-right">
                {order.delivery_zone_name}
              </span>
            </p>
          )}

          {order.address_line1 && (
            <p className="text-muted-foreground flex justify-between gap-2 bg-muted-foreground/5 rounded-md p-2">
              Address
              <span className="text-foreground font-bold text-right">
                {[
                  order.address_line1,
                  order.barangay,
                  order.city,
                  order.province,
                  order.postal_code,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </span>
            </p>
          )}
          <p className="text-muted-foreground capitalize flex justify-between gap-2 bg-muted-foreground/5 rounded-md p-2">
            Checkout method
            <span className="text-foreground font-bold text-right">
              {order.payment_method.replaceAll("_", " ")}
              {order.payment_provider
                ? ` · ${order.payment_provider.replaceAll("_", " ")}`
                : ""}
            </span>
          </p>
          {order.paymentRecipientName && (
            <p className="text-muted-foreground flex justify-between gap-2 bg-muted-foreground/5 rounded-md p-2">
              Recipient
              <span className="text-foreground font-bold text-right">
                {order.paymentRecipientName}
              </span>
            </p>
          )}
          {order.payment_reference && (
            <p className="text-muted-foreground flex justify-between gap-2 bg-muted-foreground/5 rounded-md p-2">
              Reference
              <span className="text-foreground font-bold text-right">
                {order.payment_reference}
              </span>
            </p>
          )}
          <p className="text-muted-foreground flex justify-between gap-2 bg-muted-foreground/5 rounded-md p-2">
            Total
            <span className="text-foreground font-bold text-right">
              {formatPhp(order.total_minor)}
            </span>
          </p>
          {order.order_source === "walk_in" &&
            order.cash_tendered_minor !== null && (
              <p className="text-muted-foreground flex justify-between gap-2 bg-muted-foreground/5 rounded-md p-2">
                Cash tendered
                <span className="text-foreground font-bold text-right">
                  {formatPhp(order.cash_tendered_minor)}
                </span>
                {" · "}Change
                <span className="text-foreground font-bold text-right">
                  {formatPhp(order.cash_tendered_minor - order.total_minor)}
                </span>
              </p>
            )}
          {order.reservation_due_minor > 0 && (
            <p className="text-muted-foreground flex justify-between gap-2 bg-muted-foreground/5 rounded-md p-2">
              Reservation
              <span className="text-foreground font-bold text-right">
                {formatPhp(order.reservation_due_minor)}
                {order.payment_method === "online"
                  ? order.status === "awaiting_payment"
                    ? " · payment proof pending"
                    : " · online proof submitted"
                  : order.payment_method === "home_credit"
                    ? " · Home Credit reservation component"
                    : " · due at store"}
              </span>
            </p>
          )}
          {order.home_credit_downpayment_due_minor > 0 && (
            <p className="text-muted-foreground flex justify-between gap-2 bg-muted-foreground/5 rounded-md p-2">
              Home Credit downpayment
              <span className="text-foreground font-bold text-right">
                {formatPhp(order.home_credit_downpayment_due_minor)}
                {order.status === "awaiting_payment"
                  ? " · payment proof pending"
                  : " · online proof submitted"}
              </span>
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
              <p className="text-muted-foreground flex justify-between gap-2 bg-muted-foreground/5 rounded-md p-2">
                Home Credit balance before processing
                <span className="text-foreground font-bold text-right">
                  {formatPhp(order.balance_due_minor)}
                </span>
              </p>
            )
          ) : (
            <p className="text-muted-foreground flex justify-between gap-2 bg-muted-foreground/5 rounded-md p-2">
              Due at store:{" "}
              <span className="text-foreground font-bold text-right">
                {formatPhp(storeDue)}
              </span>
            </p>
          )}
        </section>
      </div>

      <OrderPrivateDocuments documents={order.documents} />

      {order.status === "completed" && (
        <CompletedOrderDocuments
          key={`${order.id}:${order.invoiceNo ?? ""}:${order.certificate?.certificateNumber ?? ""}`}
          orderId={order.id}
          invoiceNo={order.invoiceNo}
          isEbikeOrder={order.items.some(
            (item) => item.product_type === "ebike",
          )}
          certificate={order.certificate}
          receipt={order.receipt}
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
