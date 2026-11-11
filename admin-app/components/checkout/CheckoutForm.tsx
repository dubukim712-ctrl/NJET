'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createCommerceOrderAction } from '@/data/actions/commerce-checkout';
import { useCartVariantsQuery } from '@/data/commerce/catalog-client';
import { uploadOrderDocuments } from '@/data/commerce/documents-client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useCart } from '@/components/cart/CartProvider';
import { CheckoutAuthNotice } from '@/components/checkout/CheckoutAuthNotice';
import { CheckoutFields } from '@/components/checkout/CheckoutFields';
import { CheckoutOrderSummary } from '@/components/checkout/CheckoutOrderSummary';
import { Button } from '@/components/ui/Button';
import type { CheckoutOptions } from '@/data/commerce/checkout-options';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import type { Fulfillment, PaymentMethod, PaymentProvider } from '@/types/commerce-tables';

export function CheckoutForm({
  branches,
  zones,
  paymentRecipients,
}: CheckoutOptions) {
  const router = useRouter();
  const { user } = useAuth();
  const { items, error: cartError, clear } = useCart();
  const [fulfillment, setFulfillment] = useState<Fulfillment>('pickup');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider>(
    paymentRecipients[0]?.provider ?? 'gcash'
  );
  const [paymentRecipientId, setPaymentRecipientId] = useState(
    paymentRecipients[0]?.id ?? ''
  );
  const [branchId, setBranchId] = useState(branches[0]?.id ?? '');
  const [zoneId, setZoneId] = useState(zones[0]?.id ?? '');
  const [identityFiles, setIdentityFiles] = useState<File[]>([]);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requiresLogin, setRequiresLogin] = useState(false);
  const {
    data: variants = [],
    error: queryError,
    isFetching,
  } = useCartVariantsQuery(items.map((item) => item.variantId));
  const catalogError = queryError instanceof Error
    ? queryError.message
    : queryError ? 'Cart item details could not be loaded.' : null;
  const loadingCart = items.length > 0 && isFetching;
  const variantById = new Map(variants.map((variant) => [variant.id, variant]));
  const cartItems = items.map((item) => ({
    ...item,
    variant: variantById.get(item.variantId) ?? null,
  }));
  const allVariantsLoaded = cartItems.length > 0 && cartItems.every((item) => item.variant);
  const hasEbike = cartItems.some((item) => item.variant?.productType === 'ebike');
  const subtotal = cartItems.reduce(
    (sum, item) => sum + (item.variant?.price_minor ?? 0) * item.quantity,
    0
  );
  const pickupReservationAmount = fulfillment === 'pickup'
    ? cartItems.reduce((sum, item) =>
        sum + (item.variant?.productType === 'ebike'
          ? item.variant.reservation_minor * item.quantity
          : 0), 0)
    : 0;
  const cartHomeCreditDownpayment = cartItems.reduce(
    (sum, item) =>
      sum + (item.variant?.home_credit_downpayment_minor ?? 0) * item.quantity,
    0
  );
  const deliveryFee = fulfillment === 'delivery'
    ? zones.find((zone) => zone.id === zoneId)?.fee_minor ?? 0
    : 0;
  const total = subtotal + deliveryFee;
  const onlineAvailable =
    paymentRecipients.length > 0 &&
    !(fulfillment === 'pickup' && hasEbike && pickupReservationAmount === 0);
  const cashUnavailable = fulfillment === 'pickup' && cartItems.some(
    (item) => (item.variant?.reservation_minor ?? 0) > 0
  );
  const paymentMethod = cashUnavailable && selectedPaymentMethod === 'cash'
    ? onlineAvailable ? 'online' : 'home_credit'
    : selectedPaymentMethod === 'online' && !onlineAvailable
      ? cashUnavailable ? 'home_credit' : 'cash'
      : selectedPaymentMethod;
  const reservationDue = paymentMethod === 'online' ? pickupReservationAmount : 0;
  const homeCreditDownpaymentDue = paymentMethod === 'home_credit'
    ? cartHomeCreditDownpayment
    : 0;
  const paymentProofRequired = paymentMethod === 'online' || homeCreditDownpaymentDue > 0;
  const paymentRecipientAvailable = paymentRecipients.some(
    (recipient) =>
      recipient.id === paymentRecipientId && recipient.provider === paymentProvider
  );
  const paymentAvailable = paymentMethod === 'online'
    ? onlineAvailable && paymentRecipientAvailable
    : homeCreditDownpaymentDue === 0 || paymentRecipientAvailable;
  const pickupAvailable = allVariantsLoaded && cartItems.every((item) =>
    (item.variant?.stockByBranch.find((stock) => stock.branchId === branchId)?.stock ?? 0) >= item.quantity
  );
  const deliveryAvailable = allVariantsLoaded && branches.some((branch) =>
    cartItems.every((item) =>
      (item.variant?.stockByBranch.find((stock) => stock.branchId === branch.id)?.stock ?? 0) >= item.quantity
    )
  );
  const stockAvailable = fulfillment === 'pickup' ? pickupAvailable : deliveryAvailable;
  const onlineDue = paymentMethod === 'online'
    ? reservationDue > 0 && fulfillment === 'pickup' ? reservationDue : total
    : 0;

  const submitOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setError(null);
    setRequiresLogin(false);
    if (!items.length) return setError('Your cart is empty.');
    if (!user) {
      setError('You must sign in before placing your order.');
      setRequiresLogin(true);
      return;
    }
    if (!hasPermission(user, PERMISSIONS.storefrontAccess)) {
      return setError('This account does not have permission to place customer orders.');
    }
    if (loadingCart || !allVariantsLoaded) return setError(catalogError ?? 'Some cart items are no longer available.');
    if (!stockAvailable) return setError('The selected fulfillment option does not have enough stock for this cart.');
    if (!paymentAvailable) return setError('Choose an active payment account for the selected payment method.');
    if (hasEbike && !identityFiles.length) return setError('Upload at least one valid ID for an e-bike order.');
    if (!termsAccepted || !privacyAccepted) return setError('Confirm both policy notices before placing your order.');

    setBusy(true);
    const formData = new FormData(event.currentTarget);
    const text = (name: string) => String(formData.get(name) ?? '').trim();
    let uploaded: Awaited<ReturnType<typeof uploadOrderDocuments>>;
    try {
      uploaded = await uploadOrderDocuments(null, hasEbike ? identityFiles : []);
    } catch (uploadError) {
      console.error('Could not upload checkout documents.', uploadError);
      setBusy(false);
      setError('A document could not be uploaded. Please try again.');
      return;
    }
    if (uploaded.error) {
      setBusy(false);
      setError(uploaded.error);
      return;
    }

    try {
      const result = await createCommerceOrderAction({
        customerName: text('customerName'),
        contactNumber: text('contactNumber'),
        fulfillment,
        branchId: fulfillment === 'pickup' ? branchId : null,
        deliveryZoneId: fulfillment === 'delivery' ? zoneId : null,
        addressLine1: text('addressLine1') || null,
        barangay: text('barangay') || null,
        city: text('city') || null,
        province: text('province') || null,
        postalCode: text('postalCode') || null,
        paymentMethod,
        paymentProvider: paymentProofRequired ? paymentProvider : null,
        paymentRecipientId: paymentProofRequired ? paymentRecipientId : null,
        termsAccepted,
        privacyAccepted,
        items: items.map((item) => ({ variantId: item.variantId, quantity: item.quantity })),
        documents: uploaded.documents,
      });
      if (!result.success) {
        setError(result.error);
        setRequiresLogin(Boolean(result.requiresLogin));
        setBusy(false);
        return;
      }
      const clearResult = clear();
      if (!clearResult.success) toast.error('Order placed, but your local cart could not be cleared.');
      router.push(paymentProofRequired
        ? `/dashboard/orders/${encodeURIComponent(result.data.orderId)}`
        : `/dashboard/orders?placed=${encodeURIComponent(result.data.orderId)}`);
    } catch (orderError) {
      console.error('Could not confirm checkout submission status.', orderError);
      setError('We could not confirm whether your order was placed. Check order history before retrying.');
      setBusy(false);
    }
  };

  if (!items.length) {
    return (
      <section className="rounded-xl border bg-card p-8 text-center">
        {cartError && <p className="mb-4 text-sm text-destructive" role="alert">{cartError}</p>}
        <h1 className="text-xl font-semibold">Your cart is empty</h1>
        <p className="mt-2 text-sm text-muted-foreground">Add products before starting checkout.</p>
        <Button asChild className="mt-5"><Link href="/shop">Browse products</Link></Button>
      </section>
    );
  }

  if (!user) return <CheckoutAuthNotice needsSignIn />;
  if (!hasPermission(user, PERMISSIONS.storefrontAccess)) {
    return <CheckoutAuthNotice needsSignIn={false} />;
  }

  return (
    <form className="grid gap-6 lg:grid-cols-[1fr_21rem]" onSubmit={submitOrder}>
      <div className="space-y-5">
        {cartError && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">{cartError}</p>}
        {(catalogError || loadingCart) && (
          <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground" role="status">
            {catalogError ?? 'Loading current product details...'}
          </p>
        )}
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
            <p>{error}</p>
            {requiresLogin && (
              <Link href="/login?redirect=%2Fcheckout" className="mt-2 inline-flex min-h-8 items-center font-medium underline underline-offset-4">
                Sign in to continue
              </Link>
            )}
          </div>
        )}
        <CheckoutFields
          branches={branches}
          zones={zones}
          paymentRecipients={paymentRecipients}
          fulfillment={fulfillment}
          paymentMethod={paymentMethod}
          paymentProvider={paymentProvider}
          paymentRecipientId={paymentRecipientId}
          branchId={branchId}
          zoneId={zoneId}
          onlineAvailable={onlineAvailable}
          cashUnavailable={cashUnavailable}
          homeCreditDownpaymentDue={homeCreditDownpaymentDue}
          hasEbike={hasEbike}
          onFulfillmentChange={(value) => {
            setFulfillment(value);
            setSelectedPaymentMethod(
              value === 'delivery' && selectedPaymentMethod === 'home_credit'
                ? 'cash'
                : selectedPaymentMethod
            );
          }}
          onPaymentMethodChange={setSelectedPaymentMethod}
          onPaymentProviderChange={(value) => {
            setPaymentProvider(value);
            setPaymentRecipientId(
              paymentRecipients.find((recipient) => recipient.provider === value)?.id ?? ''
            );
          }}
          onPaymentRecipientChange={setPaymentRecipientId}
          onBranchChange={setBranchId}
          onZoneChange={setZoneId}
          onIdentityFilesChange={setIdentityFiles}
          onTermsChange={setTermsAccepted}
          onPrivacyChange={setPrivacyAccepted}
        />
      </div>
      <CheckoutOrderSummary
        items={cartItems}
        subtotal={subtotal}
        deliveryFee={deliveryFee}
        total={total}
        reservationDue={reservationDue}
        homeCreditDownpaymentDue={homeCreditDownpaymentDue}
        paymentMethod={paymentMethod}
        onlineDue={onlineDue}
        stockAvailable={stockAvailable}
        paymentAvailable={paymentAvailable}
        allVariantsLoaded={allVariantsLoaded}
        loading={loadingCart || Boolean(catalogError)}
        busy={busy}
      />
    </form>
  );
}
