"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { recordOrderPaymentTransactionAction } from "@/data/actions/order-sales-report";
import { formatPhp, parsePhpAmount } from "@/lib/commerce";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  formatReportDateTime,
  paymentMethodLabel,
  reportOrderStatus,
} from "@/lib/reports/order-sales-format";
import type { OrderSalesReportRows } from "@/lib/validations/order-sales-report";

type ReportOrder = OrderSalesReportRows["rows"][number];

export function OrderDetailsDialog({
  order,
  canManage,
  onClose,
  onPaymentRecorded,
}: {
  order: ReportOrder | null;
  canManage: boolean;
  onClose: () => void;
  onPaymentRecorded: () => Promise<void>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (order && !dialog.open) dialog.showModal();
    if (!order && dialog.open) dialog.close();
  }, [order]);

  const submitPayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!order) return;
    setBusy(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const amountMinor = parsePhpAmount(String(formData.get("amount") ?? ""));
    if (amountMinor === null || amountMinor <= 0) {
      setError("Enter an amount greater than PHP 0.00.");
      setBusy(false);
      return;
    }

    try {
      const method = String(formData.get("method"));
      const result = await recordOrderPaymentTransactionAction({
        orderId: order.id,
        transactionType: formData.get("transactionType"),
        paymentMethod: method,
        paymentProvider:
          method === "online" ? String(formData.get("provider") ?? "") : null,
        amountMinor,
        isDownpayment: formData.get("isDownpayment") === "on",
        reference: String(formData.get("reference") ?? "").trim() || null,
        note: String(formData.get("note") ?? "").trim() || null,
      });
      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success("Payment transaction recorded.");
      await onPaymentRecorded();
    } catch (saveError) {
      console.error(
        "Could not record an order payment transaction.",
        saveError,
      );
      setError("Could not record this payment. Please try again.");
      toast.error("Could not record this payment.");
    } finally {
      setBusy(false);
    }
  };
  const handleClose = () => {
    setPaymentMethod("cash");
    onClose();
  };
  const status = order ? reportOrderStatus(order) : null;
  const canCollect = Boolean(
    order &&
    !["cancelled", "expired"].includes(order.status) &&
    order.balance_due_minor > 0,
  );
  const canRefund = (order?.amount_paid_minor ?? 0) > 0;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="report-order-title"
      className="m-auto max-h-[92dvh] w-[min(96vw,48rem)] overflow-y-auto rounded-xl border border-border bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/50 print:hidden"
      onClose={handleClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) dialogRef.current?.close();
      }}
    >
      {order && (
        <div className="space-y-5 p-4 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                Order detail
              </p>
              <h2
                id="report-order-title"
                className="mt-1 text-xl font-semibold"
              >
                {order.invoice_no || order.order_number}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {order.completed_at ? "Sale completed" : "Order placed"} ·{" "}
                {formatReportDateTime(order.completed_at ?? order.created_at)}
              </p>
            </div>
            <button
              type="button"
              className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => dialogRef.current?.close()}
            >
              Close
            </button>
          </div>

          <div className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Customer</p>
              <p className="font-medium">{order.customer_name}</p>
              <p className="text-sm text-muted-foreground">
                {order.contact_number}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Branch / agent</p>
              <p className="font-medium">{order.branch_name}</p>
              <p className="text-sm text-muted-foreground">
                {order.sales_agent_name}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <span
                className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${status?.className}`}
              >
                {status?.label}
              </span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Checkout method</p>
              <p className="font-medium">
                {paymentMethodLabel(
                  order.payment_method,
                  order.payment_provider,
                )}
              </p>
            </div>
          </div>

          <section>
            <h3 className="mb-2 font-semibold">Sold items and units</h3>
            <div className="divide-y divide-border rounded-lg border border-border">
              {order.items.map((item, index) => (
                <div key={`${item.sku}-${index}`} className="space-y-1 p-3">
                  <div className="flex flex-wrap justify-between gap-2 text-sm">
                    <span className="font-medium">
                      {item.product_name} · {item.variant_name} ×{" "}
                      {item.quantity}
                    </span>
                    <span>{formatPhp(item.line_total_minor)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    SKU {item.sku}
                  </p>
                  {item.serial_numbers.length > 0 && (
                    <p className="break-all text-xs text-muted-foreground">
                      Serial: {item.serial_numbers.join(", ")}
                    </p>
                  )}
                  {!item.has_cost_snapshot && (
                    <p className="text-xs text-amber-800 dark:text-amber-300">
                      Sale-time cost was not recorded.
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-2 rounded-lg bg-muted/50 p-4 text-sm sm:grid-cols-2">
            <p>
              Total: <strong>{formatPhp(order.total_minor)}</strong>
            </p>
            <p>
              Collected (net):{" "}
              <strong>{formatPhp(order.amount_paid_minor)}</strong>
            </p>
            <p>
              Financed: <strong>{formatPhp(order.financed_minor)}</strong>
            </p>
            <p>
              Balance due: <strong>{formatPhp(order.balance_due_minor)}</strong>
            </p>
          </section>

          <section>
            <h3 className="mb-2 font-semibold">Payment history</h3>
            {order.payments.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
                No payment events have been recorded.
              </p>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {order.payments.map((payment, index) => (
                  <li
                    key={`${payment.created_at}-${index}`}
                    className="flex flex-wrap justify-between gap-2 p-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">
                        {payment.transaction_type} ·{" "}
                        {paymentMethodLabel(
                          payment.payment_method,
                          payment.payment_provider,
                        )}
                      </p>
                      {payment.is_downpayment && (
                        <p className="text-xs font-medium text-primary">
                          Downpayment
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {formatReportDateTime(payment.created_at)}
                        {payment.reference ? ` · Ref ${payment.reference}` : ""}
                      </p>
                      {payment.note && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {payment.note}
                        </p>
                      )}
                    </div>
                    <span className="font-medium">
                      {formatPhp(payment.amount_minor)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {canManage && (canCollect || canRefund) && (
            <form
              className="space-y-3 rounded-lg border border-border p-4 print:hidden"
              onSubmit={submitPayment}
            >
              <h3 className="font-semibold">Record a collection or refund</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Select
                  name="transactionType"
                  label="Transaction"
                  defaultValue={canCollect ? "collection" : "refund"}
                  required
                >
                  <option value="collection" disabled={!canCollect}>
                    Collection
                  </option>
                  <option value="refund" disabled={!canRefund}>
                    Refund
                  </option>
                </Select>
                <Select
                  name="method"
                  label="Method"
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                  required
                >
                  <option value="cash">Cash</option>
                  <option value="online">Online</option>
                  <option value="home_credit">Home Credit</option>
                  <option value="other">Other / unspecified</option>
                </Select>
                {paymentMethod === "online" && (
                  <>
                    <Select name="provider" label="Provider" required>
                      <option value="">Select provider</option>
                      <option value="gcash">GCash</option>
                      <option value="bank_transfer">Bank transfer</option>
                      <option value="card">Card</option>
                    </Select>
                    <Input
                      name="reference"
                      label="Reference (optional)"
                      maxLength={120}
                    />
                  </>
                )}
                <Input
                  name="amount"
                  label="Amount (PHP)"
                  type="number"
                  min="0.01"
                  onWheel={(event) => event.currentTarget.blur()}
                  className="number-no-spinner"
                  required
                />
                <Input name="note" label="Note (optional)" maxLength={500} />
              </div>
              {order.payment_method === "home_credit" && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    name="isDownpayment"
                    type="checkbox"
                    className="size-4 accent-primary"
                  />
                  This transaction is a downpayment
                </label>
              )}
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              <Button type="submit" disabled={busy} className="min-h-11">
                {busy ? "Saving…" : "Save transaction"}
              </Button>
            </form>
          )}
          {canManage && !canCollect && !canRefund && (
            <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              No balance remains to collect and no payment is available to
              refund.
            </p>
          )}
        </div>
      )}
    </dialog>
  );
}
