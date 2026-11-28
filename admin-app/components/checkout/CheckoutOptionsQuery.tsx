'use client';

import { useAuth } from '@/components/auth/AuthProvider';
import { useCart } from '@/components/cart/CartProvider';
import { CheckoutAuthNotice } from '@/components/checkout/CheckoutAuthNotice';
import { CheckoutEmptyCart } from '@/components/checkout/CheckoutEmptyCart';
import { CheckoutShell } from '@/components/checkout/CheckoutShell';
import { CheckoutForm } from '@/components/checkout/CheckoutForm';
import { Button } from '@/components/ui/Button';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { CheckoutOptionsQueryError, useCheckoutOptionsQuery } from '@/data/commerce/checkout-options-client';

export function CheckoutOptionsQuery() {
  const { user, sessionResolved } = useAuth();
  const { items, error } = useCart();
  if (!sessionResolved && !user) return <CheckoutShell />;
  if (!user) return <CheckoutShell><CheckoutAuthNotice needsSignIn /></CheckoutShell>;
  if (!hasPermission(user, PERMISSIONS.storefrontAccess)) {
    return <CheckoutShell><CheckoutAuthNotice needsSignIn={false} /></CheckoutShell>;
  }
  if (!items.length) return <CheckoutShell><CheckoutEmptyCart cartError={error} /></CheckoutShell>;
  return <AuthorizedCheckout key={user.id} userId={user.id} />;
}

function AuthorizedCheckout({ userId }: { userId: string }) {
  const query = useCheckoutOptionsQuery(userId);
  if (!query.data && query.isPending) return <CheckoutShell />;
  if (!query.data) {
    return (
      <CheckoutShell>
        <section className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-5" role="alert">
          <h2 className="font-semibold">Checkout options are unavailable</h2>
          <p className="text-sm text-muted-foreground">
            {query.error instanceof CheckoutOptionsQueryError ? query.error.message : 'Please try again later.'}
          </p>
          <Button type="button" variant="outline" onClick={() => void query.refetch()}>Try again</Button>
        </section>
      </CheckoutShell>
    );
  }

  return (
    <CheckoutShell>
      {query.isError && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
          Could not refresh checkout options. Cached options are still shown.
        </p>
      )}
      <CheckoutForm {...query.data} />
    </CheckoutShell>
  );
}
