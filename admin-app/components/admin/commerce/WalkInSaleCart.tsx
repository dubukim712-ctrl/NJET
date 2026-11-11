'use client';

import { Minus, Plus, Trash2 } from 'lucide-react';
import type {
  WalkInCartLine,
  WalkInCatalogItem,
} from '@/data/commerce/walk-in-sales';
import { formatPhp } from '@/lib/commerce';
import { Button } from '@/components/ui/Button';

export function WalkInSaleCart({
  products,
  cart,
  totalMinor,
  disabled,
  onQuantityChange,
  onRemove,
}: {
  products: WalkInCatalogItem[];
  cart: WalkInCartLine[];
  totalMinor: number;
  disabled: boolean;
  onQuantityChange: (variantId: string, quantity: number) => void;
  onRemove: (variantId: string) => void;
}) {
  const productByVariant = new Map(
    products.map((product) => [product.variant_id, product])
  );

  return (
    <section className="space-y-4 rounded-xl border bg-card p-4 sm:p-5">
      <header className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold">Processing cart</h2>
        <span className="text-sm text-muted-foreground">
          {cart.reduce((sum, item) => sum + item.quantity, 0)} items
        </span>
      </header>
      {cart.length ? (
        <ul className="divide-y">
          {cart.map((line) => {
            const product = productByVariant.get(line.variantId);
            return (
              <li key={line.variantId} className="space-y-2 py-3 first:pt-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {product?.product_name ?? 'Product unavailable'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {product
                        ? `${product.variant_name} · ${product.sku}`
                        : 'Remove this item before completing the sale.'}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={disabled}
                    aria-label={`Remove ${product?.product_name ?? 'unavailable product'}`}
                    onClick={() => onRemove(line.variantId)}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                </div>
                {product && (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        disabled={disabled || line.quantity <= 1}
                        aria-label={`Decrease ${product.product_name} quantity`}
                        onClick={() =>
                          onQuantityChange(line.variantId, line.quantity - 1)
                        }
                      >
                        <Minus className="size-4" aria-hidden="true" />
                      </Button>
                      <span className="min-w-8 text-center text-sm tabular-nums">
                        {line.quantity}
                      </span>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        disabled={disabled || line.quantity >= product.stock || line.quantity >= 99}
                        aria-label={`Increase ${product.product_name} quantity`}
                        onClick={() =>
                          onQuantityChange(line.variantId, line.quantity + 1)
                        }
                      >
                        <Plus className="size-4" aria-hidden="true" />
                      </Button>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">
                      {formatPhp(product.price_minor * line.quantity)}
                    </span>
                  </div>
                )}
                {product && line.quantity > product.stock && (
                  <p className="text-sm text-destructive" role="alert">
                    Only {product.stock} available at this branch.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
          Add products from the catalog to start a sale.
        </p>
      )}
      <div className="flex justify-between border-t pt-3 font-semibold">
        <span>Total</span>
        <span className="tabular-nums">{formatPhp(totalMinor)}</span>
      </div>
    </section>
  );
}
