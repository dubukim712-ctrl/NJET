'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import type { CatalogProduct } from '@/data/commerce/catalog';
import { ProductCard } from '@/components/shop/ProductCard';
import { useShopFilters } from '@/components/shop/ShopFiltersContext';
import { Button } from '@/components/ui/Button';
import { ShopFiltersPanel, type ShopSort } from '@/components/shop/ShopFiltersPanel';
import { getStartingVariant } from '@/data/commerce/storefront-starting-variant';

export function ShopProductBrowser({ products }: { products: CatalogProduct[] }) {
  const { open: filtersOpen, popoverRoot: filterPopoverRoot } = useShopFilters();
  const params = useSearchParams();
  const inStockOnly = params.get('inStock') === '1';
  const sortParam = params.get('sort');
  const sort: ShopSort = sortParam === 'price-asc' || sortParam === 'price-desc' ? sortParam : 'featured';
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
    () => {
      const matches = products.filter((product) => {
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
        return matchesCategory && matchesSubcategory
          && (!inStockOnly || product.stockSummary.available)
          && searchableText.includes(debouncedSearch);
      });
      if (sort === 'featured') return matches;
      return matches
        .map((product) => ({ product, price: getStartingVariant(product)?.price_minor }))
        .sort((a, b) => {
          if (a.price === undefined) return b.price === undefined ? 0 : 1;
          if (b.price === undefined) return -1;
          return sort === 'price-asc' ? a.price - b.price : b.price - a.price;
        })
        .map(({ product }) => product);
    },
    [category, debouncedSearch, inStockOnly, products, sort, subcategory]
  );

  function updateCatalogUrl(changes: Partial<Record<'inStock' | 'sort', string | null>>) {
    const url = new URL(window.location.href);
    for (const [key, value] of Object.entries(changes)) {
      if (value) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    }
    window.history.replaceState(null, '', url);
  }

  function clearFilters() {
    updateCatalogUrl({ inStock: null, sort: null });
    setSearch('');
    setDebouncedSearch('');
    setCategory('all');
    setSubcategory('all');
    resultsHeadingRef.current?.focus();
  }

  const filterPanelProps = {
    inStockOnly,
    onInStockChange: (value: boolean) => updateCatalogUrl({ inStock: value ? '1' : null }),
    sort,
    onSortChange: (value: ShopSort) => updateCatalogUrl({ sort: value === 'featured' ? null : value }),
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
              Try a different search or change your filters.
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
