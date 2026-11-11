'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { OrderBranchOption } from '@/data/commerce/admin-orders';
import { buildOrdersHref } from '@/lib/commerce';
import {
  ORDER_FILTER_STATUSES,
  type OrderFilters,
} from '@/lib/validations/order-filters';

const FILTER_DEBOUNCE_MS = 300;

export function OrdersFilters({
  branches,
  filters,
}: {
  branches: OrderBranchOption[];
  filters: OrderFilters;
}) {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState(filters.q);
  const [statusValue, setStatusValue] = useState(filters.status);
  const [branchValue, setBranchValue] = useState(filters.branch);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasFilters = Boolean(searchValue || statusValue || branchValue);

  useEffect(
    () => () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    },
    []
  );

  useEffect(() => {
    if (debounceTimer.current) return;
    setSearchValue(filters.q);
    setStatusValue(filters.status);
    setBranchValue(filters.branch);
  }, [filters]);

  const applyFilters = (search: string, status: string, branchId: string) => {
    router.replace(
      buildOrdersHref({
        search,
        status,
        branchId,
      }),
      { scroll: false }
    );
  };

  const scheduleSearch = (search: string) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      applyFilters(search, statusValue, branchValue);
      debounceTimer.current = null;
    }, FILTER_DEBOUNCE_MS);
  };

  const applySelection = (status: string, branchId: string) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
    applyFilters(searchValue, status, branchId);
  };

  return (
    <form
      onSubmit={(event) => event.preventDefault()}
      className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
    >
      <Input
        id="q"
        name="q"
        label="Search orders"
        type="search"
        value={searchValue}
        onChange={(event) => {
          const nextSearch = event.target.value;
          setSearchValue(nextSearch);
          scheduleSearch(nextSearch);
        }}
        placeholder="Order no., customer, or phone"
        maxLength={100}
        leadingIcon={<Search className="h-4 w-4" />}
      />

      <Select
        id="status"
        name="status"
        label="Status"
        value={statusValue}
        onChange={(event) => {
          const nextStatus = event.target.value as OrderFilters['status'];
          setStatusValue(nextStatus);
          applySelection(nextStatus, branchValue);
        }}
      >
        <option value="">All statuses</option>
        {ORDER_FILTER_STATUSES.map((status) => (
          <option key={status} value={status}>
            {status.replaceAll('_', ' ').replace(/^\w/, (letter) => letter.toUpperCase())}
          </option>
        ))}
      </Select>

      <Select
        id="branch"
        name="branch"
        label="Branch"
        value={branchValue}
        onChange={(event) => {
          const nextBranch = event.target.value;
          setBranchValue(nextBranch);
          applySelection(statusValue, nextBranch);
        }}
      >
        <option value="">All branches</option>
        {branches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name}
          </option>
        ))}
      </Select>

      <div className="flex items-end">
        {hasFilters ? (
          <Link
            href="/admin/orders"
            onClick={() => {
              if (debounceTimer.current) clearTimeout(debounceTimer.current);
            }}
            className="inline-flex h-11 w-full items-center justify-center rounded-md border border-input px-5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground lg:w-auto"
          >
            Clear
          </Link>
        ) : null}
      </div>
    </form>
  );
}
