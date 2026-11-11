'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  changePasswordSchema,
  type ChangePasswordInput,
} from '@/lib/validations/auth';
import { changePasswordAction } from '@/data/actions/profile';
import { PasswordInput } from '@/components/auth/PasswordInput';

export function ChangePasswordForm() {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: ChangePasswordInput) => {
    setServerError(null);

    const formData = new FormData();
    formData.set('currentPassword', data.currentPassword);
    formData.set('newPassword', data.newPassword);
    formData.set('confirmPassword', data.confirmPassword);

    const result = await changePasswordAction(formData);

    if (result.success) {
      toast.success('Password updated successfully.');
      reset();
    } else {
      setServerError(result.error);
      toast.error(result.error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-2">
        <label htmlFor="currentPassword" className="text-sm font-medium">
          Current password
        </label>
        <PasswordInput
          id="currentPassword"
          autoComplete="current-password"
          error={errors.currentPassword?.message}
          show={showCurrent}
          onToggle={() => setShowCurrent((value) => !value)}
          disabled={isSubmitting}
          {...register('currentPassword')}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="newPassword" className="text-sm font-medium">
          New password
        </label>
        <PasswordInput
          id="newPassword"
          autoComplete="new-password"
          error={errors.newPassword?.message}
          show={showNew}
          onToggle={() => setShowNew((value) => !value)}
          disabled={isSubmitting}
          {...register('newPassword')}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="confirmPassword" className="text-sm font-medium">
          Confirm new password
        </label>
        <PasswordInput
          id="confirmPassword"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          show={showConfirm}
          onToggle={() => setShowConfirm((value) => !value)}
          disabled={isSubmitting}
          {...register('confirmPassword')}
        />
      </div>

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
            Updating...
          </>
        ) : (
          'Update password'
        )}
      </button>
    </form>
  );
}