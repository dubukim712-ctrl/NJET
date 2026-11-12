import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CustomerOrdersQuery } from "@/components/dashboard/CustomerOrdersQuery";

export const metadata = { title: "Orders | NJET" };

export default function OrdersPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to storefront
      </Link>
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
          Your account
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Orders</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Review your submitted orders and payment amounts.
        </p>
      </header>

      <CustomerOrdersQuery />
    </div>
  );
}
