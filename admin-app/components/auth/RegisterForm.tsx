'use client';

import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { AlertCircle, Loader2, Mail, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { registerSchema, type RegisterInput } from '@/lib/validations/auth';
import { registerAction } from '@/data/actions/auth';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { PasswordStrength } from '@/components/auth/PasswordStrength';
import { AuthOptions } from '@/components/auth/AuthOptions';

export function RegisterForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      fullName: '',
    },
  });

  const password = useWatch({ control, name: 'password' }) ?? '';

  const onSubmit = async (data: RegisterInput) => {
    setServerError(null);

    const formData = new FormData();
    formData.set('email', data.email);
    formData.set('password', data.password);
    formData.set('confirmPassword', data.confirmPassword);
    if (data.fullName) formData.set('fullName', data.fullName);

    const result = await registerAction(formData);

    if (result.success) {
      toast.success('Account created! Check your email to verify your address.');
      router.push('/login');
    } else {
      setServerError(result.error);
      toast.error(result.error);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Create an account
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your details to get started
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <Input
          id="fullName"
          label={<>Full name <span className="text-muted-foreground">(optional)</span></>}
          type="text"
          autoComplete="name"
          placeholder="Jane Doe"
          leadingIcon={<UserRound className="h-4 w-4" />}
          trailingIcon={
            errors.fullName ? <AlertCircle className="h-4 w-4 text-destructive" /> : undefined
          }
          error={errors.fullName?.message}
          disabled={isSubmitting}
          {...register('fullName')}
        />

        <Input
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          leadingIcon={<Mail className="h-4 w-4" />}
          trailingIcon={
            errors.email ? <AlertCircle className="h-4 w-4 text-destructive" /> : undefined
          }
          error={errors.email?.message}
          disabled={isSubmitting}
          {...register('email')}
        />

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            placeholder="Create a strong password"
            error={errors.password?.message}
            show={showPassword}
            onToggle={() => setShowPassword((value) => !value)}
            aria-describedby="password-requirements"
            disabled={isSubmitting}
            {...register('password')}
          />
          <div id="password-requirements">
            <PasswordStrength password={password} />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="confirmPassword" className="text-sm font-medium">
            Confirm password
          </label>
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            placeholder="Repeat your password"
            error={errors.confirmPassword?.message}
            show={showConfirmPassword}
            onToggle={() => setShowConfirmPassword((value) => !value)}
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
          className="flex h-10 w-full items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              Creating account...
            </>
          ) : (
            'Create account'
          )}
        </button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or</span>
        </div>
      </div>

      <AuthOptions disabled={isSubmitting} />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <a href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </a>
      </p>
    </div>
  );
}