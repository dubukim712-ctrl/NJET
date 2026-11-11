'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { MapPinned, PhilippinePeso } from 'lucide-react';
import { saveDeliveryZoneAction } from '@/data/actions/commerce-admin';
import { useInvalidateAdminDeliveryZonesQuery } from '@/data/commerce/admin-delivery-zones-client';
import { useInvalidateCheckoutOptionsQuery } from '@/data/commerce/checkout-options-client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatPhp } from '@/lib/commerce';
import type { Database } from '@/types/database';

type Zone = Database['public']['Tables']['delivery_zones']['Row'];

export function DeliveryZoneEditor({
  zone,
  onCancel,
  onSaved,
}: {
  zone?: Zone;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const invalidateZones = useInvalidateAdminDeliveryZonesQuery();
  const invalidateCheckoutOptions = useInvalidateCheckoutOptionsQuery();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const fee = Number(formData.get('fee'));
    if (!Number.isFinite(fee)) {
      const message = 'Enter a valid delivery fee in PHP.';
      setError(message);
      toast.error(message);
      setBusy(false);
      return;
    }

    try {
      const result = await saveDeliveryZoneAction({
        id: zone?.id ?? null,
        name: formData.get('name'),
        feeMinor: Math.round(fee * 100),
        active: formData.get('active') === 'on',
      });
      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success(zone ? 'Delivery zone updated.' : 'Delivery zone added.');
      await Promise.all([invalidateZones(), invalidateCheckoutOptions()]);
      router.refresh();
      onSaved();
    } catch (saveError) {
      console.error('Could not save delivery zone.', saveError);
      const message = 'Could not save this delivery zone. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          name="name"
          label="Zone name"
          defaultValue={zone?.name}
          required
          leadingIcon={<MapPinned className="h-4 w-4" />}
        />
        <Input
          name="fee"
          label="Delivery fee (PHP)"
          type="number"
          min="0"
          step="0.01"
          defaultValue={zone ? (zone.fee_minor / 100).toFixed(2) : ''}
          required
          leadingIcon={<PhilippinePeso className="h-4 w-4" />}
        />
      </div>
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input
          type="checkbox"
          name="active"
          defaultChecked={zone?.active ?? true}
          className="size-4 accent-primary"
        />
        Available at checkout
      </label>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" loading={busy}>
          {zone ? 'Save zone' : 'Add zone'}
        </Button>
      </div>
    </form>
  );
}
