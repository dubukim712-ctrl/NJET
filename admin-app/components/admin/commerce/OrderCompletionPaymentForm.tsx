"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { completeCommerceOrderWithPaymentAction } from "@/data/actions/commerce-order-completion";
import { formatPhp, parsePhpAmount } from "@/lib/commerce";

type PaymentMethod = "cash" | "online" | "other";

export function OrderCompletionPaymentForm({
  orderId,
  balanceDueMinor,
  onCancel,
  onComplete,
}: {
  orderId: string;
  balanceDueMinor: number;
  onCancel: () => void;
  onComplete: () => void;
}) {
  const [amount, setAmount] = useState((balanceDueMinor / 100).toFixed(2));
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [provider, setProvider] = useState("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const amountMinor = parsePhpAmount(amount);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    if (amountMinor === null || amountMinor < 0) {
      setError("Enter a valid amount received.");
      return;
    }
    if (amountMinor > balanceDueMinor) {
      setError("The amount cannot exceed the displayed balance due.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const result = await completeCommerceOrderWithPaymentAction({
        orderId,
        amountMinor,
        paymentMethod: amountMinor > 0 ? method : null,
        paymentProvider:
          amountMinor > 0 && method === "online" ? provider || null : null,
        reference:
          amountMinor > 0 && method === "online"
            ? reference.trim() || null
            : null,
      });
      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      toast.success("Order completed and payment recorded.");
      onComplete();
    } catch (actionError) {
      console.error(
        "Could not complete the order with its payment.",
        actionError,
      );
      setError("Could not complete the order. Please try again.");
      toast.error("Could not complete the order. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="space-y-4 rounded-lg border border-primary/30 bg-primary/5 p-4"
      onSubmit={submit}
    >
      <div>
        <h3 className="font-semibold">Complete sale and record payment</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Balance due: {formatPhp(balanceDueMinor)}. Any unpaid remainder stays
          due.
        </p>
      </div>
      <Input
        name="amount"
        label="Amount received now (PHP)"
        type="number"
        min="0"
        max={(balanceDueMinor / 100).toFixed(2)}
        onWheel={(event) => event.currentTarget.blur()}
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
        required
        className="number-no-spinner max-w-[560px]"
      />
      {amountMinor !== null && amountMinor > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label="Method"
            value={method}
            onChange={(event) => {
              const value = event.target.value;
              if (value === "cash" || value === "online" || value === "other") {
                setMethod(value);
              }
            }}
            required
          >
            <option value="cash">Cash</option>
            <option value="online">Online</option>
            <option value="other">Other / unspecified</option>
          </Select>
          {method === "online" && (
            <>
              <Select
                label="Provider"
                value={provider}
                onChange={(event) => setProvider(event.target.value)}
                required
              >
                <option value="">Select provider</option>
                <option value="gcash">GCash</option>
                <option value="bank_transfer">Bank transfer</option>
                <option value="card">Card</option>
              </Select>
              <Input
                label="Reference (optional)"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                maxLength={120}
              />
            </>
          )}
        </div>
      )}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={busy}>
          Complete sale
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
