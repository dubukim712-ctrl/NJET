"use client";

import { useState } from "react";
import type { StaffOrder } from "@/data/commerce/admin-orders";
import {
  cancelCommerceOrderAction,
  confirmCommerceOrderAction,
} from "@/data/actions/commerce-admin";
import { markOrderPhoneManuallyVerifiedAction } from "@/data/actions/phone-verification";
import { CompletedOrderDocuments } from "@/components/admin/commerce/CompletedOrderDocuments";
import { OrderPrivateDocuments } from "@/components/admin/commerce/OrderPrivateDocuments";
import { OrderOverviewSections } from "@/components/admin/commerce/OrderOverviewSections";
import { HomeCreditOrderCompletionForm } from "@/components/admin/commerce/HomeCreditOrderCompletionForm";
import { OrderCompletionPaymentForm } from "@/components/admin/commerce/OrderCompletionPaymentForm";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { toast } from "sonner";

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
  const [verifyingPhone, setVerifyingPhone] = useState(false);
  const [phoneVerificationError, setPhoneVerificationError] = useState<string | null>(null);

  const markPhoneVerified = async () => {
    setVerifyingPhone(true);
    setPhoneVerificationError(null);
    try {
      const result = await markOrderPhoneManuallyVerifiedAction({ orderId: order.id });
      if (!result.success) {
        throw new Error(result.error ?? "Could not verify this order contact number.");
      }
      toast.success("Order contact number marked as verified.");
      onDataChanged();
    } catch (error) {
      console.error("Could not manually verify an order contact number.", error);
      const message = error instanceof Error
        ? error.message
        : "Could not verify this order contact number.";
      setPhoneVerificationError(message);
      toast.error(message);
    } finally {
      setVerifyingPhone(false);
    }
  };

  return (
    <div
      id={`order-details-${order.id}`}
      className="mt-5 space-y-5 border-t pt-5"
    >
      <OrderOverviewSections order={order} storeDue={storeDue} />

      {order.order_source === "online" && (
        <section className="space-y-3 border-t pt-4">
          <div>
            <h3 className="text-sm font-semibold">Phone number verification</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {order.phone_verification_status === "manual_pending"
                ? "Pending staff verification"
                : order.phone_verification_status === "manual_verified"
                  ? "Verified manually by staff"
                  : order.phone_verification_status === "otp_verified"
                    ? "Verified by SMS code"
                    : "Not required"}
            </p>
          </div>
          {canManage &&
            order.phone_verification_status === "manual_pending" &&
            order.status === "awaiting_confirmation" && (
              <Button
                type="button"
                variant="secondary"
                loading={verifyingPhone}
                disabled={isAnyOrderBusy}
                onClick={markPhoneVerified}
              >
                Mark phone as manually verified
              </Button>
            )}
          {phoneVerificationError && (
            <p className="text-sm text-destructive" role="alert">
              {phoneVerificationError}
            </p>
          )}
        </section>
      )}

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
              disabled={
                isAnyOrderBusy ||
                order.phone_verification_status === "manual_pending"
              }
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
              disabled={isAnyOrderBusy || verifyingPhone}
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
