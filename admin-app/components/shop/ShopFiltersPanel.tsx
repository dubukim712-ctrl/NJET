'use client';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Check, Search } from 'lucide-react';
import { Select } from '@/components/ui/Select';

type FilterOption = [string, string];

export type ShopSort = 'featured' | 'price-asc' | 'price-desc';

export function ShopFiltersPanel({
  idPrefix,
  branch,
  branches,
  onBranchChange,
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
  branch: string;
  branches: { id: string; name: string }[];
  onBranchChange: (value: string) => void;
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
        <Input id={searchId} type="search" label="Search" value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Name or description" leadingIcon={<Search className="size-4" />} />
        <Select id={`${idPrefix}-branch`} label="Branch" value={branch}
          onValueChange={onBranchChange} className="min-h-11 bg-background">
          <option value="all">All Branches</option>
          {branches.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
        </Select>
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
        <Button type="button" aria-pressed={inStockOnly}
          variant={inStockOnly ? 'secondary' : 'outline'} className="min-h-11 w-full justify-start gap-2"
          onClick={() => onInStockChange(!inStockOnly)}>
          <span className="grid size-4 shrink-0 place-items-center rounded border border-current" aria-hidden="true">
            {inStockOnly && <Check className="size-3" />}
          </span>
          In stock only
        </Button>
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
