'use client';

import { PhilippineMobileInput } from '@/components/ui/PhilippineMobileInput';
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
      <PhilippineMobileInput
        name="phoneNumber"
        label="Mobile number"
        value={phoneNumber}
        onValueChange={onPhoneChange}
        error={fieldErrors?.phoneNumber?.[0]}
        disabled={saving}
        helperText="Changing your number clears its verification. You can verify it at checkout when required."
        rightAdornment={
          <span
            role="status"
            className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${verified ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'}`}
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
