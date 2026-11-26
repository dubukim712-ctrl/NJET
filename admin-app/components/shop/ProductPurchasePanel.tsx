"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { getStorefrontStockLabel } from "@/data/commerce/storefront-stock-label";
import { useEffect, useMemo, useState } from "react";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { Button } from '@/components/ui/Button';
import { ProductPaymentTerms } from '@/components/shop/ProductPaymentTerms';
import { isSrpLabel, readSrpMinor } from '@/lib/storefront-featured-copy';
import { openSupportChatEvent } from '@/lib/support-chat/open-launcher';
import { Select } from "@/components/ui/Select";
import type { CatalogProduct } from "@/data/commerce/catalog";
import { ProductStockBadge } from "@/components/shop/ProductStockBadge";
import { ProductPrice } from "@/components/shop/ProductPrice";
import { formatPhp } from "@/lib/commerce";

export function ProductPurchasePanel({
  product,
  branches,
  onImagePathChange,
}: {
  product: CatalogProduct;
  branches: { id: string; name: string }[];
  onImagePathChange: (path: string | null) => void;
}) {
  const { user } = useAuth();
  function inStockSelection(preferredVariantId?: string) {
    const preferred = product.variants.find(({ id }) => id === preferredVariantId);
    const availableBranch = preferred && branches.find((branch) =>
      preferred.stockByBranch.some((stock) => stock.branchId === branch.id && stock.available));
    if (preferred && availableBranch) return { branch: availableBranch.id, variant: preferred.id };

    for (const branch of branches) {
      const variant = product.variants.find((item) =>
        item.stockByBranch.some((stock) => stock.branchId === branch.id && stock.available));
      if (variant) return { branch: branch.id, variant: variant.id };
    }
    return null;
  }

  const [branchId, setBranchId] = useState(() => inStockSelection()?.branch ?? branches[0]?.id ?? '');
  const [variantId, setVariantId] = useState("");
  const branchVariants = useMemo(
    () =>
      product.variants.map((variant) => {
        const branchStock = variant.stockByBranch.find(
          (entry) => entry.branchId === branchId,
        );
        return {
          ...variant,
          branchStock,
          available: branchStock?.available ?? false,
        };
      }),
    [branchId, product.variants],
  );
  const selectedVariant =
    branchVariants.find((variant) => variant.id === variantId) ??
    branchVariants.find((variant) => variant.available) ??
    branchVariants[0];
  const recovery = selectedVariant?.available ? null : inStockSelection(selectedVariant?.id);
  const specs = Object.entries(selectedVariant?.specifications ?? {});
  const srpSpec = specs.find(([name]) => isSrpLabel(name));
  const srp = srpSpec ? readSrpMinor(srpSpec[1]) : null;
  const visibleSpecs = srp === null ? specs : specs.filter(([name]) => !isSrpLabel(name));

  useEffect(() => {
    onImagePathChange(selectedVariant?.image_path ?? product.image_path);
  }, [onImagePathChange, product.image_path, selectedVariant?.image_path]);

  const changeBranch = (nextBranchId: string) => {
    setBranchId(nextBranchId);
    setVariantId(selectedVariant?.id ?? '');
  };

  return (
    <section
      className="space-y-5 rounded-xl border bg-card p-5 sm:p-6"
      aria-label="Choose a store and variant"
    >
      <Select
        label="Store branch"
        value={branchId}
        onValueChange={(value) => changeBranch(value)}
        disabled={!branches.length}
      >
        {!branches.length && <option value="">No active branches</option>}
        {branches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name}
          </option>
        ))}
      </Select>
      <Select
        label="Variant"
        value={selectedVariant?.id ?? ""}
        onValueChange={(value) => setVariantId(value)}
        disabled={!branchId || !branchVariants.length}
      >
        {!branchVariants.length && <option value="">No variants listed</option>}
        {branchVariants.map((variant) => (
          <option
            key={variant.id}
            value={variant.id}
          >
            {variant.name} -{" "}
            {getStorefrontStockLabel(variant.branchStock, Boolean(user))}
          </option>
        ))}
      </Select>
      {selectedVariant && (
        <div className="rounded-lg bg-secondary/60 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <ProductPrice
              priceMinor={selectedVariant.price_minor}
              listPriceMinor={selectedVariant.list_price_minor}
              srpMinor={srp}
            />
            <ProductStockBadge available={selectedVariant.available}>
              {getStorefrontStockLabel(selectedVariant.branchStock, Boolean(user))}
            </ProductStockBadge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            SKU: {selectedVariant.sku}
          </p>
          {visibleSpecs.length > 0 && (
              <dl className="mt-3 grid gap-x-4 gap-y-2 border-t pt-3 text-sm min-[321px]:grid-cols-2">
                {visibleSpecs.map(
                  ([name, value]) => (
                    <div key={name}>
                      <dt className="text-xs font-medium text-muted-foreground">
                        {name}
                      </dt>
                      <dd>{value}</dd>
                    </div>
                  ),
                )}
              </dl>
            )}
          {product.product_type === "ebike" && (
            <p className="mt-2 text-sm text-muted-foreground">
              Pickup reservation:{" "}
              <b>{formatPhp(selectedVariant.reservation_minor)}</b> per unit
            </p>
          )}
          {(selectedVariant.home_credit_downpayment_minor > 0 || product.product_type === "ebike") && (
            <p className="mt-1 text-sm text-muted-foreground">
              Home Credit downpayment:{" "}
              <b>{formatPhp(selectedVariant.home_credit_downpayment_minor)}</b>{" "}
              per unit
            </p>
          )}
          {product.product_type === 'ebike' && selectedVariant.price_minor > 0 && (
            <ProductPaymentTerms priceMinor={selectedVariant.price_minor} downpaymentMinor={selectedVariant.home_credit_downpayment_minor} />
          )}
        </div>
      )}
      {selectedVariant?.available ? (
        <AddToCartButton
          variantId={selectedVariant.id}
          branchId={branchId}
          maxQuantity={selectedVariant.branchStock?.stock ?? null}
        />
      ) : (
        <div className="grid gap-2">
          <Button type="button" variant="secondary" className="min-h-11 w-full" disabled>
            Out of stock
          </Button>
          {recovery ? (
            <Button type="button" variant="outline" className="min-h-11 w-full whitespace-normal" onClick={() => {
              setBranchId(recovery.branch);
              setVariantId(recovery.variant);
            }}>
              {recovery.branch === branchId ? 'Switch to In-Stock Variant' : 'Switch to In-Stock Branch'}
            </Button>
          ) : (
            <Button type="button" variant="outline" className="min-h-11 w-full whitespace-normal"
              onClick={() => window.dispatchEvent(new Event(openSupportChatEvent))}>
              Ask About Restock via Chat
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
