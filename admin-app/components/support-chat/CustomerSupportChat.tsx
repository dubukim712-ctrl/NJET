'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, LifeBuoy, LoaderCircle, Mail, MessageCircle, Phone } from 'lucide-react';
import Link from 'next/link';
import {
  requestGuestChatEmailAccessAction,
  verifyGuestChatEmailAccessAction,
} from '@/data/actions/support-chat-recovery';
import { startGuestChatAction } from '@/data/actions/support-chat';
import { ChatConversation } from '@/components/support-chat/ChatConversation';

const RESEND_COOLDOWN_SECONDS = 60;

interface CustomerSupportChatProps {
  mode: 'account' | 'guest';
  userId: string | null;
  initialThreadId: string | null;
  initialRealtimeKey: string | null;
  initialError?: string | null;
}

export function CustomerSupportChat({
  mode,
  userId,
  initialThreadId,
  initialRealtimeKey,
  initialError = null,
}: CustomerSupportChatProps) {
  const [threadId, setThreadId] = useState(initialThreadId);
  const [realtimeKey, setRealtimeKey] = useState(initialRealtimeKey);
  const [contactMethod, setContactMethod] = useState<'email' | 'phone'>('email');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryName, setRecoveryName] = useState('');
  const [code, setCode] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState(initialError);
  const [busy, setBusy] = useState(false);
  const [resendAvailableAt, setResendAvailableAt] = useState<number | null>(null);
  const [clockNow, setClockNow] = useState(0);
  const resendCooldownSeconds =
    resendAvailableAt === null
      ? 0
      : Math.max(0, Math.ceil((resendAvailableAt - clockNow) / 1000));

  useEffect(() => {
    if (resendAvailableAt === null) return;

    const interval = window.setInterval(() => {
      const now = Date.now();
      setClockNow(now);
      if (now >= resendAvailableAt) window.clearInterval(interval);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [resendAvailableAt]);

  const startChat = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);

    if (contactMethod === 'email') {
      const result = await requestGuestChatEmailAccessAction({
        name,
        email: contact,
      });
      if (!result.success) {
        setError(result.error);
      } else {
        setRecoveryEmail(contact.trim().toLowerCase());
        setRecoveryName(name.trim());
        setNotice(result.data.message);
      }
      setBusy(false);
      return;
    }

    const result = await startGuestChatAction({ name, phone: contact });
    if (!result.success) {
      setError(result.error);
      setBusy(false);
      return;
    }

    setThreadId(result.data.threadId);
    setRealtimeKey(result.data.realtimeKey);
    setBusy(false);
  };

  const requestRecovery = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    const result = await requestGuestChatEmailAccessAction({
      name: recoveryName,
      email: recoveryEmail,
    });
    if (result.success) {
      setNotice(result.data.message);
      const now = Date.now();
      setClockNow(now);
      setResendAvailableAt(now + RESEND_COOLDOWN_SECONDS * 1000);
    } else {
      setError(result.error);
    }
    setBusy(false);
  };

  const verifyRecovery = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await verifyGuestChatEmailAccessAction({
      email: recoveryEmail,
      code,
    });
    if (!result.success) {
      setError(result.error);
    } else {
      setThreadId(result.data.threadId);
      setRealtimeKey(result.data.realtimeKey);
      setNotice(null);
    }
    setBusy(false);
  };

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/"
        className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to NJET
      </Link>

      <header className="mb-6 mt-5 border-l-4 border-primary pl-4 sm:mb-8 sm:mt-7 sm:pl-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          NJET customer care
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Let’s talk.
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
          Message our team about a product, order, or service. Your conversation stays here so you can return to it later.
        </p>
      </header>

      {threadId ? (
        <ChatConversation
          key={threadId}
          threadId={threadId}
          mode="customer"
          userId={userId}
          realtimeKey={realtimeKey ?? undefined}
        />
      ) : mode === 'account' ? (
        <section className="rounded-2xl border p-6 text-sm text-muted-foreground">
          {error ?? 'Your account chat could not be opened.'}
        </section>
      ) : recoveryEmail ? (
        <section className="max-w-xl rounded-2xl border bg-card p-5 shadow-sm sm:p-7">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-3 text-primary">
              <Mail className="size-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Recover your conversation</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Verify your email with the 6-digit code sent to {recoveryEmail}. Codes expire after 10 minutes.
              </p>
            </div>
          </div>
          <form onSubmit={verifyRecovery} className="mt-6 space-y-4">
            <label className="block text-sm font-medium" htmlFor="recovery-code">
              Recovery code
            </label>
            <input
              id="recovery-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              className="min-h-12 w-full rounded-lg border bg-background px-3 text-lg tracking-[0.3em] outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={busy || code.length !== 6}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {busy && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
                Verify and continue
              </button>
              <button
                type="button"
                onClick={() => void requestRecovery()}
                disabled={busy || resendCooldownSeconds > 0}
                className="min-h-11 rounded-lg px-3 text-sm font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground disabled:opacity-60"
              >
                {busy
                  ? 'Sending code...'
                  : resendCooldownSeconds > 0
                    ? `Resend in ${Math.floor(resendCooldownSeconds / 60)}:${String(
                        resendCooldownSeconds % 60,
                      ).padStart(2, '0')}`
                    : 'Send another code'}
              </button>
            </div>
          </form>
        </section>
      ) : (
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <form onSubmit={startChat} className="rounded-2xl border bg-card p-5 shadow-sm sm:p-7">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-primary/10 p-3 text-primary">
                <MessageCircle className="size-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Start a conversation</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  We’ll use your contact details to help you continue the chat.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label htmlFor="chat-name" className="mb-1.5 block text-sm font-medium">Your name</label>
                <input
                  id="chat-name"
                  required
                  maxLength={120}
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="min-h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <fieldset>
                <legend className="mb-2 text-sm font-medium">How can we reach you?</legend>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setContactMethod('email'); setContact(''); }}
                    aria-pressed={contactMethod === 'email'}
                    className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border text-sm font-medium ${contactMethod === 'email' ? 'border-primary bg-primary/5 text-primary' : 'text-muted-foreground'}`}
                  >
                    <Mail className="size-4" aria-hidden="true" /> Email
                  </button>
                  <button
                    type="button"
                    onClick={() => { setContactMethod('phone'); setContact(''); }}
                    aria-pressed={contactMethod === 'phone'}
                    className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border text-sm font-medium ${contactMethod === 'phone' ? 'border-primary bg-primary/5 text-primary' : 'text-muted-foreground'}`}
                  >
                    <Phone className="size-4" aria-hidden="true" /> Phone
                  </button>
                </div>
              </fieldset>

              <div>
                <label htmlFor="chat-contact" className="mb-1.5 block text-sm font-medium">
                  {contactMethod === 'email' ? 'Email address' : 'Phone number'}
                </label>
                <input
                  id="chat-contact"
                  required
                  type={contactMethod === 'email' ? 'email' : 'tel'}
                  autoComplete={contactMethod === 'email' ? 'email' : 'tel'}
                  value={contact}
                  onChange={(event) => setContact(event.target.value)}
                  placeholder={contactMethod === 'email' ? 'you@example.com' : '+63 9xx xxx xxxx'}
                  className="min-h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                  Email chats start after verification and can be reopened on another device. Phone chats stay on this browser.
                </p>
              </div>
            </div>

            {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
            {notice && <p role="status" className="mt-4 text-sm text-muted-foreground">{notice}</p>}
            <button
              type="submit"
              disabled={busy}
              className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 sm:w-auto"
            >
              {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <MessageCircle className="size-4" aria-hidden="true" />}
              Start chat
            </button>
          </form>

          <aside className="flex gap-3 rounded-2xl bg-primary p-5 text-primary-foreground lg:block lg:self-start lg:p-6">
            <LifeBuoy className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <div>
              <h2 className="font-semibold">Here to help</h2>
              <p className="mt-2 text-sm leading-6 text-primary-foreground/85">
                Our staff can see your messages and reply in this conversation. Your contact details are only used to support your chat.
              </p>
            </div>
          </aside>
        </section>
      )}
    </div>
  );
}
