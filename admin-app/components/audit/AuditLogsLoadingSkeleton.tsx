function AuditRowSkeleton({ canClear }: { canClear: boolean }) {
  return (
    <tr className="border-t">
      {canClear && (
        <td className="px-4 py-3">
          <div className="h-4 w-4 animate-pulse rounded border bg-muted/40" />
        </td>
      )}
      <td className="px-4 py-3"><div className="h-4 w-32 animate-pulse rounded bg-muted" /></td>
      <td className="px-4 py-3"><div className="h-4 w-36 animate-pulse rounded bg-muted" /></td>
      <td className="px-4 py-3"><div className="h-6 w-16 animate-pulse rounded-full bg-muted" /></td>
      <td className="px-4 py-3"><div className="h-4 w-28 animate-pulse rounded bg-muted" /></td>
      <td className="px-4 py-3"><div className="h-4 w-20 animate-pulse rounded bg-muted" /></td>
      <td className="px-4 py-3"><div className="h-4 w-16 animate-pulse rounded bg-muted" /></td>
      <td className="px-4 py-3 text-right"><div className="ml-auto h-4 w-10 animate-pulse rounded bg-muted" /></td>
    </tr>
  );
}

function AuditCardSkeleton({ canClear }: { canClear: boolean }) {
  return (
    <li className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {canClear && (
            <div className="h-4 w-4 shrink-0 animate-pulse rounded border bg-muted/40" />
          )}
          <div className="h-6 w-16 animate-pulse rounded-full bg-muted" />
        </div>
        <div className="h-3 w-28 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-4 w-32 animate-pulse rounded bg-muted" />
      <div className="h-3 w-52 max-w-full animate-pulse rounded bg-muted" />
      <div className="h-3 w-24 animate-pulse rounded bg-muted" />
      <div className="h-4 w-20 animate-pulse rounded bg-muted" />
    </li>
  );
}

export function AuditLogsLoadingSkeleton({
  canClear,
  hasFilters,
}: {
  canClear: boolean;
  hasFilters: boolean;
}) {
  return (
    <div className="space-y-6" aria-busy="true">
      <p className="sr-only" role="status">Loading audit logs</p>

      <div
        className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]"
        aria-hidden="true"
      >
        {[0, 1].map((item) => (
          <div key={item} className="space-y-2">
            <div className="h-4 w-16 animate-pulse rounded bg-muted" />
            <div className="h-14 animate-pulse rounded-md border bg-muted/40" />
          </div>
        ))}
        <div className="flex items-end">
          {hasFilters && (
            <div className="h-10 w-20 animate-pulse rounded-md border bg-muted/40" />
          )}
        </div>
      </div>

      {canClear && (
        <div
          className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
          aria-hidden="true"
        >
          <div className="h-4 w-full max-w-md animate-pulse rounded bg-muted" />
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="h-11 w-full animate-pulse rounded-md border bg-muted/40 sm:w-40" />
            <div className="h-11 w-full animate-pulse rounded-md bg-muted sm:w-36" />
          </div>
        </div>
      )}

      <div className="hidden overflow-hidden rounded-xl border md:block" aria-hidden="true">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              {canClear && <th className="w-10 px-4 py-3" />}
              {['When', 'Actor', 'Action', 'Entity', 'Record', 'Changes', ''].map(
                (heading, index) => (
                  <th key={`${heading}-${index}`} className="px-4 py-3 font-medium">
                    {heading || <span className="sr-only">Details</span>}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {[0, 1, 2, 3, 4, 5].map((row) => (
              <AuditRowSkeleton key={row} canClear={canClear} />
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 md:hidden" aria-hidden="true">
        {[0, 1, 2, 3, 4, 5].map((item) => (
          <AuditCardSkeleton key={item} canClear={canClear} />
        ))}
      </ul>

      <div
        className="flex flex-col items-center justify-between gap-3 sm:flex-row"
        aria-hidden="true"
      >
        <div className="h-4 w-36 animate-pulse rounded bg-muted" />
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <div className="h-9 flex-1 animate-pulse rounded-md border bg-muted/40 sm:w-24 sm:flex-none" />
          <div className="h-4 w-12 animate-pulse rounded bg-muted" />
          <div className="h-9 flex-1 animate-pulse rounded-md border bg-muted/40 sm:w-20 sm:flex-none" />
        </div>
      </div>
    </div>
  );
}
