'use client';

import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { listWarrantyReturnsAction } from '@/data/actions/warranty-returns';
import { WarrantyReturnCard } from './WarrantyReturnCard';

type Cursor = Parameters<typeof listWarrantyReturnsAction>[0];

export function WarrantyReturnsTab({ userId }: { userId: string }) {
  const client = useQueryClient();
  const queryKey = ['warranty-returns', userId] as const;
  const query = useInfiniteQuery({
    queryKey,
    initialPageParam: null as Cursor,
    queryFn: async ({ pageParam }) => {
      const result = await listWarrantyReturnsAction(pageParam);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    getNextPageParam: (last) => last.next,
  });
  const rows = query.data?.pages.flatMap((page) => page.rows) ?? [];

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-lg font-semibold">Non-sellable stock</h2>
        <p className="text-sm text-muted-foreground">Track returned warranty units, their condition, and what happened to them.</p>
      </header>
      {query.isPending && <p role="status">Loading warranty returns...</p>}
      {query.isError && (
        <div className="flex flex-wrap items-center gap-3">
          <p role="alert" className="text-sm text-destructive">Could not load warranty returns.</p>
          <Button variant="outline" className="min-h-11" onClick={() => void query.refetch()}>Retry</Button>
        </div>
      )}
      {query.isSuccess && rows.length === 0 && (
        <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">Returned units appear here after staff record their receipt in a warranty exchange.</p>
      )}
      {rows.map((row) => (
        <WarrantyReturnCard key={row.appointment_id} row={row} onSaved={(saved) => {
          client.setQueryData<typeof query.data>(queryKey, (current) => current && {
            ...current,
            pages: current.pages.map((page) => page.rows.some((item) => item.appointment_id === row.appointment_id)
              ? { ...page, rows: page.rows.map((item) => item.appointment_id === row.appointment_id ? { ...item, ...saved } : item) }
              : page),
          });
        }} />
      ))}
      {query.hasNextPage && (
        <Button variant="outline" className="min-h-11" loading={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}>Load older returns</Button>
      )}
    </div>
  );
}
