function UserIdentitySkeleton() {
  return (
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-muted" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-4 w-32 max-w-full animate-pulse rounded bg-muted" />
        <div className="h-3 w-44 max-w-full animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

function UserRowSkeleton({ canManage }: { canManage: boolean }) {
  return (
    <tr className="border-t">
      <td className="px-4 py-3"><UserIdentitySkeleton /></td>
      <td className="space-y-2 px-4 py-3">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
      </td>
      <td className="px-4 py-3">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
      </td>
      <td className="px-4 py-3">
        {canManage ? (
          <div className="space-y-2">
            <div className="h-11 w-48 max-w-full animate-pulse rounded-md border bg-muted/40" />
            <div className="h-3 w-40 max-w-full animate-pulse rounded bg-muted" />
          </div>
        ) : (
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        )}
      </td>
      <td className="px-4 py-3">
        {canManage ? (
          <div className="flex items-center gap-2">
            <div className="h-11 w-44 max-w-full animate-pulse rounded-md border bg-muted/40" />
            <div className="h-9 w-16 shrink-0 animate-pulse rounded-md bg-muted" />
          </div>
        ) : (
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        )}
      </td>
    </tr>
  );
}

function UserCardSkeleton({ canManage }: { canManage: boolean }) {
  return (
    <li className="space-y-3 rounded-xl border border-border bg-card p-4">
      <UserIdentitySkeleton />
      <div className="flex items-center gap-2">
        <div className="h-4 w-20 animate-pulse rounded bg-muted" />
        <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
      </div>
      <div className="h-3 w-36 animate-pulse rounded bg-muted" />
      {canManage ? (
        <>
          <div className="space-y-2">
            <div className="h-3 w-16 animate-pulse rounded bg-muted" />
            <div className="h-11 w-full animate-pulse rounded-md border bg-muted/40" />
          </div>
          <div className="flex gap-2">
            <div className="h-11 flex-1 animate-pulse rounded-md border bg-muted/40" />
            <div className="h-9 w-16 shrink-0 animate-pulse rounded-md bg-muted" />
          </div>
        </>
      ) : (
        <div className="h-4 w-28 animate-pulse rounded bg-muted" />
      )}
    </li>
  );
}

export function UsersLoadingSkeleton({
  canManage,
  hasFilters,
}: {
  canManage: boolean;
  hasFilters: boolean;
}) {
  return (
    <div className="space-y-6" aria-busy="true">
      <p className="sr-only" role="status">Loading users</p>

      <div
        className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]"
        aria-hidden="true"
      >
        <div className="space-y-2">
          <div className="h-4 w-16 animate-pulse rounded bg-muted" />
          <div className="h-14 animate-pulse rounded-md border bg-muted/40" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-14 animate-pulse rounded bg-muted" />
          <div className="h-14 animate-pulse rounded-md border bg-muted/40" />
        </div>
        <div className="flex items-end">
          {hasFilters && (
            <div className="h-10 w-20 animate-pulse rounded-md border bg-muted/40" />
          )}
        </div>
      </div>

      <div className="hidden overflow-hidden rounded-xl border md:block" aria-hidden="true">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              {['User', 'Role', 'Joined', 'Branch', 'Change role'].map((heading) => (
                <th key={heading} scope="col" className="px-4 py-3 font-medium">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[0, 1, 2, 3, 4].map((row) => (
              <UserRowSkeleton key={row} canManage={canManage} />
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 md:hidden" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((item) => (
          <UserCardSkeleton key={item} canManage={canManage} />
        ))}
      </ul>

      <div className="flex items-center justify-between" aria-hidden="true">
        <div className="h-4 w-36 animate-pulse rounded bg-muted" />
        <div className="flex gap-2">
          <div className="h-10 w-24 animate-pulse rounded-md border bg-muted/40" />
          <div className="h-10 w-20 animate-pulse rounded-md border bg-muted/40" />
        </div>
      </div>
    </div>
  );
}
