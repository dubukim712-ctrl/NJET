'use client';

import type { ShopCatalogPage } from '@/data/commerce/catalog';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import { StorefrontCatalogQueryError, useShopCatalogPage } from '@/data/commerce/storefront-catalog-client';
import { shopCatalogFiltersSchema, shopPageSize } from '@/lib/validations/storefront-catalog-page';
import { ShopCatalogSkeleton } from '@/components/shop/ShopCatalogSkeleton';
import { ProductCard } from '@/components/shop/ProductCard';
import { useShopFilters } from '@/components/shop/ShopFiltersContext';
import { Button } from '@/components/ui/Button';
import { ShopFiltersPanel, type ShopSort } from '@/components/shop/ShopFiltersPanel';

type CatalogParam = 'q' | 'category' | 'subcategory' | 'branch' | 'inStock' | 'sort' | 'page';

function updateCatalogUrl(changes: Partial<Record<CatalogParam, string | null>>, replace = false) {
  const url = new URL(window.location.href);
  if (!('page' in changes)) url.searchParams.delete('page');
  for (const [key, value] of Object.entries(changes)) {
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
  }
  if (url.href === window.location.href) return;
  if (replace) window.history.replaceState(null, '', url);
  else window.history.pushState(null, '', url);
}

export function ShopProductBrowser({ branches, initialData }: { branches: { id: string; name: string }[]; initialData?: ShopCatalogPage }) {
  const { open: filtersOpen, popoverRoot: filterPopoverRoot } = useShopFilters();
  const params = useSearchParams();
  const committedSearch = params.get('q')?.trim().slice(0, 120) ?? '';
  const [draft, setDraft] = useState({ urlSearch: committedSearch, value: committedSearch });
  if (draft.urlSearch !== committedSearch) {
    setDraft({ urlSearch: committedSearch, value: committedSearch });
  }

  useEffect(() => {
    if (draft.urlSearch !== committedSearch || draft.value.trim() === committedSearch) return;
    const timer = window.setTimeout(() => updateCatalogUrl({ q: draft.value.trim() || null }, true), 250);
    return () => window.clearTimeout(timer);
  }, [committedSearch, draft]);

  const selectedBranch = branches.find(({ id }) => id === params.get('branch'));
  const filters = shopCatalogFiltersSchema.parse({
    search: committedSearch,
    category: shopCatalogFiltersSchema.shape.category.catch(null).parse(params.get('category')),
    subcategory: shopCatalogFiltersSchema.shape.subcategory.catch(null).parse(params.get('subcategory')),
    branch: selectedBranch?.id ?? null,
    inStock: params.get('inStock') === '1',
    sort: shopCatalogFiltersSchema.shape.sort.catch('featured').parse(params.get('sort')),
    page: shopCatalogFiltersSchema.shape.page.catch(1).parse(Number(params.get('page'))),
  });
  const defaultFilters = !filters.search && !filters.category && !filters.subcategory && !filters.branch && !filters.inStock && filters.sort === "featured" && filters.page === 1;
  const query = useShopCatalogPage(filters, defaultFilters ? initialData : undefined);
  const resultsHeadingRef = useRef<HTMLHeadingElement>(null);
  const facets = query.data?.facets ?? [];
  const categories = [...new Map(facets.map((facet) => [facet.category_id, facet.category_name])).entries()];
  const subcategories = [...new Map(facets
    .filter((facet) => !filters.category || facet.category_id === filters.category)
    .map((facet) => [facet.subcategory_id, facet.subcategory_name])).entries()]
    .sort((a, b) => a[1].localeCompare(b[1]));
  const loading = query.isPending || (query.isPlaceholderData && !defaultFilters);
  const products = loading ? [] : query.data?.products ?? [];
  const total = query.data?.total ?? 0;
  const pageCount = Math.ceil(total / shopPageSize);

  function clearFilters() {
    setDraft({ urlSearch: committedSearch, value: '' });
    updateCatalogUrl({ q: null, category: null, subcategory: null, branch: null, inStock: null, sort: null });
    resultsHeadingRef.current?.focus();
  }

  function goToPage(page: number) {
    updateCatalogUrl({ page: page > 1 ? String(page) : null });
    resultsHeadingRef.current?.focus();
  }

  const filterPanelProps = {
    branch: filters.branch ?? 'all',
    branches,
    onBranchChange: (value: string) => updateCatalogUrl({ branch: value === 'all' ? null : value }),
    inStockOnly: filters.inStock,
    onInStockChange: (value: boolean) => updateCatalogUrl({ inStock: value ? '1' : null }),
    sort: filters.sort,
    onSortChange: (value: ShopSort) => updateCatalogUrl({ sort: value === 'featured' ? null : value }),
    search: draft.value,
    onSearchChange: (value: string) => setDraft({ urlSearch: committedSearch, value: value.slice(0, 120) }),
    category: filters.category ?? 'all',
    onCategoryChange: (value: string) => updateCatalogUrl({ category: value === 'all' ? null : value, subcategory: null }),
    subcategory: filters.subcategory ?? 'all',
    onSubcategoryChange: (value: string) => updateCatalogUrl({ subcategory: value === 'all' ? null : value }),
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
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground">Explore</p>
            <h2 ref={resultsHeadingRef} tabIndex={-1} className="mt-1 text-2xl font-semibold tracking-tight">Products</h2>
          </div>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {loading ? 'Loading products...' : query.data && `${total} ${total === 1 ? 'item' : 'items'}`}
          </p>
        </div>
        {query.isError && (
          <div role="alert" className="mb-4 space-y-2 rounded-xl border border-destructive/30 p-4">
            <p>{query.error instanceof StorefrontCatalogQueryError ? query.error.message : 'The catalog could not be loaded.'}</p>
            <Button variant="outline" className="min-h-11" onClick={() => void query.refetch()}>Try again</Button>
          </div>
        )}
        {loading ? (
          <ShopCatalogSkeleton showHero={false} showFilters={false} />
        ) : products.length ? (
          <div className="grid gap-4 min-[321px]:max-[768px]:grid-cols-2 min-[321px]:max-[768px]:gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                compactOnNarrow
                stockBranchName={selectedBranch?.name}
              />
            ))}
          </div>
        ) : query.data && (
          <div className="rounded-xl border bg-card px-5 py-12 text-center">
            <h3 className="font-semibold">{total > 0 ? 'No products on this page' : 'No matching products'}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Try a different search or change your filters.
            </p>
            <Button type="button" variant="outline" className="mt-4 min-h-11"
              onClick={total > 0 ? () => goToPage(1) : clearFilters}>
              {total > 0 ? 'Go to first page' : 'Clear filters'}
            </Button>
          </div>
        )}
        {!loading && pageCount > 1 && filters.page <= pageCount && (
          <nav aria-label="Catalog pages" className="mt-6 flex flex-wrap items-center justify-between gap-2">
            <Button variant="outline" className="min-h-11" disabled={filters.page === 1}
              onClick={() => goToPage(filters.page - 1)}>Previous</Button>
            <span className="text-sm text-muted-foreground">Page {filters.page} of {pageCount}</span>
            <Button variant="outline" className="min-h-11" disabled={filters.page >= pageCount}
              onClick={() => goToPage(filters.page + 1)}>Next</Button>
          </nav>
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
