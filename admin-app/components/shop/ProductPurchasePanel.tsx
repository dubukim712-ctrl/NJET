"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { getStorefrontStockLabel } from "@/data/commerce/storefront-stock-label";
import { useEffect, useMemo, useState } from "react";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { PaymentOptionBadges } from "@/components/shop/PaymentOptionBadges";
import { Button } from '@/components/ui/Button';
import { ProductPaymentTerms } from '@/components/shop/ProductPaymentTerms';
import { isSrpLabel, readSrpMinor } from '@/lib/storefront-featured-copy';
import { openSupportChatEvent } from '@/lib/support-chat/open-launcher';
import Link from "next/link";
import { ProductReviewStars } from "@/components/shop/ProductReviewStars";
import { featuredProductDescription } from "@/lib/storefront-featured-copy";
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
  const orderedBranches = [...branches].sort((a, b) => {
    const firstIsMain = /^NJET Main Branch$/i.test(a.name.trim());
    const secondIsMain = /^NJET Main Branch$/i.test(b.name.trim());
    if (firstIsMain !== secondIsMain) return firstIsMain ? -1 : 1;
    return a.name.trim().localeCompare(b.name.trim(), "en-PH");
  });
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
  }, [onImagePathChange, product.image_path, selectedVariant?.id, selectedVariant?.image_path]);

  const changeBranch = (nextBranchId: string) => {
    setBranchId(nextBranchId);
    setVariantId(selectedVariant?.id ?? '');
  };

  const { averageRating, reviewCount } = product.ratingSummary;

  return (
    <section className="min-w-0 space-y-4 text-foreground" aria-label="Product details and purchase options">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <nav aria-label="Breadcrumb" className="min-w-0 text-xs text-muted-foreground">
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <li><Link className="hover:underline" href="/shop">Catalog</Link></li>
              {product.categoryName && (
                <li className="flex items-center gap-2">
                  <span aria-hidden="true">/</span>
                  <Link className="hover:underline" href={{ pathname: "/shop", query: { category: product.category_id } }}>
                    {product.categoryName}
                  </Link>
                </li>
              )}
              <li aria-current="page" className="flex items-center gap-2">
                <span aria-hidden="true">/</span>
                {product.name}
              </li>
            </ol>
          </nav>
          <ProductStockBadge available={selectedVariant?.available ?? false}>
            {getStorefrontStockLabel(selectedVariant?.branchStock, Boolean(user))}
          </ProductStockBadge>
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{product.name}</h1>
        {product.is_demo && <p className="text-xs text-muted-foreground">Sample listing</p>}
        {reviewCount > 0 ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <ProductReviewStars rating={averageRating} />
            <span className="font-semibold">{averageRating.toFixed(1)}</span>
            <span className="text-muted-foreground">({reviewCount} {reviewCount === 1 ? "review" : "reviews"})</span>
          </div>
        ) : <p className="text-sm text-muted-foreground">No reviews yet</p>}
        {selectedVariant && (
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <ProductPrice
              className="text-2xl"
              priceMinor={selectedVariant.price_minor}
              listPriceMinor={selectedVariant.list_price_minor}
              srpMinor={srp}
              strikeSrp
            />
            <p className="text-xs text-muted-foreground">SKU: {selectedVariant.sku}</p>
          </div>
        )}
        <p className="line-clamp-3 whitespace-pre-line text-sm leading-6 text-muted-foreground">
          {featuredProductDescription(product.description)}
        </p>
      </header>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">Store branch</legend>
        <div className="flex flex-wrap gap-2">
          {branches.length === 0 && <p className="text-sm text-muted-foreground">No active branches</p>}
          {orderedBranches.map((branch) => (
            <Button key={branch.id} type="button" variant={branchId === branch.id ? "default" : "outline"}
              aria-pressed={branchId === branch.id} className="min-h-10 whitespace-normal rounded-full px-3"
              onClick={() => changeBranch(branch.id)}>
              {branch.name}
            </Button>
          ))}
        </div>
      </fieldset>
      <fieldset className="space-y-2" disabled={!branchId}>
        <legend className="text-sm font-semibold">Variant</legend>
        <div className="flex flex-wrap gap-2">
          {branchVariants.length === 0 && <p className="text-sm text-muted-foreground">No variants listed</p>}
          {branchVariants.map((variant) => (
            <Button key={variant.id} type="button" variant={selectedVariant?.id === variant.id ? "default" : "outline"}
              aria-pressed={selectedVariant?.id === variant.id}
              className="min-h-10 flex-wrap gap-x-2 whitespace-normal rounded-full px-3"
              onClick={() => setVariantId(variant.id)}>
              <span className={variant.available ? undefined : "line-through"}>{variant.name}</span>
              <span className={variant.available ? "text-xs" : "text-xs opacity-75"}>
                {getStorefrontStockLabel(variant.branchStock, Boolean(user))}
              </span>
            </Button>
          ))}
        </div>
      </fieldset>
      {selectedVariant?.available ? (
        <div className="space-y-2">
          <AddToCartButton
            variantId={selectedVariant.id}
            branchId={branchId}
            maxQuantity={selectedVariant.branchStock?.stock ?? null}
            priceMinor={selectedVariant.price_minor}
          />
          <div className="space-y-1.5">
            <p className="text-xs leading-5 text-muted-foreground">
              Flexible payment &amp; installment options available:
            </p>
            <PaymentOptionBadges compact />
          </div>
        </div>
      ) : (
        <div className="grid gap-2">
          <Button type="button" variant="secondary" className="min-h-11 w-full" disabled>
            Out of Stock
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
      {selectedVariant && (
        <div className="space-y-2 rounded-xl border bg-card p-4">
          {visibleSpecs.length > 0 && (
              <dl aria-label="Specifications" className="grid grid-cols-2 gap-x-4 gap-y-2 border-b pb-3 text-sm sm:grid-cols-3">
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
      <p className="text-xs leading-5 text-muted-foreground">
        Availability can change until staff confirms your order. Stock is not reserved when an order is submitted.
      </p>
    </section>
  );
}
