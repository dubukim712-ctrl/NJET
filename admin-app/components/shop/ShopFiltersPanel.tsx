'use client';

import { Search } from 'lucide-react';
import { Select } from '@/components/ui/Select';

type FilterOption = [string, string];

export type ShopSort = 'featured' | 'price-asc' | 'price-desc';

export function ShopFiltersPanel({
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
  inStockOnly,
  onInStockChange,
  sort,
  onSortChange,
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
  inStockOnly: boolean;
  onInStockChange: (value: boolean) => void;
  sort: ShopSort;
  onSortChange: (value: ShopSort) => void;
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
          className="min-h-11 bg-background"
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
          className="min-h-11 bg-background"
        >
          <option value="all">All subcategories</option>
          {subcategories.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </Select>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(event) => onInStockChange(event.target.checked)}
            className="size-4 shrink-0 accent-primary"
          />
          In stock only
        </label>
        <Select
          id={`${idPrefix}-sort`}
          label="Sort"
          value={sort}
          onValueChange={(value) => onSortChange(value as ShopSort)}
          className="min-h-11 bg-background"
        >
          <option value="featured">Featured</option>
          <option value="price-asc">Price: Low to high</option>
          <option value="price-desc">Price: High to low</option>
        </Select>
      </div>
    </aside>
  );
}
