'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { CatalogProduct } from '@/data/commerce/catalog';
import { ProductCard } from '@/components/shop/ProductCard';
import { Select } from '@/components/ui/Select';

export function ShopProductBrowser({ products }: { products: CatalogProduct[] }) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [subcategory, setSubcategory] = useState('all');

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 250);
    return () => window.clearTimeout(timeout);
  }, [search]);

  const categories = useMemo(() => {
    const byId = new Map<string, string>();
    for (const product of products) {
      const id = product.category_id ?? 'uncategorized';
      byId.set(id, product.categoryName ?? 'Uncategorized');
    }
    return [...byId].sort((a, b) => a[1].localeCompare(b[1]));
  }, [products]);

  const subcategories = useMemo(() => {
    const byId = new Map<string, string>();
    for (const product of products) {
      if (category !== 'all' && (product.category_id ?? 'uncategorized') !== category) continue;
      const id = product.subcategory_id ?? 'uncategorized';
      byId.set(id, product.subcategoryName ?? 'Uncategorized');
    }
    return [...byId].sort((a, b) => a[1].localeCompare(b[1]));
  }, [category, products]);

  const filteredProducts = useMemo(
    () =>
      products.filter((product) => {
        const matchesCategory =
          category === 'all' || (product.category_id ?? 'uncategorized') === category;
        const matchesSubcategory =
          subcategory === 'all' ||
          (product.subcategory_id ?? 'uncategorized') === subcategory;
        const searchableText = [
          product.name,
          product.description,
          product.categoryName,
          product.subcategoryName,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return matchesCategory && matchesSubcategory && searchableText.includes(debouncedSearch);
      }),
    [category, debouncedSearch, products, subcategory]
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8">
      <aside className="h-fit rounded-xl border bg-card p-4 lg:sticky lg:top-24">
        <h2 className="font-semibold">Find a product</h2>
        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="shop-search" className="mb-1.5 block text-sm font-medium">
              Search
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                id="shop-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Name or description"
                className="min-h-11 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>
          <Select
            id="shop-category"
            label="Category"
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              setSubcategory('all');
            }}
            className="bg-background"
          >
            <option value="all">All categories</option>
            {categories.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </Select>
          <Select
            id="shop-subcategory"
            label="Subcategory"
            value={subcategory}
            onChange={(event) => setSubcategory(event.target.value)}
            className="bg-background"
          >
            <option value="all">All subcategories</option>
            {subcategories.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </Select>
        </div>
      </aside>

      <section aria-label="Products">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Explore</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">Products</h2>
          </div>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'items'}
          </p>
        </div>
        {filteredProducts.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border bg-card px-5 py-12 text-center">
            <h3 className="font-semibold">No matching products</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Try another search or choose a different category.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
