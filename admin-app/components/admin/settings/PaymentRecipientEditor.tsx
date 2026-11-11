'use client';

import { useState, type FormEvent } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  deletePaymentRecipientAction,
  savePaymentRecipientAction,
} from '@/data/actions/system-settings';
import {
  cleanupSystemSettingsAsset,
  uploadSystemSettingsAsset,
} from '@/data/commerce/system-settings-client';
import { getPaymentProviderLabel } from '@/data/commerce/payment-recipients';
import type { AdminPaymentRecipient } from '@/data/commerce/system-settings';
import type { PaymentProvider } from '@/types/commerce-tables';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function PaymentRecipientEditor({
  provider,
  recipients,
}: {
  provider: PaymentProvider;
  recipients: AdminPaymentRecipient[];
}) {
  const [adding, setAdding] = useState(false);

  return (
    <section className="min-w-0 space-y-4 rounded-xl border bg-card p-4 sm:p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{getPaymentProviderLabel(provider)}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {recipients.length
              ? `${recipients.length} account${recipients.length === 1 ? '' : 's'} configured`
              : 'No accounts configured.'}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => setAdding(true)}
          disabled={adding}
        >
          Add account
        </Button>
      </header>

      <div className="space-y-3">
        {recipients.map((recipient) => (
          <PaymentRecipientForm
            key={recipient.id}
            provider={provider}
            recipient={recipient}
          />
        ))}
        {adding && (
          <PaymentRecipientForm
            provider={provider}
            recipient={null}
            onSaved={() => setAdding(false)}
            onCancel={() => setAdding(false)}
          />
        )}
      </div>
    </section>
  );
}

function PaymentRecipientForm({
  provider,
  recipient,
  onSaved,
  onCancel,
}: {
  provider: PaymentProvider;
  recipient: AdminPaymentRecipient | null;
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const uploadedPaths: string[] = [];

    try {
      let paymentQrPath = recipient?.paymentQrPath ?? null;
      const file = formData.get('paymentQr');
      if (file instanceof File && file.size > 0) {
        const upload = await uploadSystemSettingsAsset(file, 'payment-qr', provider);
        if (upload.error || !upload.path) {
          throw new Error(upload.error ?? 'Could not upload this QR image.');
        }
        uploadedPaths.push(upload.path);
        paymentQrPath = upload.path;
      }
      if (!paymentQrPath) throw new Error('Upload a payment QR image.');

      const result = await savePaymentRecipientAction({
        id: recipient?.id ?? null,
        provider,
        recipientName: formData.get('recipientName'),
        accountDetails: formData.get('accountDetails'),
        paymentQrPath,
        active: formData.get('active') === 'on',
      });
      if (!result.success) throw new Error(result.error);

      uploadedPaths.length = 0;
      toast.success(`${getPaymentProviderLabel(provider)} account saved.`);
      if (result.data.warning) toast.warning(result.data.warning);
      onSaved?.();
      router.refresh();
    } catch (submitError) {
      console.error('Could not save a payment recipient.', submitError);
      const cleanupResults = await Promise.all(
        uploadedPaths.map(cleanupSystemSettingsAsset)
      );
      const cleanupFailed = cleanupResults.some((cleaned) => !cleaned);
      const message = submitError instanceof Error
        ? submitError.message
        : 'Could not save payment recipient details.';
      const finalMessage = cleanupFailed
        ? `${message} An unused uploaded QR image could not be removed.`
        : message;
      setError(finalMessage);
      toast.error(finalMessage);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!recipient || busy || !window.confirm('Remove this payment account?')) return;
    setBusy(true);
    setError(null);
    try {
      const result = await deletePaymentRecipientAction(recipient.id);
      if (!result.success) throw new Error(result.error);
      toast.success(`${getPaymentProviderLabel(provider)} account removed.`);
      if (result.data.warning) toast.warning(result.data.warning);
      router.refresh();
    } catch (removeError) {
      const message = removeError instanceof Error
        ? removeError.message
        : 'Could not remove this payment account.';
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="space-y-4 rounded-lg border p-4"
      onSubmit={submit}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="font-medium">
            {recipient?.recipientName || `New ${getPaymentProviderLabel(provider)} account`}
          </h4>
          <p className="mt-1 text-sm text-muted-foreground">
            {recipient?.active ? 'Available at checkout.' : recipient ? 'Hidden from checkout.' : 'Add another account as a fallback.'}
          </p>
        </div>
        <label className="flex min-h-11 shrink-0 items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="active"
            defaultChecked={recipient?.active ?? true}
            className="size-4 accent-primary"
            disabled={busy}
          />
          Active
        </label>
      </div>

      <Input
        name="recipientName"
        label="Account name"
        defaultValue={recipient?.recipientName ?? ''}
        maxLength={120}
        required
        disabled={busy}
      />
      <Input
        name="accountDetails"
        label="Account or bank details"
        defaultValue={recipient?.accountDetails ?? ''}
        maxLength={500}
        required
        disabled={busy}
        helperText="Shown to customers with this QR code."
      />
      {recipient && (
        <Image
          src={recipient.paymentQrUrl}
          alt={`${recipient.recipientName} payment QR code`}
          width={320}
          height={320}
          unoptimized
          className="h-40 w-full rounded-md border bg-white object-contain"
        />
      )}
      <Input
        name="paymentQr"
        label="Payment QR image"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        required={!recipient}
        disabled={busy}
        helperText="JPG, PNG, or WebP, up to 5 MB."
      />
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={busy} disabled={busy}>
          Save account
        </Button>
        {recipient && (
          <Button
            type="button"
            variant="destructive"
            onClick={remove}
            disabled={busy}
          >
            Remove
          </Button>
        )}
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
