'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Loader2, Mail } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { OtpCodeInput } from '@/components/auth/OtpCodeInput';
import {
  clearRememberedVerificationEmail,
  getRememberedVerificationEmail,
  rememberVerificationEmail,
} from '@/data/auth/verification-email';
import {
  resendSignupOtpAction,
  verifySignupOtpAction,
} from '@/data/actions/email-verification';
import { SIGNUP_OTP_LENGTH } from '@/lib/validations/auth';

export function EmailVerificationForm() {
  const emailInput = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState<string[]>(Array(SIGNUP_OTP_LENGTH).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (emailInput.current) {
      emailInput.current.value = getRememberedVerificationEmail();
    }
  }, []);

  const handleVerify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNotice(null);

    const formData = new FormData(event.currentTarget);
    formData.set('token', code.join(''));
    setIsVerifying(true);

    try {
      const result = await verifySignupOtpAction(formData);
      if (!result.success) {
        setError(result.error);
        return;
      }

      clearRememberedVerificationEmail();
      window.location.assign(result.data.redirectTo);
    } catch {
      setError('Verification could not be completed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setNotice(null);
    const email = emailInput.current?.value.trim() ?? '';
    if (!email) {
      setError('Enter your email address to request a new code.');
      emailInput.current?.focus();
      return;
    }

    const formData = new FormData();
    formData.set('email', email);
    setIsResending(true);

    try {
      const result = await resendSignupOtpAction(formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setNotice(result.data.message);
    } catch {
      setError('Could not send a code right now. Please try again later.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Verify your email
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Enter the {SIGNUP_OTP_LENGTH}-digit code sent to your email address.
        </p>
      </div>

      <form onSubmit={handleVerify} className="space-y-5">
        <Input
          id="verification-email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          leadingIcon={<Mail className="h-4 w-4" />}
          defaultValue=""
          ref={emailInput}
          onChange={(event) => {
            rememberVerificationEmail(event.currentTarget.value);
          }}
          required
          disabled={isVerifying || isResending}
        />

        <OtpCodeInput
          value={code}
          onChange={setCode}
          disabled={isVerifying || isResending}
        />

        {error && (
          <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="rounded-md border border-primary/20 bg-primary/5 p-3 text-sm" role="status">
            {notice}
          </p>
        )}

        <button
          type="submit"
          disabled={
            isVerifying ||
            isResending ||
            code.join('').length !== SIGNUP_OTP_LENGTH
          }
          className="flex h-11 w-full items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
        >
          {isVerifying ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              Verifying...
            </>
          ) : (
            'Verify email'
          )}
        </button>
      </form>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
        <button
          type="button"
          disabled={isVerifying || isResending}
          onClick={() => {
            void handleResend();
          }}
          className="inline-flex min-h-10 items-center font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isResending ? 'Sending code...' : 'Resend code'}
        </button>
        <Link href="/login" className="inline-flex min-h-10 items-center text-muted-foreground hover:text-foreground">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
