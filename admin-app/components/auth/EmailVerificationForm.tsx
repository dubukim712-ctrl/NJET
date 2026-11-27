'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { OtpCodeInput } from '@/components/auth/OtpCodeInput';
import {
  clearRememberedVerificationEmail,
  getRememberedVerificationEmail,
  getVerificationCooldown,
  rememberVerificationEmail,
  startVerificationCooldown,
} from '@/data/auth/verification-email';
import {
  resendSignupOtpAction,
  verifySignupOtpAction,
} from '@/data/actions/email-verification';
import { resendSignupOtpSchema, SIGNUP_OTP_LENGTH } from '@/lib/validations/auth';

export function EmailVerificationForm() {
  const [email, setEmail] = useState('');
  const [draftEmail, setDraftEmail] = useState('');
  const [editing, setEditing] = useState(false);
  const [code, setCode] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<'verify' | 'send' | null>(null);
  const inFlight = useRef(false);
  const [expiresAt, setExpiresAt] = useState(0);
  const [clockNow, setClockNow] = useState(0);
  const resendCooldownSeconds = Math.max(0, Math.ceil((expiresAt - clockNow) / 1000));
  const enteringEmail = editing || !email;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const remembered = getRememberedVerificationEmail();
      setEmail(remembered);
      setDraftEmail(remembered);
      setExpiresAt(getVerificationCooldown(remembered));
      setClockNow(Date.now());
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!expiresAt || expiresAt <= Date.now()) return;
    const timer = window.setInterval(() => {
      const now = Date.now();
      setClockNow(now);
      if (now >= expiresAt) window.clearInterval(timer);
    }, 250);
    return () => window.clearInterval(timer);
  }, [expiresAt]);

  async function verify(token: string) {
    if (inFlight.current || !email || token.length !== SIGNUP_OTP_LENGTH) return;
    inFlight.current = true;
    setPending('verify');
    setError(null);
    setNotice(null);
    const formData = new FormData();
    formData.set('email', email);
    formData.set('token', token);

    try {
      const result = await verifySignupOtpAction(formData);
      if (result.success) {
        clearRememberedVerificationEmail();
        window.location.assign(result.data.redirectTo);
        return;
      }
      if (result.rateLimited) {
        setExpiresAt(startVerificationCooldown(email));
        setClockNow(Date.now());
      }
      setError(result.error);
      setCode([]);
    } catch {
      setError('Verification could not be completed. Please try again.');
      setCode([]);
    } finally {
      inFlight.current = false;
      setPending(null);
    }
  }

  function setDestination(address: string, cooldown: number) {
    rememberVerificationEmail(address);
    setEmail(address);
    setDraftEmail(address);
    setExpiresAt(cooldown);
    setClockNow(Date.now());
    setEditing(false);
    setCode([]);
  }

  async function send(address: string) {
    if (inFlight.current) return;
    setError(null);
    setNotice(null);
    const validation = resendSignupOtpSchema.safeParse({ email: address });
    if (!validation.success) {
      setError(validation.error.issues[0]?.message ?? 'Enter a valid email address.');
      return;
    }

    const destination = validation.data.email;
    const storedCooldown = getVerificationCooldown(destination);
    const cooldown = destination === email ? Math.max(storedCooldown, expiresAt) : storedCooldown;
    if (cooldown > Date.now()) {
      setDestination(destination, cooldown);
      return;
    }

    inFlight.current = true;
    setPending('send');
    const formData = new FormData();
    formData.set('email', destination);
    try {
      const result = await resendSignupOtpAction(formData);
      if (result.success || result.rateLimited) {
        setDestination(destination, startVerificationCooldown(destination));
      }
      if (result.success) setNotice(result.data.message);
      else setError(result.error);
    } catch {
      setError('Could not send a code right now. Please try again later.');
    } finally {
      inFlight.current = false;
      setPending(null);
    }
  }

  function changeEmail() {
    setDraftEmail(email);
    setEditing(true);
    setCode([]);
    setError(null);
    setNotice(null);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (enteringEmail) void send(draftEmail);
    else void verify(code.join(''));
  }

  return (
    <div className="w-full">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Verify your email</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Enter the {SIGNUP_OTP_LENGTH}-digit code sent to your email address.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-5" noValidate>
        {enteringEmail ? (
          <Input
            id="verification-email"
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={draftEmail}
            onChange={(event) => setDraftEmail(event.target.value)}
            disabled={Boolean(pending)}
          />
        ) : (
          <>
            <p className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
              Sent to <strong className="wrap-anywhere text-foreground">{email}</strong>{' · '}
              <Button type="button" variant="link" size={null} className="underline" onClick={changeEmail} disabled={Boolean(pending)}>
                Change
              </Button>
            </p>
            <OtpCodeInput
              value={code}
              onChange={(digits) => {
                setCode(digits);
                if (digits.join('').length === SIGNUP_OTP_LENGTH) void verify(digits.join(''));
              }}
              disabled={Boolean(pending)}
            />
          </>
        )}

        {error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive" role="alert">{error}</p>}
        {notice && <p className="rounded-md border border-primary/20 bg-primary/5 p-3 text-sm" role="status">{notice}</p>}

        <Button
          type="submit"
          size="lg"
          className="w-full gap-2 shadow"
          disabled={Boolean(pending) || (!enteringEmail && code.join('').length !== SIGNUP_OTP_LENGTH)}
        >
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {pending === 'verify' ? 'Verifying...' : enteringEmail
            ? pending === 'send' ? 'Sending code...' : 'Send verification code'
            : 'Verify email'}
        </Button>
      </form>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-x-3 text-sm">
        {enteringEmail ? (
          email && (
            <Button type="button" variant="link" size={null} className="min-h-10" disabled={Boolean(pending)} onClick={() => {
              setEditing(false);
              setError(null);
            }}>
              Cancel change
            </Button>
          )
        ) : (
          <Button type="button" variant="link" size={null} className="min-h-10" disabled={Boolean(pending) || resendCooldownSeconds > 0} onClick={() => void send(email)}>
            {pending === 'send' ? 'Sending code...' : resendCooldownSeconds > 0
              ? `Resend code in ${Math.floor(resendCooldownSeconds / 60)}:${String(resendCooldownSeconds % 60).padStart(2, '0')}`
              : 'Resend code'}
          </Button>
        )}
        <Link href="/login" className="ml-auto inline-flex min-h-10 items-center text-muted-foreground hover:text-foreground">
          Back to sign in
        </Link>
      </div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        Can&apos;t find it? Check your spam folder. Codes expire after 10 minutes.
      </p>
    </div>
  );
}
