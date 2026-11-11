import { CheckoutAuthNotice } from '@/components/checkout/CheckoutAuthNotice';
import { CheckoutOptionsQuery } from '@/components/checkout/CheckoutOptionsQuery';
import { getAuthContext } from '@/data/auth/guards';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

export const metadata = { title: 'Checkout | NJET' };

export default async function CheckoutPage() {
  const auth = await getAuthContext();
  const hasCustomerAccess = Boolean(
    auth && hasPermission(auth.profile, PERMISSIONS.storefrontAccess)
  );

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
      ) : (
        <CheckoutOptionsQuery userId={auth.user.id} />
      )}
    </div>
  );
}
