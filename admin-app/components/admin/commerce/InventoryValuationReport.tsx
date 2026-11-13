'use client';

import { useState } from 'react';
import { AlertCircle, Boxes, CircleDollarSign, PackageX } from 'lucide-react';
import { useInventoryValuationQuery } from '@/data/commerce/inventory-valuation-client';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import type { InventoryValuationResponse } from '@/lib/validations/inventory-valuation';
import type { UserProfile } from '@/types/database';

function formatMinor(value: string) {
  const minor = BigInt(value);
  const hundred = BigInt(100);
  const amount = (minor / hundred).toLocaleString('en-PH');
  const cents = String(minor % hundred).padStart(2, '0');
  return `₱${amount}.${cents}`;
}

function InventoryTable({ rows }: { rows: InventoryValuationResponse['result']['rows'] }) {
  return (
    <>
      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <article key={`${row.branch_id}:${row.variant_id}`} className="space-y-3 rounded-xl border bg-card p-4">
            <div>
              <p className="text-xs text-muted-foreground">{row.branch_name} · {row.sku}</p>
              <h3 className="mt-1 font-semibold">{row.product_name}</h3>
              <p className="text-sm text-muted-foreground">{row.variant_name}</p>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-muted-foreground">On hand</dt><dd className="font-medium">{row.quantity_on_hand}</dd></div>
              <div><dt className="text-muted-foreground">Known value</dt><dd className="font-medium">{formatMinor(row.known_value_minor)}</dd></div>
              <div><dt className="text-muted-foreground">Known-cost units</dt><dd>{row.known_cost_quantity}</dd></div>
              <div><dt className="text-muted-foreground">Unknown-cost units</dt><dd>{row.unknown_cost_quantity}</dd></div>
            </dl>
          </article>
        ))}
      </div>
      <div className="hidden overflow-x-auto rounded-xl border md:block">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Branch</th>
              <th className="px-4 py-3">Product / variant</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3 text-right">On hand</th>
              <th className="px-4 py-3 text-right">Known cost</th>
              <th className="px-4 py-3 text-right">Unknown cost</th>
              <th className="px-4 py-3 text-right">Known value</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => (
              <tr key={`${row.branch_id}:${row.variant_id}`} className="bg-card">
                <td className="px-4 py-3">{row.branch_name}</td>
                <td className="px-4 py-3">
                  <p className="font-medium">{row.product_name}</p>
                  <p className="text-muted-foreground">{row.variant_name}</p>
                </td>
                <td className="px-4 py-3">{row.sku}</td>
                <td className="px-4 py-3 text-right tabular-nums">{row.quantity_on_hand}</td>
                <td className="px-4 py-3 text-right tabular-nums">{row.known_cost_quantity}</td>
                <td className="px-4 py-3 text-right tabular-nums">{row.unknown_cost_quantity}</td>
                <td className="px-4 py-3 text-right font-medium tabular-nums">{formatMinor(row.known_value_minor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

type InventoryValuationProfile = Pick<
  UserProfile,
  'id' | 'role_id' | 'scope' | 'is_full_access' | 'branch_id' | 'permissions'
>;

export function InventoryValuationReport({ profile }: { profile: InventoryValuationProfile }) {
  const [branchId, setBranchId] = useState('all');
  const [page, setPage] = useState(1);
  const query = useInventoryValuationQuery(
    profile,
    branchId === 'all' ? null : branchId,
    page,
    50
  );
  const { data } = query;
  const branches = data?.branches ?? [];

  const pageCount = data ? Math.max(1, Math.ceil(data.result.total / data.page_size)) : 1;
  const error = query.error instanceof Error
    ? query.error.message
    : query.isError ? 'Inventory valuation could not be loaded.' : null;

  return (
    <section className="space-y-5" aria-busy={query.isFetching}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Known value includes only costed stock currently on hand. Legacy or adjusted stock with no receipt cost is counted separately.
        </p>
        <Select
          label="Branch"
          value={branchId}
          onChange={(event) => {
            setPage(1);
            setBranchId(event.target.value);
          }}
          containerClassName="w-full sm:w-64"
        >
          <option value="all">All accessible branches</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>{branch.name}</option>
          ))}
        </Select>
      </div>

      {error && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
          <span className="flex items-center gap-2"><AlertCircle className="size-4" aria-hidden="true" />{error}</span>
          <Button type="button" variant="outline" onClick={() => void query.refetch()}>Try again</Button>
        </div>
      )}

      {data && query.isFetching && (
        <p className="text-sm text-muted-foreground" role="status">Updating inventory valuation…</p>
      )}

      {!data && query.isPending ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading inventory valuation">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-xl border bg-muted/40" />
          ))}
          <div className="h-72 animate-pulse rounded-xl border bg-muted/40 sm:col-span-2 lg:col-span-3" />
        </div>
      ) : data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <article className="rounded-xl border bg-card p-5">
              <p className="flex items-center gap-2 text-sm text-muted-foreground"><CircleDollarSign className="size-4" aria-hidden="true" />Known inventory value</p>
              <p className="mt-3 text-2xl font-semibold tabular-nums">{formatMinor(data.result.summary.known_value_minor)}</p>
            </article>
            <article className="rounded-xl border bg-card p-5">
              <p className="flex items-center gap-2 text-sm text-muted-foreground"><PackageX className="size-4" aria-hidden="true" />Units with unknown cost</p>
              <p className="mt-3 text-2xl font-semibold tabular-nums">{data.result.summary.unknown_cost_quantity.toLocaleString()}</p>
            </article>
            <article className="rounded-xl border bg-card p-5">
              <p className="flex items-center gap-2 text-sm text-muted-foreground"><Boxes className="size-4" aria-hidden="true" />Tracked variants</p>
              <p className="mt-3 text-2xl font-semibold tabular-nums">{data.result.total.toLocaleString()}</p>
            </article>
          </div>
          {data.result.rows.length === 0 ? (
            <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">No stock is currently on hand for this branch.</p>
          ) : (
            <>
              <InventoryTable rows={data.result.rows} />
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Page {data.page} of {pageCount} · {data.result.total.toLocaleString()} variants
                </p>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" disabled={page <= 1 || query.isFetching} onClick={() => {
                    setPage((current) => current - 1);
                  }}>Previous</Button>
                  <Button type="button" variant="outline" disabled={page >= pageCount || query.isFetching} onClick={() => {
                    setPage((current) => current + 1);
                  }}>Next</Button>
                </div>
              </div>
            </>
          )}
        </>
      ) : null}
    </section>
  );
}
