'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import type { RoleOption } from '@/data/rbac/queries';
import { buildUsersHref, normalizeSearch } from '@/lib/rbac';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

const FILTER_DEBOUNCE_MS = 300;

interface UsersFiltersProps {
  roles: RoleOption[];
  search?: string;
  roleId?: string;
}

export function UsersFilters({ roles, search, roleId }: UsersFiltersProps) {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState(search ?? '');
  const [roleValue, setRoleValue] = useState(roleId ?? '');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasFilters = Boolean(searchValue || roleValue);

  useEffect(
    () => () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    },
    []
  );

  useEffect(() => {
    if (debounceTimer.current) return;
    setSearchValue(search ?? '');
    setRoleValue(roleId ?? '');
  }, [search, roleId]);

  const scheduleFilterUpdate = (nextSearch: string, nextRoleId: string) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      router.replace(
        buildUsersHref({
          search: normalizeSearch(nextSearch),
          roleId: nextRoleId || undefined,
        }),
        { scroll: false }
      );
      debounceTimer.current = null;
    }, FILTER_DEBOUNCE_MS);
  };

  return (
    <form
      onSubmit={(event) => event.preventDefault()}
      className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]"
    >
      <Input
        id="q"
        name="q"
        label="Search"
        type="search"
        value={searchValue}
        onChange={(event) => {
          const nextSearch = event.target.value;
          setSearchValue(nextSearch);
          scheduleFilterUpdate(nextSearch, roleValue);
        }}
        placeholder="Name or email"
        maxLength={100}
        leadingIcon={<Search className="h-4 w-4" />}
      />

      <div className="space-y-1">
        <Select
          id="role"
          name="role"
          label="Role"
          value={roleValue}
          onChange={(event) => {
            const nextRoleId = event.target.value;
            setRoleValue(nextRoleId);
            scheduleFilterUpdate(searchValue, nextRoleId);
          }}
          containerClassName="space-y-1"
        >
          <option value="">All roles</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex items-end">
        {hasFilters ? (
          <Link
            href="/admin/users"
            onClick={() => {
              if (debounceTimer.current) clearTimeout(debounceTimer.current);
            }}
            className="inline-flex h-10 w-full items-center justify-center rounded-md border border-input px-5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground lg:w-auto"
          >
            Clear
          </Link>
        ) : null}
      </div>
    </form>
  );
}
