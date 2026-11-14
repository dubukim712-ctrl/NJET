"use client";

import { useState } from "react";
import { Pencil, Plus, Search } from "lucide-react";
import { VariantEditor } from "@/components/admin/commerce/VariantEditor";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { formatPhp } from "@/lib/commerce";
import type { Database } from "@/types/database";

type Product = Database["public"]["Tables"]["products"]["Row"];
type Variant = Database["public"]["Tables"]["product_variants"]["Row"];
type Category = Database["public"]["Tables"]["product_categories"]["Row"];

export function ProductVariantsTab({
  products,
  variants,
  categories,
  canManageProducts,
}: {
  products: Product[];
  variants: Variant[];
  categories: Category[];
  canManageProducts: boolean;
}) {
  const [selected, setSelected] = useState<{
    product: Product;
    variant?: Variant;
  } | null>(null);
  const closeModal = () => setSelected(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const categoryById = new Map(
    categories.map((category) => [category.id, category]),
  );
  const normalizedSearch = search.trim().toLowerCase();
  const filteredProducts = products.flatMap((product) => {
    if (categoryFilter !== "all" && product.category_id !== categoryFilter)
      return [];
    const categoryName = categoryById.get(product.category_id)?.name ?? "";
    const productMatches = [product.name, product.slug, categoryName].some(
      (value) => value.toLowerCase().includes(normalizedSearch),
    );
    const productVariants = variants.filter(
      (variant) => variant.product_id === product.id,
    );
    const filteredVariants =
      !normalizedSearch || productMatches
        ? productVariants
        : productVariants.filter((variant) =>
            [
              variant.name,
              variant.sku,
              ...Object.entries(variant.specifications ?? {}).flat(),
            ].some((value) => value.toLowerCase().includes(normalizedSearch)),
          );
    if (normalizedSearch && !productMatches && !filteredVariants.length)
      return [];
    return [{ product, variants: filteredVariants }];
  });
  const filteredVariantCount = filteredProducts.reduce(
    (count, entry) => count + entry.variants.length,
    0,
  );

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-xl font-semibold">Product variants</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage variant names, pricing, images, and specifications separately
          from the catalog.
        </p>
      </header>
      {!products.length ? (
        <p className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">
          Create a product before adding variants.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,0.4fr)]">
            <Input
              label="Search variants"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Product, variant, SKU, or specification"
              leadingIcon={<Search className="size-4" aria-hidden="true" />}
            />
            <Select
              label="Category"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </div>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            Showing {filteredVariantCount} variants in {filteredProducts.length}{" "}
            products
          </p>
          {filteredProducts.length ? (
            filteredProducts.map(({ product, variants: productVariants }) => {
              return (
                <section
                  key={product.id}
                  className="rounded-xl border bg-card p-4 sm:p-5"
                >
                  <header className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{product.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {productVariants.length}{" "}
                        {productVariants.length === 1 ? "variant" : "variants"}
                      </p>
                    </div>
                    {canManageProducts && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setSelected({ product })}
                      >
                        <Plus className="mr-2 size-4" aria-hidden="true" />
                        Add variant
                      </Button>
                    )}
                  </header>
                  {productVariants.length > 0 && (
                    <ul className="mt-4 divide-y rounded-lg border">
                      {productVariants.map((variant) => (
                        <li
                          key={variant.id}
                          className="flex flex-wrap items-center justify-between gap-3 p-3"
                        >
                          <div className="min-w-0">
                            <p className="font-medium">
                              {variant.name} · {formatPhp(variant.price_minor)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {variant.sku} · Reservation{" "}
                              {formatPhp(variant.reservation_minor)} ·{" "}
                              Storefront Home Credit downpayment{" "}
                              {formatPhp(variant.home_credit_downpayment_minor)}{" "}
                              ·{" "}
                              {variant.active ? (
                                <span className="bg-primary/90 text-primary-foreground px-2 py-1 text-xs rounded">
                                  Active
                                </span>
                              ) : (
                                <span className="bg-muted text-muted-foreground px-2 py-1 text-xs rounded">
                                  Inactive
                                </span>
                              )}
                            </p>
                            {variant.specifications &&
                              Object.keys(variant.specifications).length >
                                0 && (
                                <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                                  {Object.entries(variant.specifications).map(
                                    ([name, value]) => (
                                      <div key={name} className="flex gap-1">
                                        <dt className="font-medium">{name}:</dt>
                                        <dd className="text-muted-foreground">
                                          {value}
                                        </dd>
                                      </div>
                                    ),
                                  )}
                                </dl>
                              )}
                          </div>
                          {canManageProducts && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setSelected({ product, variant })}
                            >
                              <Pencil
                                className="mr-2 size-4"
                                aria-hidden="true"
                              />
                              Edit variant
                            </Button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })
          ) : (
            <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
              No variants match this search and category.
            </p>
          )}
        </div>
      )}
      <Modal
        open={selected !== null}
        title={selected?.variant ? "Edit variant" : "Add variant"}
        size="wide"
        onClose={closeModal}
      >
        {selected && (
          <VariantEditor
            key={selected.variant?.id ?? `${selected.product.id}-new`}
            productId={selected.product.id}
            isEbike={selected.product.product_type === "ebike"}
            productImagePath={selected.product.image_path}
            variant={selected.variant}
            onCancel={closeModal}
            onSaved={closeModal}
          />
        )}
      </Modal>
    </div>
  );
}
