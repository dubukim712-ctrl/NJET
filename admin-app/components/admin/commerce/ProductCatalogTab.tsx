"use client";

import { useState } from "react";
import { MoreVertical, Pencil, Plus, Search } from "lucide-react";
import { ProductCategoryManager } from "@/components/admin/commerce/ProductCategoryManager";
import { ProductEditor } from "@/components/admin/commerce/ProductEditor";
import { ProductSubcategoryManager } from "@/components/admin/commerce/ProductSubcategoryManager";
import { Button } from "@/components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import type { Database } from "@/types/database";

type Product = Database["public"]["Tables"]["products"]["Row"];
type Variant = Database["public"]["Tables"]["product_variants"]["Row"];
type Category = Database["public"]["Tables"]["product_categories"]["Row"];
type Subcategory = Database["public"]["Tables"]["product_subcategories"]["Row"];

type CatalogModal = { kind: "product"; product: Product } | null;

export function ProductCatalogTab({
  products,
  variants,
  categories,
  subcategories,
  canManageProducts,
  onCreateProduct,
}: {
  products: Product[];
  variants: Variant[];
  categories: Category[];
  subcategories: Subcategory[];
  canManageProducts: boolean;
  onCreateProduct: () => void;
}) {
  const [modal, setModal] = useState<CatalogModal>(null);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [subcategoryManagerOpen, setSubcategoryManagerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const closeModal = () => setModal(null);
  const categoryById = new Map(
    categories.map((category) => [category.id, category]),
  );
  const subcategoryById = new Map(
    subcategories.map((subcategory) => [subcategory.id, subcategory]),
  );
  const normalizedSearch = search.trim().toLowerCase();
  const filteredProducts = products.filter((product) => {
    const category = categoryById.get(product.category_id);
    const subcategory = product.subcategory_id
      ? subcategoryById.get(product.subcategory_id)
      : null;
    const matchesCategory =
      categoryFilter === "all" || product.category_id === categoryFilter;
    const matchesSearch =
      !normalizedSearch ||
      [product.name, product.slug, category?.name, subcategory?.name].some(
        (value) => value?.toLowerCase().includes(normalizedSearch),
      );
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Product catalog</h2>
        {canManageProducts && (
          <>
            <div className="hidden flex-wrap gap-2 sm:flex">
              <ProductCategoryManager
                categories={categories}
                open={categoryManagerOpen}
                onOpenChange={setCategoryManagerOpen}
              />
              <ProductSubcategoryManager
                categories={categories}
                subcategories={subcategories}
                open={subcategoryManagerOpen}
                onOpenChange={setSubcategoryManagerOpen}
              />
              <Button type="button" size="sm" onClick={onCreateProduct}>
                <Plus className="mr-2 size-4" aria-hidden="true" />
                Create product
              </Button>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="h-11 w-11 sm:hidden"
                  aria-label="Product catalog actions"
                >
                  <MoreVertical className="size-5" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  className="min-h-11 cursor-pointer"
                  onSelect={() => setCategoryManagerOpen(true)}
                >
                  Manage main categories
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="min-h-11 cursor-pointer"
                  onSelect={() => setSubcategoryManagerOpen(true)}
                >
                  Manage subcategories
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="min-h-11 cursor-pointer"
                  onSelect={onCreateProduct}
                >
                  <Plus className="mr-2 size-4" aria-hidden="true" />
                  Create product
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>

      {!products.length ? (
        <p className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">
          No products have been added yet.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,0.4fr)]">
            <Input
              label="Search products"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name, slug, or subcategory"
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
            Showing {filteredProducts.length} of {products.length} products
          </p>
          {filteredProducts.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map((product) => {
                const variantCount = variants.filter(
                  (variant) => variant.product_id === product.id,
                ).length;
                const categoryName =
                  categoryById.get(product.category_id)?.name ??
                  "Uncategorized";
                return (
                  <article
                    key={product.id}
                    className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:p-5"
                  >
                    <header className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold">{product.name}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          /{product.slug} · {categoryName} ·{" "}
                          {product.active ? "Active" : "Inactive"}
                          {product.is_demo && " · sample"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {product.subcategory_id
                            ? (subcategoryById.get(product.subcategory_id)
                                ?.name ?? "No subcategory")
                            : "No subcategory"}
                        </p>
                      </div>
                      {canManageProducts && (
                        <details className="relative shrink-0">
                          <summary
                            aria-label={`Actions for ${product.name}`}
                            className="flex size-9 list-none cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden"
                          >
                            <MoreVertical
                              className="size-5"
                              aria-hidden="true"
                            />
                          </summary>
                          <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-lg border bg-card p-1 shadow-lg">
                            <button
                              type="button"
                              className="flex min-h-9 w-full items-center gap-2 rounded-md px-3 text-left text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              onClick={(event) => {
                                event.currentTarget
                                  .closest("details")
                                  ?.removeAttribute("open");
                                setModal({ kind: "product", product });
                              }}
                            >
                              <Pencil className="size-4" aria-hidden="true" />
                              Edit product
                            </button>
                          </div>
                        </details>
                      )}
                    </header>
                    <p className="text-sm font-medium text-muted-foreground">
                      {variantCount}{" "}
                      {variantCount === 1 ? "variant" : "variants"}
                    </p>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
              No products match this search and category.
            </p>
          )}
        </div>
      )}
      <Modal
        open={modal !== null}
        title="Edit product"
        size="wide"
        onClose={closeModal}
      >
        {modal?.kind === "product" ? (
          <ProductEditor
            key={modal.product.id}
            product={modal.product}
            categories={categories}
            subcategories={subcategories}
            onCancel={closeModal}
            onSaved={closeModal}
          />
        ) : null}
      </Modal>
    </div>
  );
}
