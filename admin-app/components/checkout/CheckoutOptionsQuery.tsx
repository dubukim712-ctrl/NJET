'use client';

import { CheckoutForm } from '@/components/checkout/CheckoutForm';
import { Button } from '@/components/ui/Button';
import {
  CheckoutOptionsQueryError,
  useCheckoutOptionsQuery,
} from '@/data/commerce/checkout-options-client';

export function CheckoutOptionsQuery({ userId }: { userId: string }) {
  const query = useCheckoutOptionsQuery(userId);

  if (!query.data && query.isPending) {
    return (
      <div
        className="space-y-4"
        role="status"
        aria-label="Loading checkout options"
        aria-busy="true"
      >
        <div className="h-28 animate-pulse rounded-xl border bg-card" />
        <div className="h-56 animate-pulse rounded-xl border bg-card" />
      </div>
    );
  }

  if (!query.data) {
    return (
      <section
        className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-5"
        role="alert"
      >
        <div>
          <h2 className="font-semibold">Checkout options are unavailable</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {query.error instanceof CheckoutOptionsQueryError
              ? query.error.message
              : 'Please try again later.'}
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => { void query.refetch(); }}>
          Try again
        </Button>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      {query.isError && (
        <p
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
          role="alert"
        >
          Could not refresh checkout options. Cached options are still shown.
        </p>
      )}
      <CheckoutForm {...query.data} />
    </div>
  );
}
