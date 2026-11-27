'use client';

import { useState } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { AuthenticatorCodeForm } from '@/components/auth/AuthenticatorCodeForm';
import { enrollAuthenticator, removeAuthenticator } from '@/data/actions/mfa';

type Enrollment = { id: string; secret: string; qrCode: string };

export function AuthenticatorSettings({ initialFactors }: { initialFactors: string[] }) {
  const [factors, setFactors] = useState(initialFactors);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [disableId, setDisableId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    try {
      const result = await enrollAuthenticator();
      if (result.success) setEnrollment(result.data);
      else toast.error(result.error);
    } catch {
      toast.error('Could not start setup. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(factorId: string, verified: boolean) {
    if (busy) return;
    setBusy(true);
    try {
      const result = await removeAuthenticator(factorId, verified);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      if (verified) {
        setFactors((current) => current.filter((id) => id !== factorId));
        setDisableId(null);
        toast.success('Authenticator app disabled.');
      } else {
        setEnrollment(null);
      }
    } catch {
      toast.error('Could not remove the authenticator app. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function copyKey(secret: string) {
    try {
      await navigator.clipboard.writeText(secret);
      toast.success('Setup key copied.');
    } catch {
      toast.error('Select and copy the setup key manually.');
    }
  }

  return (
    <section className="rounded-xl border bg-card p-5 sm:p-6" aria-labelledby="authenticator-heading">
      <h2 id="authenticator-heading" className="text-lg font-semibold">Two-Factor Authentication</h2>
      <p className="mb-4 mt-1 text-sm text-muted-foreground">
        Help protect your account from unauthorized access with two-factor authentication.
      </p>

      <span className={factors.length
        ? 'inline-flex rounded-full bg-success/15 px-3 py-1 text-xs font-medium text-foreground'
        : 'inline-flex rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground'}>
        {factors.length ? 'Enabled' : 'Not enabled'}
      </span>
      {factors.length ? factors.map((id, index) => (
        <div key={id} className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm">Authenticator App{factors.length > 1 ? ' ' + (index + 1) : ''}</span>
          <Button type="button" variant="outline" onClick={() => setDisableId(id)}>Disable 2FA</Button>
        </div>
      )) : (
        <div className="mt-4">
          <Button type="button" onClick={start} loading={busy && !enrollment} disabled={Boolean(enrollment)}>Enable 2FA</Button>
        </div>
      )}

      <Modal
        open={Boolean(enrollment)}
        title="Set up two-factor authentication"
        onClose={() => { if (enrollment) void remove(enrollment.id, false); }}
      >
        {enrollment && (
          <div className="space-y-4">
            <p className="text-sm">1. Scan the QR code with Google Authenticator, Authy, or your preferred authenticator app.</p>
            <Image src={enrollment.qrCode} alt="Authenticator setup QR code" width={180} height={180} unoptimized className="mx-auto rounded bg-white p-2" />
            <div className="space-y-2">
              <p className="text-sm font-medium">Manual setup key</p>
              <code className="block select-all break-all rounded bg-muted p-2 text-sm">{enrollment.secret}</code>
              <Button type="button" variant="outline" size="sm" onClick={() => copyKey(enrollment.secret)}>Copy setup key</Button>
            </div>
            <p className="text-sm">2. Enter the code shown in your authenticator app.</p>
            <AuthenticatorCodeForm
              factorId={enrollment.id}
              setBusy={setBusy}
              onVerified={() => {
                setFactors([enrollment.id]);
                setEnrollment(null);
                toast.success('Two-factor authentication is enabled.');
              }}
            />
            <Button type="button" variant="ghost" disabled={busy} onClick={() => remove(enrollment.id, false)}>Cancel setup</Button>
          </div>
        )}
      </Modal>
      <ConfirmDialog
        open={Boolean(disableId)}
        onOpenChange={(open) => { if (!open) setDisableId(null); }}
        title="Disable two-factor authentication?"
        description="This removes this authenticator app from your account."
        confirmLabel="Disable 2FA"
        destructive
        loading={busy && Boolean(disableId)}
        onConfirm={() => { if (disableId) void remove(disableId, true); }}
      />
    </section>
  );
}
