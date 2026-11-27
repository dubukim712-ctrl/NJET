"use client";

import { useId, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { recordOrderPaymentTransactionAction } from "@/data/actions/order-sales-report";
import { formatPhp, parsePhpAmount } from "@/lib/commerce";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
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
  const collectionFormId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");

  const submitPayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!order || busy || !canManage || !canCollect) return;
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
        transactionType: "collection",
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
      toast.success("Collection recorded.");
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
    setError(null);
    onClose();
  };
  const status = order ? reportOrderStatus(order) : null;
  const canCollect = Boolean(
    order &&
    !["cancelled", "expired"].includes(order.status) &&
    order.balance_due_minor > 0,
  );
  const showCollectionForm = canManage && canCollect;

  return (
    <Modal
      open={Boolean(order)}
      title={order ? `Order ${order.order_number}` : "Order details"}
      onClose={() => { if (!busy) handleClose(); }}
      size="wide"
      className="print:hidden"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={handleClose}>Close</Button>
          {showCollectionForm && (
            <Button type="submit" form={collectionFormId} loading={busy}>Save collection</Button>
          )}
        </div>
      }
    >
      {order && (
        <div className="space-y-5">
          <div className="text-sm text-muted-foreground">
            {order.completed_at ? "Sale completed" : "Order placed"} ·{" "}
            {formatReportDateTime(order.completed_at ?? order.created_at)}
            {order.invoice_no && <p>Invoice {order.invoice_no}</p>}
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

          {showCollectionForm && (
            <form
              className="space-y-3 rounded-lg border border-border p-4 print:hidden"
              id={collectionFormId}
              onSubmit={submitPayment}
            >
              <h3 className="font-semibold">Record a collection</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Select
                  name="method"
                  label="Method"
                  value={paymentMethod}
                  onValueChange={(value) => setPaymentMethod(value)}
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
                  step="0.01"
                  onWheel={(event) => event.currentTarget.blur()}
                  className="number-no-spinner"
                  required
                />
                <Input name="note" label="Note (optional)" maxLength={500} containerClassName="sm:col-span-2" />
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
            </form>
          )}
          {canManage && !canCollect && (
            <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              {["cancelled", "expired"].includes(order.status)
                ? "Collections cannot be recorded for cancelled or expired orders."
                : "No balance remains to collect."}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
