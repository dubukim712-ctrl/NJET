"use client";

import { useState } from "react";
import { CheckoutPolicyFields } from "@/components/checkout/CheckoutPolicyFields";
import { CreditCard, FileImage, UserRound } from "lucide-react";
import { getPaymentProviderLabel } from "@/data/commerce/payment-recipients";
import {
  PhilippineAddressFields,
  type PhilippineAddressValues,
} from "@/components/admin/commerce/PhilippineAddressFields";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { CheckoutPhoneVerification } from "@/components/checkout/CheckoutPhoneVerification";
import type { CheckoutOptions } from "@/data/commerce/checkout-options";
import type {
  Fulfillment,
  PaymentMethod,
  PaymentProvider,
} from "@/types/commerce-tables";

interface CheckoutFieldsProps extends Omit<
  CheckoutOptions,
  'policyVersions' | 'customerPhoneNumber' | 'customerPhoneVerified'
> {
  fieldErrors?: Record<string, string[]>;
  initialCustomerName: string;
  initialAddress: PhilippineAddressValues;
  initialPhoneNumber: string | null;
  initialVerifiedPhoneNumber: string | null;
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
  onPhoneVerificationChange: (verified: boolean) => void;
  policiesAccepted: boolean;
  onPoliciesAcceptedChange: (accepted: boolean) => void;
}

export function CheckoutFields(props: CheckoutFieldsProps) {
  const errorFor = (name: string) => props.fieldErrors?.[name]?.join(" ");
  const [address, setAddress] = useState(props.initialAddress);
  const providerRecipients = props.paymentRecipients.filter(
    (recipient) => recipient.provider === props.paymentProvider,
  );
  const availableProviders = [
    ...new Set(props.paymentRecipients.map((recipient) => recipient.provider)),
  ];
  const onlineUnavailableReason =
    props.paymentRecipients.length === 0
      ? "recipient not configured"
      : "unavailable for zero-reservation e-bike pickup";
  const homeCreditPaymentProofRequired =
    props.paymentMethod === "home_credit" && props.homeCreditDownpaymentDue > 0;
  const showPaymentAccount =
    props.paymentMethod === "online" || homeCreditPaymentProofRequired;

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-xl border bg-card p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Your information</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            name="customerName"
            defaultValue={props.initialCustomerName}
            error={errorFor("customerName")}
            label="Full name"
            autoComplete="name"
            required
            leadingIcon={<UserRound className="h-4 w-4" />}
          />
          <CheckoutPhoneVerification
            fieldError={errorFor("contactNumber")}
            initialPhoneNumber={props.initialPhoneNumber}
            initialVerifiedPhoneNumber={props.initialVerifiedPhoneNumber}
            verificationRequired={props.phoneVerificationRequired}
            onVerificationChange={props.onPhoneVerificationChange}
          />
        </div>
        <PhilippineAddressFields
          values={address}
          fieldErrors={props.fieldErrors}
          onChange={setAddress}
          disabled={false}
          required
        />
        {(
          [
            ["addressLine1", address.addressLine1],
            ["province", address.province],
            ["city", address.city],
            ["barangay", address.barangay],
            ["postalCode", address.postalCode],
            ["provinceCode", address.provinceCode ?? ""],
            ["cityCode", address.cityCode ?? ""],
            ["barangayCode", address.barangayCode ?? ""],
          ] as const
        ).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
      </section>

      <section className="space-y-4 rounded-xl border bg-card p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Fulfillment</h2>
        <Select
          label="How would you like to receive your order?"
          error={errorFor("fulfillment")}
          value={props.fulfillment}
          onValueChange={(value) =>
            props.onFulfillmentChange(value as Fulfillment)
          }
        >
          <option value="pickup">Pick up at store</option>
          <option value="delivery">Delivery</option>
        </Select>
        {props.fulfillment === "pickup" ? (
          <Select
            label="Pickup branch"
            error={errorFor("branchId")}
            value={props.branchId}
            onValueChange={(value) => props.onBranchChange(value)}
            required
          >
            <option value="">Select a branch</option>
            {props.branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </Select>
        ) : (
          <Select
            label="Delivery zone"
            error={errorFor("deliveryZoneId")}
            value={props.zoneId}
            onValueChange={(value) => props.onZoneChange(value)}
            required
          >
            <option value="">Select a delivery zone</option>
            {props.zones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name}
              </option>
            ))}
          </Select>
        )}
      </section>

      <section className="space-y-4 rounded-xl border bg-card p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Payment</h2>
        <Select
          label="Payment method"
          error={errorFor("paymentMethod")}
          value={props.paymentMethod}
          onValueChange={(value) =>
            props.onPaymentMethodChange(value as PaymentMethod)
          }
        >
          <option value="cash" disabled={props.cashUnavailable}>
            Cash
            {props.cashUnavailable
              ? " (unavailable for pickup reservations)"
              : ""}
          </option>
          <option value="online" disabled={!props.onlineAvailable}>
            Online payment
            {!props.onlineAvailable ? ` (${onlineUnavailableReason})` : ""}
          </option>
          <option
            value="home_credit"
            disabled={props.fulfillment === "delivery"}
          >
            Home Credit (store pickup)
          </option>
        </Select>
        {props.cashUnavailable && (
          <p className="text-sm text-muted-foreground">
            Cash is unavailable for pickup orders with an e-bike reservation
            fee. Choose another available payment method.
          </p>
        )}
        {props.paymentMethod === "home_credit" &&
          props.fulfillment === "pickup" && (
            <div className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
              <p className="text-sm text-muted-foreground sm:col-span-2">
                Home Credit requires an in-store installment application.
              </p>
              {homeCreditPaymentProofRequired && (
                <p className="text-sm text-muted-foreground sm:col-span-2">
                  Pay the Home Credit downpayment online after placing your
                  order and submit proof within one hour.
                </p>
              )}
            </div>
          )}
        {showPaymentAccount && (
          <>
            <Select
              label={
                props.paymentMethod === "home_credit"
                  ? "Payment platform for Home Credit downpayment"
                  : "Online payment platform"
              }
              name="paymentProvider"
              error={errorFor("paymentProvider")}
              value={props.paymentProvider}
              onValueChange={(value) =>
                props.onPaymentProviderChange(
                  value as PaymentProvider,
                )
              }
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
              error={errorFor("paymentRecipientId")}
              value={props.paymentRecipientId}
              onValueChange={(value) =>
                props.onPaymentRecipientChange(value)
              }
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
                A payment account is required for this downpayment, but none is
                configured. Please contact the store.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Payment instructions and proof upload will be available after
                you place your order.
              </p>
            )}
          </>
        )}
        {props.hasEbike && (
          <Input
            label="Valid ID document(s)"
            error={errorFor("documents")}
            type="file"
            multiple
            required
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) =>
              props.onIdentityFilesChange(Array.from(event.target.files ?? []))
            }
            helperText="Required for e-bike orders. Upload at least one ID image, up to 5 files."
            leadingIcon={<FileImage className="h-4 w-4" />}
          />
        )}
      </section>

      <CheckoutPolicyFields
        fieldErrors={props.fieldErrors}
        legalPolicies={props.legalPolicies}
        accepted={props.policiesAccepted}
        onAcceptedChange={props.onPoliciesAcceptedChange}
      />
    </div>
  );
}
