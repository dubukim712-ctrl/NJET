'use client';

import { useState } from 'react';
import { CreditCard, FileImage, Phone, UserRound } from 'lucide-react';
import { getPaymentProviderLabel } from '@/data/commerce/payment-recipients';
import {
  PhilippineAddressFields,
  type PhilippineAddressValues,
} from '@/components/admin/commerce/PhilippineAddressFields';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { CheckoutOptions } from '@/data/commerce/checkout-options';
import type { Fulfillment, PaymentMethod, PaymentProvider } from '@/types/commerce-tables';

interface CheckoutFieldsProps extends CheckoutOptions {
  fulfillment: Fulfillment;
  paymentMethod: PaymentMethod;
  branchId: string;
  zoneId: string;
  paymentProvider: PaymentProvider;
  paymentRecipientId: string;
  onlineAvailable: boolean;
  cashUnavailable: boolean;
  homeCreditDownpaymentDue: number;
  hasEbike: boolean;
  onFulfillmentChange: (value: Fulfillment) => void;
  onPaymentMethodChange: (value: PaymentMethod) => void;
  onPaymentProviderChange: (value: PaymentProvider) => void;
  onPaymentRecipientChange: (value: string) => void;
  onBranchChange: (value: string) => void;
  onZoneChange: (value: string) => void;
  onIdentityFilesChange: (files: File[]) => void;
  onTermsChange: (accepted: boolean) => void;
  onPrivacyChange: (accepted: boolean) => void;
}

