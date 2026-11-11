'use client';

import { useMemo, useState } from 'react';
import { AddToCartButton } from '@/components/cart/AddToCartButton';
import { Select } from '@/components/ui/Select';
import type { CatalogProduct } from '@/data/commerce/catalog';
import { formatPhp } from '@/lib/commerce';
import { ProductImage } from '@/components/shop/ProductImage';

export function ProductPurchasePanel({
  product,
  branches,
}: {
  product: CatalogProduct;
  branches: { id: string; name: string }[];
}) {
  const [branchId, setBranchId] = useState(branches[0]?.id ?? '');
  const [variantId, setVariantId] = useState('');
  const branchVariants = useMemo(
    () => product.variants.map((variant) => {
      const branchStock = variant.stockByBranch.find(
        (entry) => entry.branchId === branchId
      );
      return {
        ...variant,
        branchStock,
        available: branchStock?.available ?? false,
      };
    }),
    [branchId, product.variants]
  );
  const selectedVariant =
    branchVariants.find((variant) => variant.id === variantId) ??
    branchVariants.find((variant) => variant.available) ??
    branchVariants[0];

  const changeBranch = (nextBranchId: string) => {
    setBranchId(nextBranchId);
    setVariantId('');
  };

  return (
    <section className="space-y-5 rounded-xl border bg-card p-5 sm:p-6" aria-label="Choose a store and variant">
      <ProductImage
        path={selectedVariant?.image_path ?? product.image_path}
        alt={selectedVariant ? `${product.name} - ${selectedVariant.name}` : product.name}
        className="rounded-lg"
      />
      <Select
        label="Store branch"
        value={branchId}
        onChange={(event) => changeBranch(event.target.value)}
        disabled={!branches.length}
      >
        {!branches.length && <option value="">No active branches</option>}
        {branches.map((branch) => (
          <option key={branch.id} value={branch.id}>{branch.name}</option>
        ))}
      </Select>
      <Select
        label="Variant"
        value={selectedVariant?.id ?? ''}
        onChange={(event) => setVariantId(event.target.value)}
        disabled={!branchId || !branchVariants.length}
      >
        {!branchVariants.length && <option value="">No variants listed</option>}
        {branchVariants.map((variant) => (
          <option key={variant.id} value={variant.id} disabled={!variant.available}>
            {variant.name} - {variant.available
              ? variant.branchStock?.stock === null
                ? 'Available'
                : `${variant.branchStock?.stock ?? 0} in stock`
              : 'Out of stock'}
          </option>
        ))}
      </Select>
      {selectedVariant && (
        <div className="rounded-lg bg-secondary/60 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-semibold">{formatPhp(selectedVariant.price_minor)}</p>
            <p className="text-sm text-muted-foreground">
              {selectedVariant.available
                ? selectedVariant.branchStock?.stock === null
                  ? 'Available at this branch'
                  : `${selectedVariant.branchStock?.stock ?? 0} available at this branch`
                : 'Currently out of stock at this branch'}
            </p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">SKU: {selectedVariant.sku}</p>
          {selectedVariant.specifications && Object.keys(selectedVariant.specifications).length > 0 && (
            <dl className="mt-3 grid gap-x-4 gap-y-2 border-t pt-3 text-sm sm:grid-cols-2">
              {Object.entries(selectedVariant.specifications).map(([name, value]) => (
                <div key={name}>
                  <dt className="text-xs font-medium text-muted-foreground">{name}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          )}
          {product.product_type === 'ebike' && (
            <p className="mt-2 text-sm text-muted-foreground">
              Pickup reservation: {formatPhp(selectedVariant.reservation_minor)} per unit
            </p>
          )}
          {selectedVariant.home_credit_downpayment_minor > 0 && (
            <p className="mt-1 text-sm text-muted-foreground">
              Home Credit downpayment: {formatPhp(selectedVariant.home_credit_downpayment_minor)} per unit
            </p>
          )}
        </div>
      )}
      {selectedVariant?.available ? (
        <AddToCartButton variantId={selectedVariant.id} />
      ) : (
        <button
          type="button"
          disabled
          className="min-h-11 w-full rounded-md bg-muted px-4 text-sm font-medium text-muted-foreground"
        >
          Choose an available variant
        </button>
      )}
    </section>
  );
}
