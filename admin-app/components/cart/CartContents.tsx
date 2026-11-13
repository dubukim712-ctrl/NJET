"use client";

import { useState } from "react";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/AuthProvider";
import { useCart } from "@/components/cart/CartProvider";
import { Button } from "@/components/ui/Button";
import { useCartVariantsQuery } from "@/data/commerce/catalog-client";
import { ProductImage } from "@/components/shop/ProductImage";
import { getAvailableQuantityLimit } from "@/data/cart";
import { formatPhp } from "@/lib/commerce";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

export function CartContents({
  compact = false,
  onNavigate,
}: {
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const { user } = useAuth();
  const { items, error: cartError, setQuantity, removeItem } = useCart();
  const [checkoutNotice, setCheckoutNotice] = useState<
    "sign-in" | "access" | null
  >(null);
  const {
    data: variants = [],
    error: queryError,
    isPending,
    refetch,
  } = useCartVariantsQuery(items.map((item) => item.variantId));
  const loading = items.length > 0 && isPending;
  const loadError =
    queryError instanceof Error
      ? queryError.message
      : queryError
        ? "Cart item details could not be loaded."
        : null;
  const variantById = new Map(variants.map((variant) => [variant.id, variant]));
  const cartItems = items.map((item) => ({
    ...item,
    variant: variantById.get(item.variantId) ?? null,
    maxQuantity: variantById.has(item.variantId)
      ? getAvailableQuantityLimit(
          variantById.get(item.variantId)?.stockByBranch ?? [],
        )
      : null,
  }));
  const subtotal = cartItems.reduce(
    (sum, item) => sum + (item.variant?.price_minor ?? 0) * item.quantity,
    0,
  );
  const unavailable = cartItems.some((item) => !item.variant);
  const out = cartItems.some((item) => item.quantity > (item.maxQuantity ?? 0));

  const changeQuantity = (
    variantId: string,
    quantity: number,
    maxQuantity: number | null,
  ) => {
    const result = setQuantity(variantId, quantity, maxQuantity);
    if (!result.success) toast.error(result.error);
  };
  const deleteItem = (variantId: string) => {
    const result = removeItem(variantId);
    if (!result.success) toast.error(result.error);
  };

  return (
    <div className={compact ? "space-y-5" : "mx-auto max-w-4xl space-y-6"}>
      {!compact && (
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            Your selection
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Shopping cart
          </h1>
        </header>
      )}

      {cartError && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {cartError}
        </p>
      )}
      {loadError && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <p>{loadError}</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-2"
            onClick={() => {
              void refetch();
            }}
          >
            Try again
          </Button>
        </div>
      )}

      {loading ? (
        <p
          className="rounded-xl border bg-card p-6 text-sm text-muted-foreground"
          role="status"
        >
          Loading your cart items...
        </p>
      ) : items.length === 0 ? (
        <section className="rounded-xl border bg-card px-5 py-10 text-center sm:px-8">
          <h2 className="text-lg font-semibold">Your cart is empty</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Browse products and add an item to get started.
          </p>
          <Button asChild className="mt-5">
            <Link href="/shop" onClick={onNavigate}>
              Browse products
            </Link>
          </Button>
        </section>
      ) : (
        <>
          <ul className={compact ? "divide-y" : "space-y-3"}>
            {cartItems.map((item) => (
              <li
                key={item.variantId}
                className={
                  compact
                    ? "flex gap-3 py-4 first:pt-0"
                    : "flex gap-4 rounded-xl border bg-card p-4"
                }
              >
                <ProductImage
                  path={
                    item.variant?.imagePath ??
                    item.variant?.productImagePath ??
                    null
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
                        {item.variant?.name ??
                          "This variant is no longer available"}
                      </p>
                      {item.variant && (
                        <p className="mt-1 text-sm">
                          {formatPhp(item.variant.price_minor)}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteItem(item.variantId)}
                      className="h-fit rounded p-1 text-muted-foreground hover:bg-accent hover:text-destructive"
                      aria-label={`Remove ${item.variant?.productName ?? "unavailable item"}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                  {item.variant ? (
                    <>
                      <div className="mt-2 flex w-fit items-center rounded-md border">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Decrease quantity"
                          disabled={item.quantity <= 1}
                          onClick={() =>
                            changeQuantity(
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
                          size="icon"
                          aria-label="Increase quantity"
                          disabled={
                            item.quantity >= (item.maxQuantity ?? 99) ||
                            item.quantity >= 99
                          }
                          onClick={() =>
                            changeQuantity(
                              item.variantId,
                              item.quantity + 1,
                              item.maxQuantity,
                            )
                          }
                        >
                          <Plus className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                      {item.maxQuantity !== null &&
                        item.quantity >= item.maxQuantity && (
                          <p
                            className={`mt-1 text-xs ${
                              item.quantity > item.maxQuantity
                                ? "text-destructive"
                                : "text-muted-foreground"
                            }`}
                            role={
                              item.quantity > item.maxQuantity
                                ? "alert"
                                : undefined
                            }
                          >
                            {out
                              ? "Currently out of stock. Remove this item or wait for restock."
                              : item.quantity > item.maxQuantity
                                ? `Only ${item.maxQuantity} can be ordered from a single branch. Reduce the quantity to continue.`
                                : "Maximum available from a single branch."}
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
            ))}
          </ul>

          <aside className="rounded-xl border bg-card p-5">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span className="font-semibold">{formatPhp(subtotal)}</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Final stock, delivery fees, and payment due are confirmed at
              checkout.
            </p>
            {unavailable || loadError || out ? (
              <Button type="button" className="mt-4 w-full" disabled>
                Remove unavailable items to continue
              </Button>
            ) : (
              <Button asChild className="mt-4 w-full">
                <Link
                  href="/checkout"
                  onClick={(event) => {
                    if (!user) {
                      event.preventDefault();
                      setCheckoutNotice("sign-in");
                      return;
                    }
                    if (!hasPermission(user, PERMISSIONS.storefrontAccess)) {
                      event.preventDefault();
                      setCheckoutNotice("access");
                      return;
                    }
                    onNavigate?.();
                  }}
                >
                  Continue to checkout
                </Link>
              </Button>
            )}
            {checkoutNotice && (
              <div
                className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3"
                role="alert"
              >
                <p className="text-sm">
                  {checkoutNotice === "sign-in"
                    ? "You must sign in before checking out."
                    : "This account does not have permission to place customer orders."}
                </p>
                {checkoutNotice === "sign-in" && (
                  <div className="mt-2 flex flex-wrap gap-3 text-sm font-medium">
                    <Link
                      href="/login?redirect=%2Fcheckout"
                      onClick={onNavigate}
                      className="text-primary underline underline-offset-4"
                    >
                      Sign in
                    </Link>
                    <Link
                      href="/register"
                      onClick={onNavigate}
                      className="text-primary underline underline-offset-4"
                    >
                      Create an account
                    </Link>
                  </div>
                )}
              </div>
            )}
          </aside>
        </>
      )}
    </div>
  );
}
