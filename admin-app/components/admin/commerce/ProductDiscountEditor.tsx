'use client';

import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Check } from 'lucide-react';
import { saveProductDiscountAction } from '@/data/actions/product-discounts';
import { useInvalidateAdminProductsQuery } from '@/data/commerce/admin-products-client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { parsePhpAmount } from '@/lib/commerce';
import type { ProductDiscountAdminRow } from '@/lib/validations/product-discount';
import type { Database } from '@/types/database';

type Product = Database['public']['Tables']['products']['Row'];
type Variant = Database['public']['Tables']['product_variants']['Row'];
type Category = Database['public']['Tables']['product_categories']['Row'];
type DiscountType = 'percentage' | 'fixed';

function DiscountTargetSelector({
  label,
  helperText,
  options,
  selectedIds,
  onToggle,
}: {
  label: string;
  helperText: string;
  options: { id: string; label: string }[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div role="group" aria-label={label} className="min-w-0 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{label}</p>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
            selectedIds.length
              ? 'bg-primary/10 text-primary'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {selectedIds.length} selected
        </span>
      </div>
      <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border bg-muted/20 p-2">
        {options.length ? (
          options.map((option) => {
            const isSelected = selectedIds.includes(option.id);
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onToggle(option.id)}
                className={`flex min-h-11 w-full items-center gap-3 rounded-md border px-3 py-2 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  isSelected
                    ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                    : 'border-border bg-background text-foreground hover:border-primary/50 hover:bg-accent'
                }`}
              >
                <span className="flex size-4 shrink-0 items-center justify-center">
                  {isSelected && <Check className="size-4" aria-hidden="true" />}
                </span>
                <span className="min-w-0 flex-1 break-words">{option.label}</span>
              </button>
            );
          })
        ) : (
          <p className="px-2 py-3 text-sm text-muted-foreground">
            No options available.
          </p>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{helperText}</p>
    </div>
  );
}

function toLocalDateTime(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

function toIsoDateTime(value: FormDataEntryValue | null) {
  if (typeof value !== 'string' || !value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
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
  const [variantIds, setVariantIds] = useState(
    discount?.targets.flatMap((target) => target.product_variant_id ?? []) ?? []
  );
  const [categoryIds, setCategoryIds] = useState(
    discount?.targets.flatMap((target) => target.product_category_id ?? []) ?? []
  );
  const [couponCode, setCouponCode] = useState(discount?.coupon_code ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const rawValue = String(formData.get('value') ?? '').trim();
    const value = type === 'percentage'
      ? Math.round(Number(rawValue) * 100)
      : parsePhpAmount(rawValue);
    const limitInput = String(formData.get('maxRedemptions') ?? '').trim();
    const maxRedemptions = limitInput ? Number(limitInput) : null;
    try {
      const result = await saveProductDiscountAction({
        id: discount?.id ?? null,
        name: formData.get('name'),
        discountType: type,
        value,
        couponCode: formData.get('couponCode'),
        startsAt: toIsoDateTime(formData.get('startsAt')),
        endsAt: toIsoDateTime(formData.get('endsAt')),
        maxRedemptions: Number.isInteger(maxRedemptions) ? maxRedemptions : null,
        active: formData.get('active') === 'on',
        targets: [
          ...variantIds.map((productVariantId) => ({ productVariantId, productCategoryId: null })),
          ...categoryIds.map((productCategoryId) => ({ productVariantId: null, productCategoryId })),
        ],
      });
      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
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

  const selectedProductByVariant = new Map(
    products.map((product) => [product.id, product.name])
  );

  return (
    <form className="space-y-4 rounded-lg border bg-background p-4" onSubmit={submit}>
      <Input label="Discount name" name="name" defaultValue={discount?.name ?? ''} maxLength={120} required />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Discount type" value={type} onValueChange={(value) => setType(value === 'fixed' ? 'fixed' : 'percentage')}>
          <option value="percentage">Percentage</option>
          <option value="fixed">Fixed PHP amount</option>
        </Select>
        <Input
          label={type === 'percentage' ? 'Percentage off' : 'PHP amount off'}
          name="value"
          type="number"
          min={type === 'percentage' ? '0.01' : '0.01'}
          max={type === 'percentage' ? '100' : undefined}
          step={type === 'percentage' ? '0.01' : '0.01'}
          defaultValue={discount
            ? type === 'percentage'
              ? (discount.value / 100).toString()
              : (discount.value / 100).toFixed(2)
            : ''}
          required
        />
      </div>
      <Input
        label="Coupon code (leave blank for automatic discount)"
        name="couponCode"
        value={couponCode}
        onChange={(event) => setCouponCode(event.target.value)}
        maxLength={32}
        autoCapitalize="characters"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Starts at" name="startsAt" type="datetime-local" defaultValue={toLocalDateTime(discount?.starts_at)} />
        <Input label="Ends at" name="endsAt" type="datetime-local" defaultValue={toLocalDateTime(discount?.ends_at)} />
      </div>
      {couponCode.trim().length > 0 && (
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
          helperText="Choose one or more variants, or leave empty to target categories."
          options={variants
            .filter((variant) => variant.active || variantIds.includes(variant.id))
            .map((variant) => ({
              id: variant.id,
              label: `${selectedProductByVariant.get(variant.product_id) ?? 'Product'} · ${variant.name}`,
            }))}
          selectedIds={variantIds}
          onToggle={(id) =>
            setVariantIds((current) =>
              current.includes(id)
                ? current.filter((value) => value !== id)
                : [...current, id],
            )
          }
        />
        <DiscountTargetSelector
          label="Target categories"
          helperText="Select the categories this discount can apply to."
          options={categories.map((category) => ({
            id: category.id,
            label: category.name,
          }))}
          selectedIds={categoryIds}
          onToggle={(id) =>
            setCategoryIds((current) =>
              current.includes(id)
                ? current.filter((value) => value !== id)
                : [...current, id],
            )
          }
        />
      </div>
      <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          name="active"
          defaultChecked={discount?.active ?? true}
          className="size-4 accent-primary"
        />
        Discount is active
      </label>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <div className="flex flex-col-reverse justify-end gap-2 sm:flex-row">
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>Cancel</Button>
        <Button type="submit" loading={busy}>Save discount</Button>
      </div>
    </form>
  );
}
