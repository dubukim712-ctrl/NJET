'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createCommerceOrderAction } from '@/data/actions/commerce-checkout';
import { uploadOrderDocuments } from '@/data/commerce/documents-client';
import { adminOrdersQueryKey } from '@/data/commerce/admin-orders-client';
import { useInvalidateCustomerOrdersQuery } from '@/data/commerce/customer-orders-client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useCart } from '@/components/cart/CartProvider';
import { useCheckoutPricing } from '@/components/checkout/useCheckoutPricing';
import { CheckoutAuthNotice } from '@/components/checkout/CheckoutAuthNotice';
import { CheckoutEmptyCart } from '@/components/checkout/CheckoutEmptyCart';
import { CheckoutFormLayout } from '@/components/checkout/CheckoutFormLayout';
import { CheckoutFields } from '@/components/checkout/CheckoutFields';
import { CheckoutOrderSummary } from '@/components/checkout/CheckoutOrderSummary';
import { DiscountCodeInput } from '@/components/commerce/DiscountCodeInput';
import { useCheckoutPolicyConsent } from '@/components/checkout/useCheckoutPolicyConsent';
import { Button } from '@/components/ui/Button';
import type { CheckoutOptions } from '@/data/commerce/checkout-options';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import type { Fulfillment, PaymentMethod, PaymentProvider } from '@/types/commerce-tables';

