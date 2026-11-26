'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { createClient } from '@/data/supabase/client';
import { createCustomerRelease, updateCustomerRelease } from '@/data/actions/customer-releases';
import { releasesBucket, type ReleaseOrderOption } from '@/lib/customer-releases';
import type { CustomerRelease } from '@/types/customer-releases';

const extensions = new Map([['image/jpeg', 'jpg'], ['image/png', 'png'], ['image/webp', 'webp']]);

export function CustomerReleaseForm({ orders, userId, canApprove, release, onSaved }: {
  orders: ReleaseOrderOption[];
  userId: string;
  canApprove: boolean;
  release?: CustomerRelease;
  onSaved: () => void;
}) {
  const matchingOrder = orders.find((option) => option.orderId === release?.order_id && option.productId === release?.product_id)
    ?? orders.find((option) => option.orderId === release?.order_id);
  const [orderKey, setOrderKey] = useState(matchingOrder?.key ?? (release?.order_id ? 'linked' : 'none'));
  const [fields, setFields] = useState({
    order_id: release?.order_id ?? null,
    customer_name: release?.customer_name ?? '',
    product_id: release?.product_id ?? null,
    model_name: release?.model_name ?? '',
    branch_id: release?.branch_id ?? null,
    branch_name: release?.branch_name ?? '',
    caption: release?.caption ?? '',
    is_approved: release?.is_approved ?? false,
    display_order: release?.display_order ?? 0,
  });
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function selectOrder(key: string) {
    setOrderKey(key);
    const option = orders.find((order) => order.key === key);
    setFields((current) => option ? {
      ...current, order_id: option.orderId, customer_name: option.customerName,
      product_id: option.productId, model_name: option.modelName,
      branch_id: option.branchId, branch_name: option.branchName,
    } : key === 'linked' ? {
      ...current, order_id: release?.order_id ?? null,
    } : {
      ...current, order_id: null, product_id: null, branch_id: null,
    });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const form = event.currentTarget;
    setError(null);
    setSaving(true);
    try {
      if (release) {
        const result = await updateCustomerRelease(release.id, fields);
        if (result.error) setError(result.error);
        else onSaved();
        return;
      }
      const extension = file ? extensions.get(file.type) : null;
      if (!file || !extension || file.size < 1 || file.size > 5 * 1024 * 1024) {
        setError('Choose a JPEG, PNG, or WebP image up to 5 MB.');
        return;
      }
      const bucket = createClient().storage.from(releasesBucket);
      const path = `releases/${userId}/${crypto.randomUUID()}.${extension}`;
      const upload = await bucket.upload(path, file, { contentType: file.type, upsert: false });
      if (upload.error) throw upload.error;
      let saved = false;
      try {
        const result = await createCustomerRelease(fields, path);
        if (result.error) {
          setError(result.error);
          return;
        }
        saved = true;
        form.reset();
        setFile(null);
        setOrderKey('none');
        setFields({ order_id: null, customer_name: '', product_id: null, model_name: '',
          branch_id: null, branch_name: '', caption: '', is_approved: false, display_order: 0 });
        onSaved();
      } finally {
        if (!saved) await bucket.remove([path]).catch(() => {});
      }
    } catch {
      setError('The release could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <Select label="Link to Completed Order" value={orderKey} onValueChange={selectOrder} disabled={saving}>
        <option value="none">No linked order</option>
        {release?.order_id && !matchingOrder && <option value="linked">Keep current linked order</option>}
        {orders.map((order) => <option key={order.key} value={order.key}>{[order.orderNumber, order.modelName, order.branchName].filter(Boolean).join(" — ")}</option>)}
      </Select>
      {!release && (
        <Input label="Release photo" type="file" accept="image/jpeg,image/png,image/webp" required disabled={saving}
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          helperText="JPEG, PNG, or WebP up to 5 MB. Use photos approved by the customer for public sharing." />
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Customer name" value={fields.customer_name} maxLength={80} disabled={saving}
          onChange={(event) => setFields({ ...fields, customer_name: event.target.value })} />
        <Input label="E-bike model" value={fields.model_name} maxLength={120} disabled={saving}
          onChange={(event) => setFields({ ...fields, model_name: event.target.value, product_id: null })} />
        <Input label="Branch" value={fields.branch_name} maxLength={120} disabled={saving}
          onChange={(event) => setFields({ ...fields, branch_name: event.target.value, branch_id: null })} />
        {canApprove && <Input label="Display order" type="number" min={-1000} max={1000} value={fields.display_order}
          disabled={saving} onChange={(event) => setFields({ ...fields, display_order: Number(event.target.value) })} />}
      </div>
      <Textarea label="Caption" value={fields.caption} maxLength={500} disabled={saving}
        onChange={(event) => setFields({ ...fields, caption: event.target.value })} />
      {canApprove ? (
        <Button type="button" variant={fields.is_approved ? 'secondary' : 'outline'} aria-pressed={fields.is_approved}
          onClick={() => setFields({ ...fields, is_approved: !fields.is_approved })} disabled={saving}
          className="min-h-11 max-w-full whitespace-normal">
          {release ? 'Published' : 'Approve & Publish Immediately'}
        </Button>
      ) : <p className="w-fit rounded-full bg-secondary px-3 py-1 text-xs font-semibold">Submitted for admin review</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div><Button type="submit" className="min-h-11" disabled={saving}>
        {saving ? 'Saving…' : release ? 'Save changes' : 'Upload Release Photo'}
      </Button></div>
    </form>
  );
}
