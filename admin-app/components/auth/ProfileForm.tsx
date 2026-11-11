'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Link2, Loader2, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { updateProfileSchema, type UpdateProfileInput } from '@/lib/validations/auth';
import { updateProfileAction } from '@/data/actions/profile';
import { useAuth } from '@/components/auth/AuthProvider';
import { Input } from '@/components/ui/Input';
import type { UserProfile } from '@/types/database';

export function ProfileForm({ profile }: { profile: UserProfile }) {
  const router = useRouter();
  const { refreshUser } = useAuth();
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

    const formData = new FormData();
    formData.set('fullName', data.fullName ?? '');
    formData.set('avatarUrl', data.avatarUrl ?? '');

    const result = await updateProfileAction(formData);

    if (result.success) {
      toast.success('Profile updated.');
      await refreshUser();
      router.refresh();
    } else {
      setServerError(result.error);
      toast.error(result.error);
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
        error={errors.fullName?.message}
        disabled={isSubmitting}
        {...register('fullName')}
      />

      <Input
        id="avatarUrl"
        label="Avatar URL"
        type="url"
        placeholder="https://example.com/avatar.png"
        leadingIcon={<Link2 className="h-4 w-4" />}
        error={errors.avatarUrl?.message}
        disabled={isSubmitting}
        {...register('avatarUrl')}
      />

      {serverError && (
        <div
          className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          {serverError}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            Saving...
          </>
        ) : (
          'Save changes'
        )}
      </button>
    </form>
  );
}