'use client';

import { Input } from '@/components/ui/Input';
import { PhilippineAddressFields, type PhilippineAddressValues } from '@/components/admin/commerce/PhilippineAddressFields';

export function ProfileContactFields({
  phoneNumber,
  address,
  verified,
  fieldErrors,
  saving,
  onPhoneChange,
  onAddressChange,
}: {
  phoneNumber: string;
  address: PhilippineAddressValues;
  verified: boolean;
  fieldErrors?: Record<string, string[]>;
  saving: boolean;
  onPhoneChange: (phone: string) => void;
  onAddressChange: (address: PhilippineAddressValues) => void;
}) {
  return (
    <section className="space-y-4 border-t pt-5">
      <h3 className="text-lg font-semibold">Contact information</h3>
      <Input
        label="Mobile number"
        type="tel"
        autoComplete="tel"
        placeholder="0917 123 4567"
        maxLength={24}
        value={phoneNumber}
        onChange={(event) => onPhoneChange(event.target.value)}
        error={fieldErrors?.phoneNumber?.[0]}
        disabled={saving}
        helperText="Changing your number clears its verification. You can verify it at checkout when required."
        rightAdornment={
          <span
            role="status"
            className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${verified ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}
          >
            {verified ? 'Verified' : 'Unverified'}
          </span>
        }
      />
      <PhilippineAddressFields
        title="Saved address"
        values={address}
        fieldErrors={fieldErrors}
        onChange={onAddressChange}
        disabled={saving}
      />
    </section>
  );
}
