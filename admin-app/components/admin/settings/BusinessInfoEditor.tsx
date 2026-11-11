'use client';

import { useState, type FormEvent } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { saveBusinessSettingsAction } from '@/data/actions/business-settings';
import { useInvalidateAdminSystemSettingsQuery } from '@/data/commerce/admin-system-settings-client';
import { useInvalidateStorefrontBusinessInfoQuery } from '@/data/commerce/storefront-business-info-client';
import {
  cleanupSystemSettingsAsset,
  uploadSystemSettingsAsset,
} from '@/data/commerce/system-settings-client';
import type { AdminBusinessInfo } from '@/data/commerce/system-settings';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function BusinessInfoEditor({
  businessInfo,
}: {
  businessInfo: AdminBusinessInfo;
}) {
  const router = useRouter();
  const invalidateSettings = useInvalidateAdminSystemSettingsQuery();
  const invalidateStorefrontBusinessInfo = useInvalidateStorefrontBusinessInfoQuery();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const uploadedPaths: string[] = [];

    try {
      let logoPath = formData.get('removeLogo') === 'on'
        ? null
        : businessInfo.logoPath;
      const file = formData.get('logo');
      if (file instanceof File && file.size > 0) {
        const upload = await uploadSystemSettingsAsset(file, 'business-logo');
        if (upload.error || !upload.path) {
          throw new Error(upload.error ?? 'Could not upload the business logo.');
        }
        uploadedPaths.push(upload.path);
        logoPath = upload.path;
      }

      const result = await saveBusinessSettingsAction({
        businessName: formData.get('businessName'),
        phone: formData.get('phone'),
        email: formData.get('email'),
        address: formData.get('address'),
        businessHours: formData.get('businessHours'),
        logoPath,
      });
      if (!result.success) throw new Error(result.error);

      uploadedPaths.length = 0;
      const logoInput = form.elements.namedItem('logo');
      if (logoInput instanceof HTMLInputElement) logoInput.value = '';
      const removeLogoInput = form.elements.namedItem('removeLogo');
      if (removeLogoInput instanceof HTMLInputElement) removeLogoInput.checked = false;
      await Promise.all([
        invalidateSettings(),
        invalidateStorefrontBusinessInfo(),
      ]);
      toast.success('Business information saved.');
      if (result.data.warning) toast.warning(result.data.warning);
      router.refresh();
    } catch (saveError) {
      console.error('Could not save business information.', saveError);
      const cleanupResults = await Promise.all(
        uploadedPaths.map(cleanupSystemSettingsAsset)
      );
      const message = saveError instanceof Error
        ? saveError.message
        : 'Could not save business information.';
      const finalMessage = cleanupResults.some((removed) => !removed)
        ? `${message} An unused uploaded logo could not be removed.`
        : message;
      setError(finalMessage);
      toast.error(finalMessage);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="max-w-3xl space-y-5 rounded-xl border bg-card p-4 sm:p-6">
      <header>
        <h2 className="text-xl font-semibold">Business profile</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          These details appear in the storefront header and contact footer.
        </p>
      </header>
      <form className="space-y-4" onSubmit={submit}>
        <Input
          name="businessName"
          label="Business name"
          defaultValue={businessInfo.businessName}
          maxLength={120}
          required
          disabled={busy}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            name="phone"
            label="Phone"
            type="tel"
            defaultValue={businessInfo.phone}
            maxLength={40}
            disabled={busy}
          />
          <Input
            name="email"
            label="Email"
            type="email"
            defaultValue={businessInfo.email}
            maxLength={254}
            disabled={busy}
          />
        </div>
        <Input
          name="address"
          label="Business address"
          defaultValue={businessInfo.address}
          maxLength={300}
          disabled={busy}
        />
        <Input
          name="businessHours"
          label="Business hours"
          defaultValue={businessInfo.businessHours}
          maxLength={200}
          disabled={busy}
          helperText="For example: Monday-Saturday, 9 AM-6 PM."
        />
        <div className="space-y-3">
          {businessInfo.logoUrl && (
            <Image
              src={businessInfo.logoUrl}
              alt={`${businessInfo.businessName} logo`}
              width={320}
              height={160}
              unoptimized
              className="h-24 w-auto max-w-full rounded-md border object-contain p-2"
            />
          )}
          <Input
            name="logo"
            label="Business logo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            helperText="Optional. JPG, PNG, or WebP, up to 5 MB."
          />
          {businessInfo.logoPath && (
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="removeLogo"
                className="size-4 accent-primary"
                disabled={busy}
              />
              Remove current logo
            </label>
          )}
        </div>
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <Button type="submit" loading={busy} disabled={busy}>
          Save business information
        </Button>
      </form>
    </section>
  );
}
