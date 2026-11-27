'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { OtpCodeInput } from '@/components/auth/OtpCodeInput';
import { SIGNUP_OTP_LENGTH } from '@/lib/validations/auth';
import { verifyAuthenticator } from '@/data/actions/mfa';

export function AuthenticatorCodeForm({ factorId, onVerified, setBusy, submitLabel }: {
  factorId?: string;
  submitLabel?: string;
  onVerified: () => void;
  setBusy?: (busy: boolean) => void;
}) {
  const [code, setCode] = useState<string[]>([]);
  const token = code.join('');
  const [error, setError] = useState('');
  const [busy, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || token.length !== SIGNUP_OTP_LENGTH) return;
    setSubmitting(true);
    setBusy?.(true);
    setError('');
    try {
      const result = await verifyAuthenticator(token, factorId);
      if (result.success) onVerified();
      else setError(result.error);
    } catch {
      setError('Verification could not be completed. Please try again.');
    } finally {
      setSubmitting(false);
      setBusy?.(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <OtpCodeInput value={code} onChange={setCode} disabled={busy} error={error || undefined} />
      <Button type="submit" loading={busy} disabled={token.length !== SIGNUP_OTP_LENGTH}>
        {submitLabel ?? (factorId ? 'Verify & Enable' : 'Verify and sign in')}
      </Button>
    </form>
  );
}
