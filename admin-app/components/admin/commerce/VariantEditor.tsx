'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Barcode, Plus, PhilippinePeso, Trash2 } from 'lucide-react';
import { saveCommerceVariantAction } from '@/data/actions/commerce-variants-admin';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ProductImage } from '@/components/shop/ProductImage';
import { cleanupCommerceProductImage, uploadCommerceProductImage } from '@/data/commerce/product-images-client';
import { useInvalidateAdminProductsQuery } from '@/data/commerce/admin-products-client';
import type { Database } from '@/types/database';

type Variant = Database['public']['Tables']['product_variants']['Row'];

export function VariantEditor({
  productId,
  isEbike,
  productImagePath,
  variant,
  onCancel,
  onSaved,
}: {
  productId: string;
  isEbike: boolean;
  productImagePath: string | null;
  variant?: Variant;
  onCancel?: () => void;
  onSaved?: () => void;
}) {
  const invalidateProducts = useInvalidateAdminProductsQuery();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [specifications, setSpecifications] = useState(
    () => Object.entries(variant?.specifications ?? {}).map(([key, value]) => ({ key, value }))
  );
  const previewRef = useRef<string | null>(null);

  useEffect(() => () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const price = Number(formData.get('price'));
    const reservation = Number(formData.get('reservation') || 0);
    const homeCreditDownpayment = Number(formData.get('homeCreditDownpayment') || 0);
    let uploadedPath: string | null = null;
    try {
      if (
        !Number.isFinite(price) ||
        !Number.isFinite(reservation) ||
        !Number.isFinite(homeCreditDownpayment)
      ) {
        const message = 'Enter valid prices in PHP.';
        setError(message);
        toast.error(message);
        return;
      }
      const entries = specifications
        .map(({ key, value }) => ({ key: key.trim(), value: value.trim() }))
        .filter(({ key, value }) => key || value);
      if (entries.some(({ key, value }) => !key || !value)) {
        const message = 'Enter both a name and value for each specification.';
        setError(message);
        toast.error(message);
        return;
      }
      if (new Set(entries.map(({ key }) => key)).size !== entries.length) {
        const message = 'Specification names must be unique.';
        setError(message);
        toast.error(message);
        return;
      }
      const specificationValues = Object.fromEntries(
        entries.map(({ key, value }) => [key, value])
      );
      const file = formData.get('image');
      if (file instanceof File && file.size > 0) {
        const upload = await uploadCommerceProductImage(file);
        if (upload.error || !upload.path) {
          const message = upload.error ?? 'Could not upload this image.';
          setError(message);
          toast.error(message);
          return;
        }
        uploadedPath = upload.path;
      }
      const result = await saveCommerceVariantAction({
        id: variant?.id ?? null,
        productId,
        sku: formData.get('sku'),
        name: formData.get('name'),
        specifications: Object.keys(specificationValues).length ? specificationValues : null,
        priceMinor: Math.round(price * 100),
        reservationMinor: Math.round(reservation * 100),
        homeCreditDownpaymentMinor: Math.round(homeCreditDownpayment * 100),
        imagePath: uploadedPath ?? (formData.get('clearImage') === 'on' ? null : variant?.image_path ?? null),
        active: formData.get('active') === 'on',
      });
      if (!result.success) {
        const cleaned = uploadedPath
          ? await cleanupCommerceProductImage(uploadedPath)
          : true;
        const message = !cleaned
          ? `${result.error} The unused upload could not be removed.`
          : result.error;
        setError(message);
        toast.error(message);
        return;
      }
      toast.success(variant ? 'Variant updated.' : 'Variant created.');
      void invalidateProducts();
      onSaved?.();
    } catch (saveError) {
      console.error('Could not save product variant.', saveError);
      if (uploadedPath) {
        const cleaned = await cleanupCommerceProductImage(uploadedPath);
        if (!cleaned) {
          const message = 'Could not save this variant; the unused uploaded image could not be removed.';
          setError(message);
          toast.error(message);
          return;
        }
      }
      const message = 'Could not save this variant. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="space-y-4 rounded-lg border bg-background p-4" onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input name="sku" label="SKU" defaultValue={variant?.sku} required maxLength={80} leadingIcon={<Barcode className="h-4 w-4" />} />
        <Input name="name" label="Variant name" defaultValue={variant?.name} required maxLength={120} />
        <Input name="price" label="Price (PHP)" type="number" min="0" step="0.01" defaultValue={variant ? (variant.price_minor / 100).toFixed(2) : ''} required leadingIcon={<PhilippinePeso className="h-4 w-4" />} />
        {isEbike && (
          <Input name="reservation" label="Reservation per unit (PHP)" type="number" min="0" step="0.01" defaultValue={variant ? (variant.reservation_minor / 100).toFixed(2) : '0.00'} required leadingIcon={<PhilippinePeso className="h-4 w-4" />} />
        )}
        <Input
          name="homeCreditDownpayment"
          label="Home Credit downpayment per unit (PHP)"
          type="number"
          min="0"
          step="0.01"
          defaultValue={variant ? (variant.home_credit_downpayment_minor / 100).toFixed(2) : '0.00'}
          required
          leadingIcon={<PhilippinePeso className="h-4 w-4" />}
          helperText="Used for Home Credit orders placed on the storefront."
        />
        {variant && (
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input type="checkbox" name="active" defaultChecked={variant.active} className="size-4 accent-primary" />
            Available in storefront
          </label>
        )}
      </div>
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Specifications (optional)</legend>
        {specifications.length === 0 && (
          <p className="text-sm text-muted-foreground">No specifications added.</p>
        )}
        {specifications.map((specification, index) => (
          <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <Input
              label={`Specification ${index + 1} name`}
              value={specification.key}
              onChange={(event) => setSpecifications((current) => current.map((item, itemIndex) =>
                itemIndex === index ? { ...item, key: event.target.value } : item
              ))}
              maxLength={80}
              placeholder="e.g. Color"
            />
            <Input
              label={`Specification ${index + 1} value`}
              value={specification.value}
              onChange={(event) => setSpecifications((current) => current.map((item, itemIndex) =>
                itemIndex === index ? { ...item, value: event.target.value } : item
              ))}
              maxLength={500}
              placeholder="e.g. Matte black"
            />
            <Button
              type="button"
              variant="outline"
              aria-label={`Remove specification ${specification.key || index + 1}`}
              className="self-end"
              onClick={() => setSpecifications((current) =>
                current.filter((_, itemIndex) => itemIndex !== index)
              )}
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          disabled={specifications.length >= 30}
          onClick={() => setSpecifications((current) => [...current, { key: '', value: '' }])}
        >
          <Plus className="mr-2 size-4" aria-hidden="true" />
          Add specification
        </Button>
      </fieldset>
      <div className="space-y-3">
        <Input
          name="image"
          label="Variant image (optional override)"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          helperText="Leave blank to use the general product image."
          onChange={(event) => {
            if (previewRef.current) URL.revokeObjectURL(previewRef.current);
            previewRef.current = event.target.files?.[0]
              ? URL.createObjectURL(event.target.files[0])
              : null;
            setPreviewUrl(previewRef.current);
          }}
        />
        {(previewUrl || variant?.image_path || productImagePath) && (
          <ProductImage
            path={variant?.image_path ?? productImagePath}
            srcOverride={previewUrl}
            alt={`${variant?.name ?? 'Variant'} image preview`}
            className="max-w-sm rounded-lg"
          />
        )}
        {variant?.image_path && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="clearImage" className="size-4 accent-primary" />
            Use the general product image instead
          </label>
        )}
      </div>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={busy}>{variant ? 'Save variant' : 'Add variant'}</Button>
      </div>
    </form>
  );
}
