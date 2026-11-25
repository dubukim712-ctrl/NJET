'use client';

import { useEffect, useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { ProductDiscountEditor } from '@/components/admin/commerce/ProductDiscountEditor';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { getDiscountStatus } from '@/lib/product-discount-status';
import type { ProductDiscountAdminRow } from '@/lib/validations/product-discount';
import type { Database } from '@/types/database';

type Product = Database['public']['Tables']['products']['Row'];
type Variant = Database['public']['Tables']['product_variants']['Row'];
type Category = Database['public']['Tables']['product_categories']['Row'];

export function ProductDiscountsTab({
  discounts,
  products,
  variants,
  categories,
  canManageProducts,
}: {
  discounts: ProductDiscountAdminRow[];
  products: Product[];
  variants: Variant[];
  categories: Category[];
  canManageProducts: boolean;
}) {
  const [selected, setSelected] = useState<ProductDiscountAdminRow | null | undefined>();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const boundaries = discounts
      .filter((discount) => discount.active)
      .flatMap((discount) => [discount.starts_at, discount.ends_at])
      .flatMap((date) => date ? [Date.parse(date)] : []);

    const refresh = () => {
      const current = Date.now();
      setNow(current);
      const next = Math.min(...boundaries.filter((boundary) => boundary > current));
      if (Number.isFinite(next)) {
        timer = window.setTimeout(refresh, Math.min(next - current, 2_147_483_647));
      }
    };
    let timer = window.setTimeout(refresh, 0);
    return () => window.clearTimeout(timer);
  }, [discounts]);

  const productById = new Map(products.map((product) => [product.id, product]));
  const variantById = new Map(variants.map((variant) => [variant.id, variant]));
  const categoryById = new Map(categories.map((category) => [category.id, category]));

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Product discounts</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Set automatic offers or coupon codes for selected variants and categories.
          </p>
        </div>
        {canManageProducts && (
          <Button type="button" onClick={() => setSelected(null)}>
            <Plus className="mr-2 size-4" aria-hidden="true" />
            Add discount
          </Button>
        )}
      </header>
      {discounts.length ? (
        <ul className="divide-y rounded-xl border bg-card">
          {discounts.map((discount) => {
            const status = now === null ? null : getDiscountStatus(discount, now);
            const targets = discount.targets.map((target) =>
              target.product_variant_id
                ? variantById.get(target.product_variant_id)?.name ?? 'Removed variant'
                : categoryById.get(target.product_category_id ?? '')?.name ?? 'Removed category'
            );
            const targetProducts = discount.targets.flatMap((target) =>
              target.product_variant_id
                ? [productById.get(variantById.get(target.product_variant_id)?.product_id ?? '')?.name]
                : []
            ).filter(Boolean);
            return (
              <li key={discount.id} className="flex flex-wrap items-start justify-between gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{discount.name}</h3>
                    {status && <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      status === 'Active'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {status}
                    </span>}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {discount.discount_type === 'percentage'
                      ? `${(discount.value / 100).toFixed(discount.value % 100 ? 2 : 0)}% off`
                      : `${(discount.value / 100).toFixed(2)} PHP off`}
                    {discount.coupon_code ? ` · Code ${discount.coupon_code}` : ' · Automatic'}
                  </p>
                  <p className="mt-1 break-words text-xs text-muted-foreground">
                    {targets.join(', ')}
                    {targetProducts.length ? ` · ${[...new Set(targetProducts)].join(', ')}` : ''}
                    {' · '}Redemptions {discount.redemptions}
                    {discount.max_redemptions ? ` / ${discount.max_redemptions}` : ''}
                  </p>
                </div>
                {canManageProducts && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelected(discount)}
                  >
                    <Pencil className="mr-2 size-4" aria-hidden="true" />
                    Edit
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
          No discounts yet. Add one to create an automatic offer or coupon.
        </p>
      )}
      <Modal
        open={selected !== undefined}
        title={selected ? 'Edit discount' : 'Create discount'}
        size="wide"
        onClose={() => setSelected(undefined)}
      >
        {selected !== undefined && (
          <ProductDiscountEditor
            key={selected?.id ?? 'new-discount'}
            discount={selected ?? undefined}
            products={products}
            variants={variants}
            categories={categories}
            onCancel={() => setSelected(undefined)}
            onSaved={() => setSelected(undefined)}
          />
        )}
      </Modal>
    </div>
  );
}
