'use client';

import type { FormEvent } from 'react';
import { LoaderCircle, Mail } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { OtpCodeInput } from '@/components/auth/OtpCodeInput';
import { SIGNUP_OTP_LENGTH } from '@/lib/validations/auth';

interface ChatRecoveryVerificationProps {
  email: string;
  code: string[];
  error: string | null;
  notice: string | null;
  busy: boolean;
  resendCooldownSeconds: number;
  onCodeChange: (code: string[]) => void;
  onChangeEmail: () => void;
  onVerify: (event: FormEvent<HTMLFormElement>) => void;
  onResend: () => void;
}

export function ChatRecoveryVerification({
  email,
  code,
  error,
  notice,
  busy,
  resendCooldownSeconds,
  onCodeChange,
  onChangeEmail,
  onVerify,
  onResend,
}: ChatRecoveryVerificationProps) {
  const minutes = Math.floor(resendCooldownSeconds / 60);
  const seconds = String(resendCooldownSeconds % 60).padStart(2, '0');
  const resendLabel = resendCooldownSeconds > 0 ? `Resend in ${minutes}:${seconds}` : 'Send another code';

  return (
    <section className="w-full rounded-2xl border bg-card p-5 shadow-sm sm:p-7">
      <div className="flex items-start gap-3">
        <div className="shrink-0 rounded-xl bg-primary/10 p-3 text-primary">
          <Mail className="size-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">Recover your conversation</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Verify your email with the 6-digit code sent to{' '}
            <strong className="wrap-anywhere text-foreground">{email}</strong>{' '}
            <Button
              type="button"
              variant="link"
              size={null}
              onClick={onChangeEmail}
              disabled={busy}
              aria-label="Change email address"
              className="underline"
            >
              Change
            </Button>
            . Codes expire after 10 minutes.
          </p>
        </div>
      </div>

      <form onSubmit={onVerify} className="mt-6 space-y-4">
        <OtpCodeInput value={code} onChange={onCodeChange} disabled={busy} />
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
        <Button
          size="lg"
          type="submit"
          disabled={busy || code.join('').length !== SIGNUP_OTP_LENGTH}
          className="w-full gap-2 shadow"
        >
          {busy && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
          Verify and continue
        </Button>
        <p className="flex flex-wrap items-center justify-center gap-x-2 text-center text-sm text-muted-foreground">
          <span>Didn&apos;t receive a code?</span>
          <Button
            variant="link"
            size={null}
            type="button"
            onClick={onResend}
            disabled={busy || resendCooldownSeconds > 0}
            className="min-h-11 underline"
          >
            {busy ? 'Sending code...' : resendLabel}
          </Button>
        </p>
      </form>
    </section>
  );
}
