"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/AuthProvider";
import { useCart } from "@/components/cart/CartProvider";
import { Button } from "@/components/ui/Button";
import { useCartVariantsQuery } from "@/data/commerce/catalog-client";
import { CartItemRow } from "@/components/cart/CartItemRow";
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
              <CartItemRow
                key={item.variantId}
                item={item}
                compact={compact}
                outOfStock={out}
                onRemove={deleteItem}
                onQuantityChange={changeQuantity}
              />
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
            {(unavailable && out) || loadError ? (
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
