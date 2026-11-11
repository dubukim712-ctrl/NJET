import Link from 'next/link';
import { CheckoutAuthNotice } from '@/components/checkout/CheckoutAuthNotice';
import { CheckoutForm } from '@/components/checkout/CheckoutForm';
import { getAuthContext } from '@/data/auth/guards';
import { getCheckoutOptions } from '@/data/commerce/checkout-options';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

export const metadata = { title: 'Checkout | NJET' };

export default async function CheckoutPage() {
  const auth = await getAuthContext();
  const hasCustomerAccess = Boolean(
    auth && hasPermission(auth.profile, PERMISSIONS.storefrontAccess)
  );
  const result = hasCustomerAccess ? await getCheckoutOptions() : null;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Noel &amp; Jane E-bike Trading</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Checkout</h1>
      </header>
      {!auth ? (
        <CheckoutAuthNotice needsSignIn />
      ) : !hasCustomerAccess ? (
        <CheckoutAuthNotice needsSignIn={false} />
      ) : !result || result.error || !result.data ? (
        <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-5" role="alert">
          <h2 className="font-semibold">Checkout options are unavailable</h2>
          <p className="mt-1 text-sm text-muted-foreground">{result?.error}</p>
          <Link href="/checkout" className="mt-4 inline-flex min-h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
            Try again
          </Link>
        </section>
      ) : (
        <CheckoutForm {...result.data} />
      )}
    </div>
  );
}
