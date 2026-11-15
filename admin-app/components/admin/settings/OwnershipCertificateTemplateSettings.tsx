'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { saveOwnershipCertificateTemplateAction } from '@/data/actions/system-settings';
import { useInvalidateAdminSystemSettingsQuery } from '@/data/commerce/admin-system-settings-client';
import { OWNERSHIP_CERTIFICATE_TEMPLATE_FIELDS } from '@/data/commerce/ownership-certificate-template-config';
import {
  cleanupSystemSettingsAsset,
  uploadSystemSettingsAsset,
} from '@/data/commerce/system-settings-client';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export function OwnershipCertificateTemplateSettings({
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
  const fieldNames = Object.values(OWNERSHIP_CERTIFICATE_TEMPLATE_FIELDS).join(', ');
  const previewUrl = template?.previewUrl ?? '/ownership-certificate-sample.pdf';

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    let uploadedPath: string | null = null;
    try {
      const file = new FormData(event.currentTarget).get('template');
      if (!(file instanceof File) || file.size < 1) {
        setError('Choose an AcroForm PDF template to upload.');
        return;
      }

      const upload = await uploadSystemSettingsAsset(file, 'template');
      if (upload.error || !upload.path) {
        setError(upload.error ?? 'Could not upload this template.');
        return;
      }
      uploadedPath = upload.path;

      const result = await saveOwnershipCertificateTemplateAction(upload.path);
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
      toast.success(`Certificate template saved (${result.data.version}).`);
      if (result.data.warning) toast.warning(result.data.warning);
      router.refresh();
    } catch (submitError) {
      console.error('Could not upload the ownership certificate template.', submitError);
      if (uploadedPath) {
        const cleaned = await cleanupSystemSettingsAsset(uploadedPath);
        if (!cleaned) {
          setError('Template upload failed, and its unused file could not be removed.');
          return;
        }
      }
      setError('Could not save the certificate template. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-4 rounded-xl border bg-card p-5 sm:p-6">
      <div>
        <h2 className="text-lg font-semibold">Certificate of Ownership template</h2>
        {template ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Active version: {template.templateVersion}. Updated{' '}
            {new Date(template.updatedAt).toLocaleString()}.
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            No imported template is active. The sample certificate will be generated until one is uploaded.
          </p>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        Upload a standard AcroForm PDF with text fields named {fieldNames}.
        The product_details field must be multiline. Replace older templates
        that use the previous field names.
      </p>
      <section className="space-y-3" aria-label="Certificate of Ownership PDF preview">
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
              href="/ownership-certificate-sample.pdf"
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
          title={template?.previewUrl ? 'Current Certificate of Ownership template' : 'Sample Certificate of Ownership template'}
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
          helperText="PDF only, up to 5 MB. The template is private and used only when generating certificates."
        />
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <Button type="submit" loading={busy} disabled={busy}>
          {template ? 'Replace template' : 'Upload template'}
        </Button>
      </form>
    </section>
  );
}
