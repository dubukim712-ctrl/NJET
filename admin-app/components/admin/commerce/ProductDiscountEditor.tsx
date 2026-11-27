'use client';

import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { saveProductDiscountAction } from '@/data/actions/product-discounts';
import { useInvalidateAdminProductsQuery } from '@/data/commerce/admin-products-client';
import { DiscountTargetSelector } from '@/components/admin/commerce/DiscountTargetSelector';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { formatPhp, parsePhpAmount } from '@/lib/commerce';
import type { ProductDiscountAdminRow } from '@/lib/validations/product-discount';
import type { Database } from '@/types/database';

type Product = Database['public']['Tables']['products']['Row'];
type Variant = Database['public']['Tables']['product_variants']['Row'];
type Category = Database['public']['Tables']['product_categories']['Row'];
type DiscountType = 'percentage' | 'fixed';

function toLocalDateTime(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

function initialDateTime(value: string | null | undefined) {
  return value ? toLocalDateTime(new Date(value)) : '';
}

function toIsoDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toggleId(ids: string[], id: string) {
  return ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id];
}

function generateCouponCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const random = crypto.getRandomValues(new Uint8Array(4));
  return 'NJET-' + Array.from(random, (byte) => alphabet[byte % alphabet.length]).join('');
}

export function ProductDiscountEditor({
  discount,
  products,
  variants,
  categories,
  onCancel,
  onSaved,
}: {
  discount?: ProductDiscountAdminRow;
  products: Product[];
  variants: Variant[];
  categories: Category[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const invalidateProducts = useInvalidateAdminProductsQuery();
  const [type, setType] = useState<DiscountType>(discount?.discount_type ?? 'percentage');
  const [amount, setAmount] = useState(discount ? String(discount.value / 100) : '');
  const [variantIds, setVariantIds] = useState(
    discount?.targets.flatMap((target) => target.product_variant_id ?? []) ?? [],
  );
  const [categoryIds, setCategoryIds] = useState(
    discount?.targets.flatMap((target) => target.product_category_id ?? []) ?? [],
  );
  const [couponCode, setCouponCode] = useState(discount?.coupon_code ?? '');
  const [startsAt, setStartsAt] = useState(() => initialDateTime(discount?.starts_at));
  const [endsAt, setEndsAt] = useState(() => initialDateTime(discount?.ends_at));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const percentage = type === 'percentage';
  const value = parsePhpAmount(amount);
  const validValue = value !== null && (percentage ? value >= 100 && value <= 10000 : value > 0);
  const targetsVariants = variantIds.length > 0;
  const startTime = toIsoDateTime(startsAt);
  const endTime = toIsoDateTime(endsAt);
  const invalidRange = Boolean(startTime && endTime && endTime < startTime);

  const productsById = new Map(products.map(({ id, name }) => [id, name]));
  const variantOptions = variants
    .filter((variant) => variant.active || variantIds.includes(variant.id))
    .map((variant) => ({
      id: variant.id,
      label: `${productsById.get(variant.product_id) ?? 'Product'} · ${variant.name} · ${variant.sku}`,
    }));
  const categoryOptions = categories.map(({ id, name }) => ({ id, label: name }));
  const chosenIds = targetsVariants ? variantIds : categoryIds;
  const chosenOptions = targetsVariants ? variantOptions : categoryOptions;
  const targetLabel = chosenIds.length === 1
    ? chosenOptions.find(({ id }) => id === chosenIds[0])?.label
    : undefined;
  const targetSummary = chosenIds.length
    ? `Applies to ${targetLabel ?? (targetsVariants ? `${chosenIds.length} variant(s)` : `${chosenIds.length} categories`)}`
    : 'Choose a target';
  const valueSummary = validValue ? (percentage ? `${value / 100}% off` : `${formatPhp(value)} off`) : 'Enter a discount amount';

  function setEndInDays(days: number) {
    const end = startTime ? new Date(startTime) : new Date();
    end.setDate(end.getDate() + days);
    setEndsAt(toLocalDateTime(end));
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setError(null);
    if (invalidRange || (startsAt && !startTime) || (endsAt && !endTime)) {
      setError('Ends at must be on or after Starts at. Enter valid dates.');
      return;
    }
    if (!validValue) {
      setError(percentage ? 'Enter a percentage from 1 to 100.' : 'Enter a valid discount amount.');
      return;
    }
    setBusy(true);
    const formData = new FormData(event.currentTarget);
    const limitInput = String(formData.get('maxRedemptions') ?? '').trim();
    const maxRedemptions = limitInput ? Number(limitInput) : null;
    try {
      const result = await saveProductDiscountAction({
        id: discount?.id ?? null,
        name: formData.get('name'),
        discountType: type,
        value,
        couponCode,
        startsAt: startTime,
        endsAt: endTime,
        maxRedemptions,
        active: formData.get('active') === 'on',
        targets: chosenIds.map((id) => ({
          productVariantId: targetsVariants ? id : null,
          productCategoryId: targetsVariants ? null : id,
        })),
      });
      if (!result.success) {
        const message = Object.values(result.fieldErrors ?? {}).flat()[0] ?? result.error;
        setError(message);
        toast.error(message);
        return;
      }
      toast.success(discount ? 'Discount updated.' : 'Discount created.');
      await invalidateProducts();
      onSaved();
    } catch (saveError) {
      console.error('Could not save product discount.', saveError);
      setError('Could not save this discount. Please try again.');
      toast.error('Could not save this discount. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="space-y-4 rounded-lg border bg-background p-4" onSubmit={submit}>
      <Input label="Discount name" name="name" defaultValue={discount?.name ?? ''} maxLength={120} required />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Discount type" value={type} onValueChange={(value) => setType(value === 'fixed' ? 'fixed' : 'percentage')}>
          <option value="percentage">Percentage</option>
          <option value="fixed">Fixed PHP amount</option>
        </Select>
        <Input
          label={percentage ? 'Percentage off' : 'Discount amount (PHP)'}
          name="value"
          type="number"
          className="number-no-spinner"
          min={percentage ? '1' : '0.01'}
          max={percentage ? '100' : '21474836.47'}
          step="0.01"
          trailingIcon={percentage ? '%' : undefined}
          leadingIcon={percentage ? undefined : '₱'}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          required
        />
      </div>
      <div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
          <Input
            label="Coupon code"
            name="couponCode"
            value={couponCode}
            onChange={(event) => setCouponCode(event.target.value.toUpperCase().replace(/\s/g, ''))}
            className="font-mono uppercase"
            maxLength={32}
            autoCapitalize="characters"
            spellCheck={false}
          />
          <Button type="button" variant="outline" className="min-h-11" onClick={() => setCouponCode(generateCouponCode())}>
            Generate
          </Button>
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">Leave blank for an automatic discount.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="min-w-0 space-y-2">
          <Input label="Starts at" name="startsAt" type="datetime-local" value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)} />
          <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => setStartsAt(toLocalDateTime(new Date()))}>
            Start now
          </Button>
        </div>
        <div className="min-w-0 space-y-2">
          <Input label="Ends at" name="endsAt" type="datetime-local" value={endsAt} min={startsAt || undefined}
            onChange={(event) => setEndsAt(event.target.value)}
            error={invalidRange ? 'Ends at must be on or after Starts at.' : undefined} />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => setEndInDays(7)}>
              +7 days
            </Button>
            <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => setEndInDays(30)}>
              +30 days
            </Button>
          </div>
        </div>
      </div>
      {couponCode.length > 0 && (
        <Input
          label="Maximum coupon redemptions"
          name="maxRedemptions"
          type="number"
          min="1"
          step="1"
          defaultValue={discount?.max_redemptions ?? ''}
          helperText="Optional redemption limit for this coupon."
        />
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <DiscountTargetSelector
          label="Target variants"
          helperText="Choose one or more specific variants."
          options={variantOptions}
          selectedIds={variantIds}
          onToggle={(id) => setVariantIds((current) => toggleId(current, id))}
          onClear={() => setVariantIds([])}
        />
        <DiscountTargetSelector
          label="Target categories"
          helperText={targetsVariants
            ? 'Specific variants selected. Clear variants to target whole categories instead.' +
              (categoryIds.length ? ' Saving will exclude the selected categories.' : '')
            : 'Select the categories this discount can apply to.'}
          options={categoryOptions}
          selectedIds={categoryIds}
          disabled={targetsVariants}
          onToggle={(id) => setCategoryIds((current) => toggleId(current, id))}
        />
      </div>
      <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          name="active"
          defaultChecked={discount?.active ?? true}
          className="size-4 accent-primary"
        />
        Enable discount during its scheduled dates
      </label>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <p className="w-fit rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium text-primary">
        {valueSummary} · {targetSummary} · {couponCode ? `Coupon required (${couponCode})` : 'Automatic discount'}
      </p>
      <div className="flex flex-col-reverse justify-end gap-2 sm:flex-row">
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>Cancel</Button>
        <Button type="submit" loading={busy}>Save discount</Button>
      </div>
    </form>
  );
}
