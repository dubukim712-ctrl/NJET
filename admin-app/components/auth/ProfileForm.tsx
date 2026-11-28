'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Link2, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { updateProfileSchema, type UpdateProfileInput } from '@/lib/validations/auth';
import { ProfileContactFields } from '@/components/auth/ProfileContactFields';
import { Button } from '@/components/ui/Button';
import { resolveCheckoutAddress } from '@/data/commerce/checkout-address';
import { useInvalidateCheckoutOptionsQuery } from '@/data/commerce/checkout-options-client';
import { formatSavedPhilippineMobileNumber } from '@/lib/phone-number';
import { philippineMobileSchema } from '@/lib/validations/philippine-mobile';
import { updateCustomerProfileAction, updateProfileAction, type CustomerProfile } from '@/data/actions/profile';
import type { UserProfile } from '@/types/database';
import { useAuth } from '@/components/auth/AuthProvider';
import { Input } from '@/components/ui/Input';
import { useInvalidateCustomerProfileQuery } from '@/data/auth/customer-profile-client';

export function ProfileForm({ profile, contact }: {
  profile: Pick<UserProfile, 'id' | 'full_name' | 'avatar_url'>;
  contact?: CustomerProfile;
}) {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const invalidateProfile = useInvalidateCustomerProfileQuery(profile.id);
  const invalidateCheckout = useInvalidateCheckoutOptionsQuery();
  const [phoneNumber, setPhoneNumber] = useState(() => formatSavedPhilippineMobileNumber(contact?.phone_number));
  const [address, setAddress] = useState(() => resolveCheckoutAddress(contact));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      fullName: profile.full_name ?? '',
      avatarUrl: profile.avatar_url ?? '',
    },
  });

  const onSubmit = async (data: UpdateProfileInput) => {
    setServerError(null);

    setFieldErrors(undefined);

    const phone = philippineMobileSchema.safeParse(phoneNumber);
    if (contact && phoneNumber !== '' && !phone.success) {
      setFieldErrors({ phoneNumber: [phone.error.issues[0].message] });
      return;
    }

    try {
      const formData = new FormData();
      formData.set('fullName', data.fullName ?? '');
      formData.set('avatarUrl', data.avatarUrl ?? '');
      const result = contact
        ? await updateCustomerProfileAction({ ...data, phoneNumber, ...resolveCheckoutAddress(), ...address })
        : await updateProfileAction(formData);

      if (!result.success) {
        setServerError(result.error);
        setFieldErrors(result.fieldErrors);
        return;
      }

      await Promise.all([refreshUser(), invalidateProfile(), invalidateCheckout()]);
      toast.success('Profile updated.');
      router.refresh();
    } catch {
      setServerError('Could not save your profile. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <Input
        id="fullName"
        label="Full name"
        type="text"
        autoComplete="name"
        placeholder="Jane Doe"
        leadingIcon={<UserRound className="h-4 w-4" />}
        error={errors.fullName?.message ?? fieldErrors?.fullName?.[0]}
        disabled={isSubmitting}
        {...register('fullName')}
      />

      <Input
        id="avatarUrl"
        label="Avatar URL"
        type="url"
        placeholder="https://example.com/avatar.png"
        leadingIcon={<Link2 className="h-4 w-4" />}
        error={errors.avatarUrl?.message ?? fieldErrors?.avatarUrl?.[0]}
        disabled={isSubmitting}
        {...register('avatarUrl')}
      />

      {contact && (
        <ProfileContactFields
          phoneNumber={phoneNumber}
          address={address}
          verified={Boolean(contact.phone_number && contact.phone_verified_at
            && phoneNumber === formatSavedPhilippineMobileNumber(contact.phone_number))}
          fieldErrors={fieldErrors}
          saving={isSubmitting}
          onPhoneChange={setPhoneNumber}
          onAddressChange={setAddress}
        />
      )}

      {serverError && (
        <div
          className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          {serverError}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" className="min-h-11" loading={isSubmitting}>Save changes</Button>
        {contact && (Object.values(address).some(Boolean) || contact.street_address) && (
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={isSubmitting || !Object.values(address).some(Boolean)}
            onClick={() => setAddress(resolveCheckoutAddress())}
          >
            Clear saved address
          </Button>
        )}
      </div>
    </form>
  );
}