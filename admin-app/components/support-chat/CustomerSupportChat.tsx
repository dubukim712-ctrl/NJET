'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, LifeBuoy, LoaderCircle, Mail, MessageCircle, Phone } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PhilippineMobileInput } from '@/components/ui/PhilippineMobileInput';
import Link from 'next/link';
import {
  requestGuestChatEmailAccessAction,
  verifyGuestChatEmailAccessAction,
} from '@/data/actions/support-chat-recovery';
import { startGuestChatAction } from '@/data/actions/support-chat';
import { ChatConversation } from '@/components/support-chat/ChatConversation';
import { ChatRecoveryVerification } from '@/components/support-chat/ChatRecoveryVerification';
import type { PendingGuestChatRecovery } from '@/data/support-chat/guest-session';

const RESEND_COOLDOWN_SECONDS = 60;

interface CustomerSupportChatProps {
  mode: 'account' | 'guest';
  userId: string | null;
  initialThreadId: string | null;
  initialRealtimeKey: string | null;
  initialRecovery?: PendingGuestChatRecovery | null;
  initialError?: string | null;
}

export function CustomerSupportChat({
  mode,
  userId,
  initialThreadId,
  initialRealtimeKey,
  initialRecovery = null,
  initialError = null,
}: CustomerSupportChatProps) {
  const [threadId, setThreadId] = useState(initialThreadId);
  const [realtimeKey, setRealtimeKey] = useState(initialRealtimeKey);
  const [contactMethod, setContactMethod] = useState<'email' | 'phone'>('email');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState(initialRecovery?.email ?? '');
  const [recoveryName, setRecoveryName] = useState(initialRecovery?.name ?? '');
  const [code, setCode] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(initialRecovery ? 'If a code can be sent, it will arrive shortly.' : null);
  const [error, setError] = useState(initialError);
  const [busy, setBusy] = useState(false);
  const [resendAvailableAt, setResendAvailableAt] = useState<number | null>(
    initialRecovery ? initialRecovery.requestedAt + RESEND_COOLDOWN_SECONDS * 1000 : null,
  );
  const [clockNow, setClockNow] = useState(initialRecovery?.requestedAt ?? 0);
  const resendCooldownSeconds = resendAvailableAt === null
    ? 0
    : Math.max(0, Math.ceil((resendAvailableAt - clockNow) / 1000));
  const startResendCooldown = (requestedAt: number) => { setClockNow(requestedAt); setResendAvailableAt(requestedAt + RESEND_COOLDOWN_SECONDS * 1000); };

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
        startResendCooldown(result.data.requestedAt);
      }
      setBusy(false);
      return;
    }

    const result = await startGuestChatAction({ name, phone: contact });
    if (!result.success) { setError(result.error); setBusy(false); return; }

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
      startResendCooldown(result.data.requestedAt);
    } else {
      setError(result.error);
    }
    setBusy(false);
  };

  const editRecoveryEmail = () => {
    setContactMethod('email');
    setContact(recoveryEmail);
    setName(recoveryName);
    setRecoveryEmail('');
    setCode([]);
    setError(null);
    setNotice(null);
    setResendAvailableAt(null);
  };

  const verifyRecovery = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await verifyGuestChatEmailAccessAction({
      email: recoveryEmail,
      code: code.join(''),
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
    <div className={`mx-auto w-full ${!threadId && mode === 'guest' && recoveryEmail ? 'max-w-lg' : 'max-w-5xl'}`}>
      <Link
        href="/"
        className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to NJET
      </Link>

      <header className="mb-6 mt-5 border-l-4 border-primary pl-4 sm:mb-8 sm:mt-7 sm:pl-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground">NJET customer care</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Let’s talk.</h1>
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
        <ChatRecoveryVerification
          email={recoveryEmail}
          code={code}
          error={error}
          notice={notice}
          busy={busy}
          resendCooldownSeconds={resendCooldownSeconds}
          onCodeChange={setCode}
          onChangeEmail={editRecoveryEmail}
          onVerify={verifyRecovery}
          onResend={requestRecovery}
        />
      ) : (
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <form onSubmit={startChat} className="rounded-2xl border bg-card p-5 shadow-sm sm:p-7">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-accent p-3 text-accent-foreground">
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
              <Input label="Your name"
                id="chat-name"
                required
                maxLength={120}
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="rounded-lg! bg-background!"
              />
              <fieldset>
                <legend className="mb-2 text-sm font-medium">How can we reach you?</legend>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant={null} size={null}
                    type="button"
                    onClick={() => { setContactMethod('email'); setContact(''); }}
                    aria-pressed={contactMethod === 'email'}
                    className={`min-h-10 gap-2 rounded-lg border ${contactMethod === 'email' ? 'border-accent-foreground bg-accent text-accent-foreground' : 'text-muted-foreground'}`}
                  >
                    <Mail className="size-4" aria-hidden="true" /> Email
                  </Button>
                  <Button variant={null} size={null}
                    type="button"
                    onClick={() => { setContactMethod('phone'); setContact(''); }}
                    aria-pressed={contactMethod === 'phone'}
                    className={`min-h-10 gap-2 rounded-lg border ${contactMethod === 'phone' ? 'border-accent-foreground bg-accent text-accent-foreground' : 'text-muted-foreground'}`}
                  >
                    <Phone className="size-4" aria-hidden="true" /> Phone
                  </Button>
                </div>
              </fieldset>
              {contactMethod === 'email' ? (
                <Input
                  label="Email address"
                  helperText="Email chats start after verification and can be reopened on another device."
                  id="chat-contact"
                  type="email"
                  autoComplete="email"
                  value={contact}
                  onChange={(event) => setContact(event.target.value)}
                  placeholder="you@example.com"
                  className="rounded-lg! bg-background!"
                  required
                />
              ) : (
                <PhilippineMobileInput
                  label="Phone number"
                  helperText="Phone chats stay on this browser."
                  id="chat-contact"
                  value={contact}
                  onValueChange={setContact}
                  className="rounded-lg! bg-background!"
                  required
                />
              )}
            </div>

            {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
            {notice && <p role="status" className="mt-4 text-sm text-muted-foreground">{notice}</p>}
            <Button size={null}
              type="submit"
              disabled={busy}
              className="mt-6 min-h-11 w-full gap-2 rounded-lg px-4 text-base disabled:opacity-60 sm:w-auto"
            >
              {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <MessageCircle className="size-4" aria-hidden="true" />}
              Start chat
            </Button>
          </form>

          <aside className="flex gap-3 rounded-2xl bg-[#264653] p-5 text-[#f4ede4] lg:block lg:self-start lg:p-6">
            <LifeBuoy className="mt-0.5 size-5 shrink-0 text-white" aria-hidden="true" />
            <div>
              <h2 className="font-semibold">Here to help</h2>
              <p className="mt-2 text-sm leading-6 text-[#f4ede4]">
                Our staff can see your messages and reply in this conversation. Your contact details are only used to support your chat.
              </p>
            </div>
          </aside>
        </section>
      )}
    </div>
  );
}
