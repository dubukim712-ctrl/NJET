'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { savePhoneVerificationSettingsAction } from '@/data/actions/system-settings';
import { useInvalidateAdminSystemSettingsQuery } from '@/data/commerce/admin-system-settings-client';
import { useInvalidateCheckoutOptionsQuery } from '@/data/commerce/checkout-options-client';
import { Button } from '@/components/ui/Button';

export function CheckoutPhoneVerificationSettings({
  required: initialRequired,
}: {
  required: boolean;
}) {
  const router = useRouter();
  const invalidateSettings = useInvalidateAdminSystemSettingsQuery();
  const invalidateCheckoutOptions = useInvalidateCheckoutOptionsQuery();
  const [required, setRequired] = useState(initialRequired);
  const [savedRequired, setSavedRequired] = useState(initialRequired);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || required === savedRequired) return;
    setBusy(true);
    setError(null);
    try {
      const result = await savePhoneVerificationSettingsAction({
        phoneVerificationRequired: required,
      });
      if (!result.success) throw new Error(result.error);
      await Promise.all([invalidateSettings(), invalidateCheckoutOptions()]);
      setSavedRequired(required);
      toast.success('Checkout phone verification setting saved.');
      router.refresh();
    } catch (saveError) {
      console.error('Could not save checkout phone verification settings.', saveError);
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Could not save the checkout verification setting.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="max-w-3xl space-y-5 rounded-xl border bg-card p-5 sm:p-6">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">Phone verification</h2>
        <p className="text-sm leading-5 text-muted-foreground">
          Decide whether customers must verify their mobile number by SMS before placing an order.
        </p>
      </header>
      <form className="space-y-4" onSubmit={save}>
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={required}
            onChange={(event) => setRequired(event.target.checked)}
            disabled={busy}
            className="mt-1 size-4 accent-primary"
          />
          <span>
            <span className="block text-sm font-medium">Require phone verification at checkout</span>
            <span className="mt-1 block text-sm leading-5 text-muted-foreground">
              When enabled, customers receive a one-time code and must verify the number before ordering.
            </span>
          </span>
        </label>
        {!required && (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm leading-5">
            Customers can still place orders without an SMS code. Those orders are marked for staff to
            manually verify before confirmation.
          </p>
        )}
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <Button type="submit" loading={busy} disabled={required === savedRequired}>
          Save checkout setting
        </Button>
      </form>
    </section>
  );
}
