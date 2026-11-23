'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { saveSalesReceiptTemplateAction } from '@/data/actions/sales-receipt-template';
import { useInvalidateAdminSystemSettingsQuery } from '@/data/commerce/admin-system-settings-client';
import {
  SALES_RECEIPT_TEMPLATE_FIELDS,
  SALES_RECEIPT_TEMPLATE_IMAGE_FIELDS,
} from '@/data/commerce/sales-receipt-template-config';
import {
  cleanupSystemSettingsAsset,
  uploadSystemSettingsAsset,
} from '@/data/commerce/system-settings-client';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export function SalesReceiptTemplateSettings({
  template,
}: {
  template: {
    templateVersion: string;
    updatedAt: string;
    previewUrl: string | null;
  } | null;
}) {
  const router = useRouter();
  const invalidateSettings = useInvalidateAdminSystemSettingsQuery();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const duplicateFieldAliases = new Set([
    'purchase_date',
    'owner_name',
    'invoice_number',
    'payment_mode',
  ]);
  const fieldNames = Object.values(SALES_RECEIPT_TEMPLATE_FIELDS)
    .filter((name) => !duplicateFieldAliases.has(name))
    .join(', ');
  const imageFieldNames = Object.values(
    SALES_RECEIPT_TEMPLATE_IMAGE_FIELDS
  ).join(', ');
  const previewUrl = template?.previewUrl ?? '/sales-receipt-sample.pdf';

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    let uploadedPath: string | null = null;
    try {
      const file = new FormData(event.currentTarget).get('template');
      if (!(file instanceof File) || file.size < 1) {
        setError('Choose an AcroForm PDF sales receipt template to upload.');
        return;
      }

      const upload = await uploadSystemSettingsAsset(file, 'receipt-template');
      if (upload.error || !upload.path) {
        setError(upload.error ?? 'Could not upload this template.');
        return;
      }
      uploadedPath = upload.path;

      const result = await saveSalesReceiptTemplateAction(upload.path);
      if (!result.success) {
        const cleaned = await cleanupSystemSettingsAsset(upload.path);
        uploadedPath = null;
        const message = cleaned
          ? result.error
          : `${result.error} The unused uploaded template could not be removed.`;
        setError(message);
        toast.error(message);
        return;
      }

      uploadedPath = null;
      await invalidateSettings();
      toast.success(`Sales receipt template saved (${result.data.version}).`);
      if (result.data.warning) toast.warning(result.data.warning);
      router.refresh();
    } catch (submitError) {
      console.error('Could not upload the sales receipt template.', submitError);
      if (uploadedPath) {
        const cleaned = await cleanupSystemSettingsAsset(uploadedPath);
        if (!cleaned) {
          setError('Template upload failed, and its unused file could not be removed.');
          return;
        }
      }
      setError('Could not save the sales receipt template. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-4 rounded-xl border bg-card p-5 sm:p-6">
      <div>
        <h2 className="text-lg font-semibold">Sales receipt template</h2>
        {template ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Active version: {template.templateVersion}. Updated{' '}
            {new Date(template.updatedAt).toLocaleString()}.
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            No receipt template is active. Upload one before generating completed-order receipts.
          </p>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        Text fields are optional. Add only the fields you want filled from this list:{' '}
        <span className="break-words font-medium text-foreground">
          {fieldNames}
        </span>
        . The items and payments fields must be multiline if included.
      </p>
      <p className="text-sm text-muted-foreground">
        Optional image areas: {imageFieldNames}. Use a text field or LibreOffice
        push-button image control with the exact field name. The variant image
        uses the first e-bike item, or the first order item if there is no e-bike.
      </p>
      <section className="space-y-3" aria-label="Sales receipt PDF preview">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">
            {template?.previewUrl ? 'Current PDF' : 'Sample PDF preview'}
          </h3>
          <div className="flex flex-wrap gap-3 text-sm">
            {template?.previewUrl && (
              <a
                href={template.previewUrl}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-primary underline underline-offset-4"
              >
                Open current PDF
              </a>
            )}
            <a
              href="/sales-receipt-sample.pdf"
              download
              className="font-medium text-primary underline underline-offset-4"
            >
              Download sample PDF
            </a>
          </div>
        </div>
        {template && !template.previewUrl && (
          <p className="text-sm text-destructive" role="status">
            The active PDF preview is unavailable. Showing the sample instead.
          </p>
        )}
        <iframe
          title={template?.previewUrl ? 'Current sales receipt template' : 'Sample sales receipt template'}
          src={previewUrl}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="h-[65vh] min-h-[420px] w-full rounded-md border bg-background"
        />
      </section>
      <form className="space-y-4" onSubmit={submit}>
        <Input
          name="template"
          label={template ? 'Replace PDF template' : 'PDF template'}
          type="file"
          accept="application/pdf,.pdf"
          required
          disabled={busy}
          helperText="PDF only, up to 5 MB. This private template is used for completed-order receipts."
        />
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <Button type="submit" loading={busy} disabled={busy}>
          {template ? 'Replace template' : 'Upload template'}
        </Button>
      </form>
    </section>
  );
}
