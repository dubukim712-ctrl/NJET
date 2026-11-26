"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ProductImage } from "@/components/shop/ProductImage";
import { ProductPrice } from "@/components/shop/ProductPrice";
import type { CartVariant } from "@/data/commerce/catalog-client";
import { MAX_CART_QUANTITY, type CartItem } from "@/data/cart";
import { useCartQuantityAvailability } from "@/data/commerce/cart-quantity-availability";

type CartDisplayItem = CartItem & {
  variant: CartVariant | null;
  maxQuantity: number | null;
};

export function CartItemRow({
  item,
  compact,
  outOfStock,
  onRemove,
  onQuantityChange,
}: {
  item: CartDisplayItem;
  compact: boolean;
  outOfStock: boolean;
  onRemove: (variantId: string) => void;
  onQuantityChange: (
    variantId: string,
    quantity: number,
    maxQuantity: number | null,
  ) => void;
}) {
  const nextQuantity = item.quantity + 1;
  const needsAvailability = Boolean(item.variant) && item.maxQuantity === null && nextQuantity <= MAX_CART_QUANTITY;
  const availability = useCartQuantityAvailability(item.variantId, item.branchId, nextQuantity, needsAvailability);
  const atLimit = nextQuantity > (item.maxQuantity ?? MAX_CART_QUANTITY) || (needsAvailability && availability.data === false);
  const cannotIncrease = atLimit || (needsAvailability && availability.data !== true);

  return (
    <li
      className={
        compact
          ? "flex gap-3 py-4 first:pt-0"
          : "flex gap-4 rounded-xl border bg-card p-4"
      }
    >
      <ProductImage
        path={
          item.variant?.imagePath ?? item.variant?.productImagePath ?? null
        }
        alt={
          item.variant
            ? `${item.variant.productName} - ${item.variant.name}`
            : "Unavailable product"
        }
        className="h-16 w-16 shrink-0 rounded-lg aspect-square sm:h-20 sm:w-20"
      />
      <div className="min-w-0 flex-1">
        <div className="flex justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate font-semibold">
              {item.variant?.productName ?? "Unavailable product"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {item.variant?.name ?? "This variant is no longer available"}
            </p>
            {item.variant && (
              <ProductPrice
                priceMinor={item.variant.price_minor}
                listPriceMinor={item.variant.list_price_minor}
                className="mt-1 text-sm"
              />
            )}
          </div>
          <Button variant="ghost" size={null}
            type="button"
            onClick={() => onRemove(item.variantId)}
            className="size-11 shrink-0 rounded-full text-muted-foreground hover:text-destructive"
            aria-label={`Remove ${item.variant?.productName ?? "unavailable item"}`}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
        {item.variant ? (
          <>
            <div className="mt-2 flex w-fit items-center rounded-md border">
              <Button
                type="button"
                variant="ghost"
                size={null} className="size-11"
                aria-label="Decrease quantity"
                disabled={item.quantity <= 1}
                onClick={() =>
                  onQuantityChange(
                    item.variantId,
                    item.quantity - 1,
                    item.maxQuantity,
                  )
                }
              >
                <Minus className="h-4 w-4" aria-hidden="true" />
              </Button>
              <span
                className="min-w-8 text-center text-sm"
                aria-live="polite"
              >
                {item.quantity}
              </span>
              <Button
                type="button"
                variant="ghost"
                size={null} className="size-11"
                aria-label="Increase quantity"
                disabled={cannotIncrease}
                onClick={() =>
                  onQuantityChange(item.variantId, nextQuantity, item.maxQuantity ?? nextQuantity)
                }
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
            {needsAvailability && availability.isError && (
              <Button variant="ghost" size={null} type="button" className="mt-1 min-h-11 px-1 text-xs underline" onClick={() => void availability.refetch()}>
                Retry availability check
              </Button>
            )}
            {atLimit && (
                <p
                  className={`mt-1 text-xs ${
                    item.maxQuantity !== null && item.quantity > item.maxQuantity
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }`}
                  role={
                    item.maxQuantity !== null && item.quantity > item.maxQuantity ? "alert" : undefined
                  }
                >
                  {outOfStock
                    ? "Currently out of stock. Remove this item or wait for restock."
                    : item.maxQuantity !== null && item.quantity > item.maxQuantity
                      ? "Reduce the quantity to continue."
                      : "Maximum available quantity in cart."}
                </p>
              )}
          </>
        ) : (
          <p className="mt-2 text-xs text-destructive">
            Remove this item to continue.
          </p>
        )}
      </div>
    </li>
  );
}
