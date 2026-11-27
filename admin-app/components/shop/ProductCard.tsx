"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { getStorefrontStockLabel } from "@/data/commerce/storefront-stock-label";
import Link from "next/link";
import { ArrowUpRight, Star } from "lucide-react";
import type { CatalogProduct } from "@/data/commerce/catalog";
import { ProductImage } from "@/components/shop/ProductImage";
import { ProductStockBadge } from "@/components/shop/ProductStockBadge";
import { getStartingVariant } from "@/data/commerce/storefront-starting-variant";
import {
  featuredProductDescription,
  featuredSpecification,
  isSrpLabel,
} from "@/lib/storefront-featured-copy";
import { formatPhp } from "@/lib/commerce";
import { ProductPrice } from "@/components/shop/ProductPrice";

export function ProductCard({
  product,
  compactOnNarrow = false,
  loading,
  featuredBranches,
  stockBranchName,
}: {
  product: CatalogProduct;
  compactOnNarrow?: boolean;
  loading?: "eager" | "lazy";
  featuredBranches?: { id: string; name: string }[];
  stockBranchName?: string;
}) {
  const { user } = useAuth();
  const startingVariant = getStartingVariant(product);
  const specifications = Object.entries(startingVariant?.specifications ?? {});
  const usefulSpecs = specifications.filter(([label]) =>
    /motor|power|range/i.test(label),
  );
  const specs = (
    usefulSpecs.length
      ? usefulSpecs
      : specifications.filter(([label]) => !isSrpLabel(label))
  ).slice(0, 2);
  const srp = specifications.find(([label]) => isSrpLabel(label));
  if (srp) specs.push(srp);
  const stockedBranches =
    featuredBranches?.filter((branch) =>
      product.variants.some((variant) =>
        variant.stockByBranch.some(
          (stock) => stock.branchId === branch.id && stock.available,
        ),
      ),
    ) ?? [];
  const monthly =
    product.product_type === "ebike" &&
    startingVariant &&
    !product.is_demo &&
    startingVariant.price_minor > 0
      ? Math.round(
          Math.max(
            0,
            startingVariant.price_minor -
              startingVariant.home_credit_downpayment_minor,
          ) / 24,
        )
      : null;
  const { averageRating, reviewCount } = product.ratingSummary;
  const stockLabel = getStorefrontStockLabel(
    product.stockSummary,
    Boolean(user),
  );
  const showsTotal =
    Boolean(user) &&
    product.stockSummary.available &&
    product.stockSummary.stock !== null;
  const stockContext = stockBranchName
    ? ` at ${stockBranchName}`
    : showsTotal
      ? " across branches"
      : "";

  return (
    <Link
      href={`/shop/view-product/${product.slug}`}
      aria-label={`View product: ${product.name}. ${
        reviewCount
          ? `${averageRating.toFixed(1)} out of 5 stars from ${reviewCount} ${
              reviewCount === 1 ? "review" : "reviews"
            }.`
          : "No reviews yet."
      } ${stockLabel}${stockContext}.`}
      title="Open product details"
      className={`group block overflow-hidden rounded-xl border border-foreground/20 bg-card text-foreground transition hover:border-foreground/40 hover:shadow-md motion-safe:hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        compactOnNarrow ? "min-[320px]:max-[768px]:rounded-lg" : ""
      }`}
    >
      <article>
        <div className="relative">
          <ProductImage
            path={product.image_path}
            alt={product.name}
            loading={loading}
          />
          <span
            aria-hidden="true"
            className={`absolute right-3 top-3 inline-flex size-10 items-center justify-center rounded-full bg-card/95 text-foreground shadow-sm ring-1 ring-border transition-colors group-hover:bg-accent group-hover:text-accent-foreground group-focus-visible:bg-accent group-focus-visible:text-accent-foreground ${
              compactOnNarrow
                ? "min-[320px]:max-[768px]:right-2 min-[320px]:max-[768px]:top-2 min-[320px]:max-[768px]:size-8"
                : ""
            }`}
          >
            <ArrowUpRight className="size-5" />
          </span>
        </div>
        <div
          className={`space-y-3 p-4 sm:p-5 ${
            compactOnNarrow
              ? "min-[320px]:max-[768px]:space-y-2 min-[320px]:max-[768px]:p-2.5"
              : ""
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span
              className={`rounded-full bg-secondary px-2.5 py-1 text-xs font-medium capitalize text-secondary-foreground ${
                compactOnNarrow
                  ? "min-[320px]:max-[768px]:px-2 min-[375px]:max-[768px]:text-[8px]"
                  : ""
              }`}
            >
              {product.categoryName ?? "Uncategorized"}
              {product.subcategoryName && ` · ${product.subcategoryName}`}
            </span>
            {product.is_demo && (
              <span className="text-xs font-medium text-muted-foreground">
                Sample listing
              </span>
            )}
            <ProductStockBadge available={product.stockSummary.available}>
              {stockLabel}
            </ProductStockBadge>
          </div>
          <div>
            {reviewCount > 0 ? (
              <div className=" flex flex-wrap items-center gap-x-1.5 min-[375px]:max-[768px]:text-[8px] text-xs">
                <span
                  className="inline-flex items-center gap-0.5 text-[#d99b26]"
                  aria-hidden="true"
                >
                  {[1, 2, 3, 4, 5].map((value) => (
                    <Star
                      key={value}
                      className={`size-2.5 sm:size-3 ${averageRating >= value ? "fill-current" : ""}`}
                    />
                  ))}
                </span>
                <span className="whitespace-nowrap">
                  <span className="font-medium">
                    {averageRating.toFixed(1)}
                  </span>{" "}
                  <span className="text-muted-foreground">({reviewCount})</span>
                </span>
              </div>
            ) : (
              <p className="mt-1 min-[375px]:max-[768px]:text-[8px] text-xs text-muted-foreground">
                No reviews yet
              </p>
            )}
            <h2
              className={`font-semibold text-lg ${
                compactOnNarrow
                  ? "min-[375px]:max-[768px]:text-sm min-[375px]:max-[768px]:leading-5"
                  : ""
              }`}
            >
              {product.name}
            </h2>

            <p
              className={`mt-1 line-clamp-2 text-sm leading-5 text-muted-foreground ${
                compactOnNarrow
                  ? "min-[375px]:max-[768px]:text-[10px] min-[375px]:max-[768px]:leading-4"
                  : ""
              }`}
            >
              {featuredProductDescription(product.description)}
            </p>
          </div>

          {/* {stockedBranches.length > 0 && (
            <p className="text-xs leading-5 text-muted-foreground">In stock at {stockedBranches.map((branch) => branch.name).join(', ')}</p>
          )} */}
          <div
            className={`flex min-h-10 min-w-0 items-center text-sm font-semibold ${
              compactOnNarrow
                ? "min-[320px]:max-[768px]:min-h-8 min-[320px]:max-[768px]:text-xs"
                : ""
            }`}
          >
            {startingVariant === null ? (
              "Price unavailable"
            ) : (
              <div className="flex flex-col items-start">
                <span className="text-[10px] font-medium leading-3 text-muted-foreground sm:text-xs sm:leading-4">
                  {featuredBranches ? "Cash price from" : "From"}
                </span>
                <ProductPrice
                  priceMinor={startingVariant.price_minor}
                  listPriceMinor={startingVariant.list_price_minor}
                  className="text-xl text-foreground"
                />
              </div>
            )}
          </div>

          {monthly !== null && (
            <p className="text-xs font-medium text-muted-foreground">
              Est. {formatPhp(monthly)}/mo · 24 months before fees and interest
            </p>
          )}
        </div>
      </article>
    </Link>
  );
}