export function CheckoutForm({
  branches,
  zones,
  paymentRecipients,
  policyVersions,
  phoneVerificationRequired,
  customerPhoneNumber,
  customerPhoneVerified,
}: CheckoutOptions) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const invalidateCustomerOrders = useInvalidateCustomerOrdersQuery();
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
  const [branchId, setBranchId] = useState<string | null>(null);
  const [phoneVerificationReady, setPhoneVerificationReady] = useState(!phoneVerificationRequired || customerPhoneVerified);
  const [zoneId, setZoneId] = useState(zones[0]?.id ?? '');
  const [identityFiles, setIdentityFiles] = useState<File[]>([]);
  const policyConsent = useCheckoutPolicyConsent(policyVersions);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requiresLogin, setRequiresLogin] = useState(false);
  const firstCartBranchId = items[0]?.branchId;
  const preferredBranchId =
    firstCartBranchId &&
    items.every((item) => item.branchId === firstCartBranchId) &&
    branches.some((branch) => branch.id === firstCartBranchId)
      ? firstCartBranchId
      : null;
  const branchCandidate = branchId ?? preferredBranchId;
  const activeBranchId = branches.some((branch) => branch.id === branchCandidate)
    ? branchCandidate ?? ''
    : branches[0]?.id ?? '';
  const activeZoneId = zones.some((zone) => zone.id === zoneId)
    ? zoneId
    : zones[0]?.id ?? '';
  const activeRecipient = paymentRecipients.find((recipient) =>
    recipient.id === paymentRecipientId && recipient.provider === paymentProvider
  );
  const activePaymentProvider = activeRecipient?.provider
    ?? paymentRecipients[0]?.provider ?? paymentProvider;
  const activePaymentRecipientId = activeRecipient?.id ?? paymentRecipients[0]?.id ?? '';
  const {
    cartItems,
    allVariantsLoaded,
    hasEbike,
    subtotal,
    discountTotal,
    pickupReservationAmount,
    homeCreditDownpayment: cartHomeCreditDownpayment,
    total,
    stockAvailable,
    activePreview,
    onApplied,
    onCleared,
    cartSignature,
    catalogError,
    loadingCart,
    deliveryFee,
  } = useCheckoutPricing({
    items,
    fulfillment,
    branchId: activeBranchId,
    branches,
    zoneId: activeZoneId,
    zones,
  });
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
      recipient.id === activePaymentRecipientId &&
      recipient.provider === activePaymentProvider
  );
  const paymentAvailable = paymentMethod === 'online'
    ? onlineAvailable && paymentRecipientAvailable
    : homeCreditDownpaymentDue === 0 || paymentRecipientAvailable;
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
    if (!phoneVerificationReady) {
      return setError('Verify this contact number before placing your order.');
    }
    if (loadingCart || !allVariantsLoaded) return setError(catalogError ?? 'Some cart items are no longer available.');
    if (!stockAvailable) return setError('The selected fulfillment option does not have enough stock for this cart.');
    if (!paymentAvailable) return setError('Choose an active payment account for the selected payment method.');
    if (hasEbike && !identityFiles.length) return setError('Upload at least one valid ID for an e-bike order.');
    if (policyConsent.error) return setError(policyConsent.error);

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
        branchId: fulfillment === 'pickup' ? activeBranchId : null,
        deliveryZoneId: fulfillment === 'delivery' ? activeZoneId : null,
        addressLine1: text('addressLine1') || null,
        barangay: text('barangay') || null,
        city: text('city') || null,
        province: text('province') || null,
        postalCode: text('postalCode') || null,
        paymentMethod,
        paymentProvider: paymentProofRequired ? activePaymentProvider : null,
        paymentRecipientId: paymentProofRequired ? activePaymentRecipientId : null,
        termsAccepted: policyConsent.termsAccepted,
        termsVersion: policyConsent.versions.terms,
        returnPolicyVersion: policyConsent.versions['return-policy'],
        privacyAccepted: policyConsent.privacyAccepted,
        privacyVersion: policyConsent.versions.privacy,
        items: items.map((item) => ({ variantId: item.variantId, quantity: item.quantity })),
        couponCode: activePreview?.code ?? null,
        documents: uploaded.documents,
      });
      if (!result.success) {
        setError(result.error);
        setRequiresLogin(Boolean(result.requiresLogin));
        setBusy(false);
        return;
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminOrdersQueryKey }),
        invalidateCustomerOrders(),
      ]);
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
    return <CheckoutEmptyCart cartError={cartError} />;
  }

  if (!user) return <CheckoutAuthNotice needsSignIn />;
  if (!hasPermission(user, PERMISSIONS.storefrontAccess)) {
    return <CheckoutAuthNotice needsSignIn={false} />;
  }

  return (
    <CheckoutFormLayout
      onSubmit={submitOrder}
      cartError={cartError}
      catalogError={catalogError}
      loadingCart={loadingCart}
      error={error}
      requiresLogin={requiresLogin}
      fields={
        <CheckoutFields
          branches={branches} zones={zones}
          phoneVerificationRequired={phoneVerificationRequired}
          paymentRecipients={paymentRecipients}
          fulfillment={fulfillment}
          paymentMethod={paymentMethod}
          paymentProvider={activePaymentProvider}
          paymentRecipientId={activePaymentRecipientId}
          branchId={activeBranchId}
          zoneId={activeZoneId}
          onlineAvailable={onlineAvailable}
          cashUnavailable={cashUnavailable}
          homeCreditDownpaymentDue={homeCreditDownpaymentDue}
          initialPhoneNumber={customerPhoneNumber}
          initialVerifiedPhoneNumber={
            customerPhoneVerified ? customerPhoneNumber : null
          }
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
          onPhoneVerificationChange={setPhoneVerificationReady}
          onTermsChange={policyConsent.onTermsChange}
          onPrivacyChange={policyConsent.onPrivacyChange}
        />
      }
      summary={
        <CheckoutOrderSummary
          couponInput={
            <DiscountCodeInput
              key={cartSignature}
              channel="storefront"
              appliedCode={activePreview?.code}
              items={items.map(({ variantId, quantity }) => ({ variantId, quantity }))}
              disabled={busy || loadingCart || !allVariantsLoaded}
              onApplied={onApplied}
              onCleared={onCleared}
            />
          }
          items={cartItems}
          subtotal={subtotal}
          discountTotal={discountTotal}
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
          phoneVerificationReady={phoneVerificationReady}
        />
      }
    />
  );
}
