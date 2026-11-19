'use client';

import { useState } from 'react';
import { previewProductDiscountAction } from '@/data/actions/product-discounts';
import type { DiscountQuoteRow } from '@/lib/validations/product-discount';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type DiscountChannel = 'storefront' | 'walk_in';

export function DiscountCodeInput({
  channel,
  items,
  phone,
  appliedCode,
  disabled,
  onApplied,
  onCleared,
}: {
  channel: DiscountChannel;
  items: { variantId: string; quantity: number }[];
  phone?: string;
  appliedCode?: string;
  disabled: boolean;
  onApplied: (code: string, rows: DiscountQuoteRow[]) => void;
  onCleared: () => void;
}) {
  const [code, setCode] = useState(appliedCode ?? '');
  const [applied, setApplied] = useState(Boolean(appliedCode));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const couponCode = code.trim().toUpperCase();
      const payload = channel === 'storefront'
        ? { channel, couponCode, items }
        : { channel, couponCode, phone: phone ?? '', items };
      const result = await previewProductDiscountAction(payload);
      if (!result.success) {
        setError(result.error);
        return;
      }
      if (!result.data.some((row) => row.discount_code === couponCode)) {
        setError('This coupon does not apply to the items in your order.');
        return;
      }
      setCode(couponCode);
      setApplied(true);
      onApplied(couponCode, result.data);
    } catch (previewError) {
      console.error('Could not apply product discount code.', previewError);
      setError('The coupon could not be checked. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const clear = () => {
    setCode('');
    setApplied(false);
    setError(null);
    onCleared();
  };

  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <Input
          label="Coupon code"
          value={code}
          onChange={(event) => {
            setCode(event.target.value.toUpperCase());
            if (applied) {
              setApplied(false);
              onCleared();
            }
          }}
          maxLength={32}
          autoCapitalize="characters"
          disabled={disabled || busy}
          placeholder="Enter code"
        />
        {applied ? (
          <Button type="button" variant="outline" onClick={clear} disabled={disabled || busy}>
            Remove code
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => void apply()}
            disabled={disabled || busy || !code.trim() || !items.length || (channel === 'walk_in' && !phone?.trim())}
            loading={busy}
          >
            Apply
          </Button>
        )}
      </div>
      {channel === 'walk_in' && !phone?.trim() && (
        <p className="text-xs text-muted-foreground">Enter the customer phone number to check a coupon.</p>
      )}
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      {applied && <p className="text-sm text-primary" role="status">Coupon applied to eligible items.</p>}
    </section>
  );
}
