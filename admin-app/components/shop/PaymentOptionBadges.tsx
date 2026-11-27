import { Check } from "lucide-react";

const paymentOptions = ["Home Credit", "GGives", "Credit Cards", "Alipay", "QR Ph"];

export function PaymentOptionBadges({ compact = false }: { compact?: boolean }) {
  return (
    <ul
      aria-label="Payment and installment options"
      className={compact ? "flex flex-wrap gap-1.5" : "flex flex-wrap gap-2"}
    >
      {paymentOptions.map((label) => (
        <li
          key={label}
          className={`inline-flex items-center gap-1.5 border bg-card text-xs font-medium text-card-foreground ${compact ? "rounded-md px-2.5 py-1" : "rounded-full px-3 py-1.5"}`}
        >
          <Check className="size-3.5 shrink-0 text-success" aria-hidden="true" />
          {label}
        </li>
      ))}
    </ul>
  );
}
