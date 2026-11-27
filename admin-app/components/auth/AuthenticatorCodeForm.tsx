'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { verifyAuthenticator } from '@/data/actions/mfa';

export function AuthenticatorCodeForm({ factorId, onVerified, setBusy }: {
  factorId?: string;
  onVerified: () => void;
  setBusy?: (busy: boolean) => void;
}) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setSubmitting(true);
    setBusy?.(true);
    setError('');
    try {
      const result = await verifyAuthenticator(code, factorId);
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
      <Input
        label="Six-digit code"
        inputMode="numeric"
        autoComplete="one-time-code"
        className="text-base"
        maxLength={6}
        pattern="[0-9]{6}"
        value={code}
        onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
        disabled={busy}
        required
        error={error || undefined}
      />
      <Button type="submit" loading={busy} disabled={code.length !== 6}>
        {factorId ? 'Verify & Enable' : 'Verify and sign in'}
      </Button>
    </form>
  );
}
