'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { WalkInCatalogItem } from '@/data/commerce/walk-in-sales';
import { formatPhp, productTypeLabel } from '@/lib/commerce';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ProductImage } from '@/components/shop/ProductImage';

type ProductGroup = Pick<
  WalkInCatalogItem,
  'product_id' | 'product_name' | 'product_type' | 'product_image_path'
> & {
  variants: WalkInCatalogItem[];
};

export function WalkInProductCatalog({
  products,
  cartQuantities,
  disabled,
  onAdd,
}: {
  products: WalkInCatalogItem[];
  cartQuantities: Map<string, number>;
  disabled: boolean;
  onAdd: (product: WalkInCatalogItem) => void;
}) {
  const [search, setSearch] = useState('');
  const visibleProducts = useMemo(() => {
    const groups = new Map<string, ProductGroup>();
    for (const product of products) {
      const group = groups.get(product.product_id) ?? {
        product_id: product.product_id,
        product_name: product.product_name,
        product_type: product.product_type,
        product_image_path: product.product_image_path,
        variants: [],
      };
      group.variants.push(product);
      groups.set(product.product_id, group);
    }

    const term = search.trim().toLocaleLowerCase();
    return [...groups.values()].filter((product) =>
      !term || [
        product.product_name,
        ...product.variants.flatMap((variant) => [variant.variant_name, variant.sku]),
      ].some((value) => value.toLocaleLowerCase().includes(term))
    );
  }, [products, search]);

  return (
    <section className="space-y-4 rounded-xl border bg-card p-4 sm:p-5">
      <header>
        <h2 className="text-lg font-semibold">Product catalog</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Select a variant to add it to this sale.
        </p>
      </header>
      <Input
        label="Search products"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Product, variant, or SKU"
        leadingIcon={<Search className="size-4" aria-hidden="true" />}
      />
      {visibleProducts.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {visibleProducts.map((product) => (
            <article
              key={product.product_id}
              className="flex min-w-0 flex-col gap-3 rounded-lg border p-3"
            >
              <div className="flex items-start gap-3">
                <ProductImage
                  path={product.product_image_path}
                  alt={product.product_name}
                  className="w-24 shrink-0 rounded-md"
                />
                <div className="min-w-0">
                  <h3 className="font-semibold">{product.product_name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {productTypeLabel(product.product_type)}
                  </p>
                </div>
              </div>
              <ul className="space-y-2">
                {product.variants.map((variant) => {
                  const quantity = cartQuantities.get(variant.variant_id) ?? 0;
                  const unavailable = variant.stock <= quantity || quantity >= 99;
                  return (
                    <li
                      key={variant.variant_id}
                      className="flex min-w-0 items-center justify-between gap-2 border-t pt-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{variant.variant_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {variant.sku} · {formatPhp(variant.price_minor)}
                        </p>
                        <p className={`text-xs ${variant.stock > quantity ? 'text-muted-foreground' : 'text-destructive'}`}>
                          {Math.max(variant.stock - quantity, 0)} available
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={disabled || unavailable}
                        onClick={() => onAdd(variant)}
                      >
                        Add
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </article>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
          {products.length
            ? 'No products match your search.'
            : 'No active products are available for this branch.'}
        </p>
      )}
      <p className="text-xs text-muted-foreground" aria-live="polite">
        Showing up to {products.length} active variants.
      </p>
    </section>
  );
}