export function CheckoutFields(props: CheckoutFieldsProps) {
  const [address, setAddress] = useState<PhilippineAddressValues>({
    addressLine1: '',
    province: '',
    city: '',
    barangay: '',
    postalCode: '',
  });
  const providerRecipients = props.paymentRecipients.filter(
    (recipient) => recipient.provider === props.paymentProvider
  );
  const availableProviders = [...new Set(
    props.paymentRecipients.map((recipient) => recipient.provider)
  )];
  const onlineUnavailableReason = props.paymentRecipients.length === 0
    ? 'recipient not configured'
    : 'unavailable for zero-reservation e-bike pickup';
  const homeCreditPaymentProofRequired =
    props.paymentMethod === 'home_credit' && props.homeCreditDownpaymentDue > 0;
  const showPaymentAccount =
    props.paymentMethod === 'online' || homeCreditPaymentProofRequired;

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-xl border bg-card p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Your information</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input name="customerName" label="Full name" autoComplete="name" required leadingIcon={<UserRound className="h-4 w-4" />} />
          <Input name="contactNumber" label="Contact number" type="tel" autoComplete="tel" required leadingIcon={<Phone className="h-4 w-4" />} />
        </div>
        <PhilippineAddressFields
          values={address}
          onChange={setAddress}
          disabled={false}
          required
        />
        {(
          [
            ['addressLine1', address.addressLine1],
            ['province', address.province],
            ['city', address.city],
            ['barangay', address.barangay],
            ['postalCode', address.postalCode],
          ] as const
        ).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
      </section>

      <section className="space-y-4 rounded-xl border bg-card p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Fulfillment</h2>
        <Select
          label="How would you like to receive your order?"
          value={props.fulfillment}
          onChange={(event) => props.onFulfillmentChange(event.target.value as Fulfillment)}
        >
          <option value="pickup">Pick up at store</option>
          <option value="delivery">Delivery</option>
        </Select>
        {props.fulfillment === 'pickup' ? (
          <Select label="Pickup branch" value={props.branchId} onChange={(event) => props.onBranchChange(event.target.value)} required>
            <option value="">Select a branch</option>
            {props.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name} - {branch.address}</option>)}
          </Select>
        ) : (
          <Select label="Delivery zone" value={props.zoneId} onChange={(event) => props.onZoneChange(event.target.value)} required>
            <option value="">Select a delivery zone</option>
            {props.zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}
          </Select>
        )}
      </section>

      <section className="space-y-4 rounded-xl border bg-card p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Payment</h2>
        <Select
          label="Payment method"
          value={props.paymentMethod}
          onChange={(event) => props.onPaymentMethodChange(event.target.value as PaymentMethod)}
        >
          <option value="cash" disabled={props.cashUnavailable}>
            Cash{props.cashUnavailable ? ' (unavailable for pickup reservations)' : ''}
          </option>
          <option value="online" disabled={!props.onlineAvailable}>
            Online payment{!props.onlineAvailable ? ` (${onlineUnavailableReason})` : ''}
          </option>
          <option value="home_credit" disabled={props.fulfillment === 'delivery'}>
            Home Credit (store pickup)
          </option>
        </Select>
        {props.cashUnavailable && (
          <p className="text-sm text-muted-foreground">
            Cash is unavailable for pickup orders with an e-bike reservation fee. Choose another available payment method.
          </p>
        )}
        {props.paymentMethod === 'home_credit' && props.fulfillment === 'pickup' && (
          <div className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
            <p className="text-sm text-muted-foreground sm:col-span-2">Home Credit requires an in-store installment application.</p>
            {homeCreditPaymentProofRequired && (
              <p className="text-sm text-muted-foreground sm:col-span-2">
                Pay the Home Credit downpayment online after placing your order and submit proof within one hour.
              </p>
            )}
          </div>
        )}
        {showPaymentAccount && (
          <>
            <Select
              label={props.paymentMethod === 'home_credit'
                ? 'Payment platform for Home Credit downpayment'
                : 'Online payment platform'}
              name="paymentProvider"
              value={props.paymentProvider}
              onChange={(event) => props.onPaymentProviderChange(event.target.value as PaymentProvider)}
              required
              leadingIcon={<CreditCard className="h-4 w-4" />}
            >
              {availableProviders.map((provider) => (
                <option key={provider} value={provider}>
                  {getPaymentProviderLabel(provider)}
                </option>
              ))}
            </Select>
            <Select
              label="Payment account"
              value={props.paymentRecipientId}
              onChange={(event) => props.onPaymentRecipientChange(event.target.value)}
              required
            >
              {providerRecipients.map((recipient) => (
                <option key={recipient.id} value={recipient.id}>
                  {recipient.recipientName}
                </option>
              ))}
            </Select>
            {props.paymentRecipients.length === 0 ? (
              <p className="text-sm text-destructive" role="alert">
                A payment account is required for this downpayment, but none is configured. Please contact the store.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Payment instructions and proof upload will be available after you place your order.
              </p>
            )}
          </>
        )}
        {props.hasEbike && (
          <Input
            label="Valid ID document(s)"
            type="file"
            multiple
            required
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => props.onIdentityFilesChange(Array.from(event.target.files ?? []))}
            helperText="Required for e-bike orders. Upload at least one ID image, up to 5 files."
            leadingIcon={<FileImage className="h-4 w-4" />}
          />
        )}
      </section>

      <section className="space-y-3 rounded-xl border bg-card p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Policies</h2>
        <p className="text-sm leading-5 text-muted-foreground">
          These are explicit draft placeholders and must be replaced with legally reviewed NJET policies before launch.
        </p>
        <label className="flex items-start gap-3 text-sm leading-5">
          <input type="checkbox" onChange={(event) => props.onTermsChange(event.target.checked)} required className="mt-1 size-4 accent-primary" />
          <span>I agree to the Terms &amp; Conditions (draft placeholder).</span>
        </label>
        <label className="flex items-start gap-3 text-sm leading-5">
          <input type="checkbox" onChange={(event) => props.onPrivacyChange(event.target.checked)} required className="mt-1 size-4 accent-primary" />
          <span>I acknowledge the Privacy Policy (draft placeholder).</span>
        </label>
      </section>
    </div>
  );
}
