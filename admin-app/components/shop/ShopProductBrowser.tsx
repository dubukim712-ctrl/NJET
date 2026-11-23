'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search } from 'lucide-react';
import type { CatalogProduct } from '@/data/commerce/catalog';
import { ProductCard } from '@/components/shop/ProductCard';
import { useShopFilters } from '@/components/shop/ShopFiltersContext';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';

type FilterOption = [string, string];

function ShopFiltersPanel({
  idPrefix,
  search,
  onSearchChange,
  category,
  onCategoryChange,
  subcategory,
  onSubcategoryChange,
  categories,
  subcategories,
  className,
}: {
  idPrefix: string;
  search: string;
  onSearchChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  subcategory: string;
  onSubcategoryChange: (value: string) => void;
  categories: FilterOption[];
  subcategories: FilterOption[];
  className: string;
}) {
  const searchId = `${idPrefix}-search`;

  return (
    <aside
      id={`${idPrefix}-panel`}
      aria-labelledby={`${idPrefix}-title`}
      className={`rounded-xl border bg-card p-4 ${className}`}
    >
      <h2 id={`${idPrefix}-title`} className="font-semibold">
        Find a product
      </h2>
      <div className="mt-4 space-y-4">
        <div>
          <label htmlFor={searchId} className="mb-1.5 block text-sm font-medium">
            Search
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              id={searchId}
              type="search"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Name or description"
              className="min-h-11 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>
        <Select
          id={`${idPrefix}-category`}
          label="Category"
          value={category}
          onValueChange={onCategoryChange}
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
          id={`${idPrefix}-subcategory`}
          label="Subcategory"
          value={subcategory}
          onValueChange={onSubcategoryChange}
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
  );
}

export function ShopProductBrowser({ products }: { products: CatalogProduct[] }) {
  const { open: filtersOpen, popoverRoot: filterPopoverRoot } = useShopFilters();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [subcategory, setSubcategory] = useState('all');
  const resultsHeadingRef = useRef<HTMLHeadingElement>(null);

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

  function clearFilters() {
    setSearch('');
    setDebouncedSearch('');
    setCategory('all');
    setSubcategory('all');
    resultsHeadingRef.current?.focus();
  }

  const filterPanelProps = {
    search,
    onSearchChange: setSearch,
    category,
    onCategoryChange: (value: string) => {
      setCategory(value);
      setSubcategory('all');
    },
    subcategory,
    onSubcategoryChange: setSubcategory,
    categories,
    subcategories,
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8">
      <div className="hidden lg:block">
        <ShopFiltersPanel
          idPrefix="shop-desktop"
          {...filterPanelProps}
          className="h-fit lg:sticky lg:top-24"
        />
      </div>

      <section aria-label="Products">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Explore</p>
            <h2 ref={resultsHeadingRef} tabIndex={-1} className="mt-1 text-2xl font-semibold tracking-tight">Products</h2>
          </div>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'items'}
          </p>
        </div>
        {filteredProducts.length ? (
          <div className="grid gap-4 min-[321px]:max-[768px]:grid-cols-2 min-[321px]:max-[768px]:gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                compactOnNarrow
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border bg-card px-5 py-12 text-center">
            <h3 className="font-semibold">No matching products</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Try another search or choose a different category.
            </p>
            <Button type="button" variant="outline" className="mt-4 min-h-11" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        )}
      </section>
      {filtersOpen &&
        filterPopoverRoot &&
        createPortal(
          <ShopFiltersPanel
            idPrefix="shop-mobile"
            {...filterPanelProps}
            className="max-h-[calc(100dvh-6rem)] overflow-y-auto shadow-xl"
          />,
          filterPopoverRoot,
        )}
    </div>
  );
}
