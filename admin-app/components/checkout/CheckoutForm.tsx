'use client';

import { useState, type FormEvent } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useCart } from '@/components/cart/CartProvider';
import { useCheckoutSubmission } from '@/components/checkout/useCheckoutSubmission';
import { useCheckoutPricing } from '@/components/checkout/useCheckoutPricing';
import { CheckoutAuthNotice } from '@/components/checkout/CheckoutAuthNotice';
import { CheckoutEmptyCart } from '@/components/checkout/CheckoutEmptyCart';
import { CheckoutFormLayout } from '@/components/checkout/CheckoutFormLayout';
import type { PhilippineAddressValues } from '@/components/admin/commerce/PhilippineAddressFields';
import { CheckoutFields } from '@/components/checkout/CheckoutFields';
import { CheckoutOrderSummary } from '@/components/checkout/CheckoutOrderSummary';
import { DiscountCodeInput } from '@/components/commerce/DiscountCodeInput';
import { useCheckoutPolicyConsent } from '@/components/checkout/useCheckoutPolicyConsent';
import type { CheckoutOptions } from '@/data/commerce/checkout-options';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import type { Fulfillment, PaymentMethod, PaymentProvider } from '@/types/commerce-tables';

export function CheckoutForm({
  branches,
  zones,
  paymentRecipients,
  policyVersions,
  legalPolicies,
  phoneVerificationRequired,
  customerPhoneNumber,
  customerPhoneVerified,
  initialCustomerName,
  initialAddress,
}: CheckoutOptions & { initialCustomerName: string; initialAddress: PhilippineAddressValues }) {
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
  const { busy, error, submissionError, fieldErrors, retryable, submit } = useCheckoutSubmission(clear);

  function getCheckoutError() {
    if (!phoneVerificationReady) return 'Verify this contact number before placing your order.';
    if (loadingCart || !allVariantsLoaded) return catalogError ?? 'Some cart items are no longer available.';
    if (!stockAvailable) return 'The selected fulfillment option does not have enough stock for this cart.';
    if (!paymentAvailable) return 'Choose an active payment account for the selected payment method.';
    if (hasEbike && !identityFiles.length) return 'Upload at least one valid ID for an e-bike order.';
    return policyConsent.error;
  }

  function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !items.length) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const text = (name: string) => String(formData.get(name) ?? '').trim();
    void submit({
      form,
      customerId: user.id,
      identityFiles,
      hasEbike,
      getCheckoutError,
      payload: {
        customerName: text('customerName'),
        contactNumber: String(formData.get('contactNumber') ?? ''),
        fulfillment,
        branchId: fulfillment === 'pickup' ? activeBranchId : null,
        deliveryZoneId: fulfillment === 'delivery' ? activeZoneId : null,
        addressLine1: text('addressLine1') || null,
        provinceCode: text('provinceCode') || undefined,
        cityCode: text('cityCode') || undefined,
        barangayCode: text('barangayCode') || undefined,
        barangay: text('barangay') || null,
        city: text('city') || null,
        province: text('province') || null,
        postalCode: text('postalCode') || null,
        paymentMethod,
        paymentProvider: paymentProofRequired ? activePaymentProvider : null,
        paymentRecipientId: paymentProofRequired ? activePaymentRecipientId : null,
        termsAccepted: policyConsent.accepted,
        termsVersion: policyConsent.versions.terms,
        returnPolicyVersion: policyConsent.versions['return-policy'],
        privacyAccepted: policyConsent.accepted,
        privacyVersion: policyConsent.versions.privacy,
        items: items.map((item) => ({ variantId: item.variantId, quantity: item.quantity })),
        couponCode: activePreview?.code ?? null,
      },
    });
  }

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
      fields={
        <CheckoutFields
          branches={branches} zones={zones}
          fieldErrors={fieldErrors}
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
          initialCustomerName={initialCustomerName}
          initialAddress={initialAddress}
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
          legalPolicies={legalPolicies}
          policiesAccepted={policyConsent.accepted}
          onPoliciesAcceptedChange={policyConsent.onAcceptedChange}
        />
      }
      summary={
        <CheckoutOrderSummary
          couponInput={
            <DiscountCodeInput
              key={cartSignature}
              fieldError={fieldErrors?.couponCode?.join(" ")}
              channel="storefront"
              appliedCode={activePreview?.code}
              items={items.map(({ variantId, quantity }) => ({ variantId, quantity }))}
              disabled={busy || loadingCart || !allVariantsLoaded}
              onApplied={onApplied}
              onCleared={onCleared}
            />
          }
          items={cartItems}
          itemsError={fieldErrors?.items?.join(" ")}
          retryable={retryable}
          submissionError={submissionError}
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
