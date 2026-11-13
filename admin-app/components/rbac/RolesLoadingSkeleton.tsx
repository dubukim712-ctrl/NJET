function AccessSkeleton() {
  return (
    <div className="flex flex-wrap gap-1.5">
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="h-6 w-16 animate-pulse rounded-full bg-muted"
        />
      ))}
    </div>
  );
}

function RoleRowSkeleton({ canManage }: { canManage: boolean }) {
  return (
    <tr className="border-t">
      <td className="space-y-2 px-4 py-4">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="h-3 w-20 animate-pulse rounded bg-muted" />
      </td>
      <td className="px-4 py-4"><AccessSkeleton /></td>
      <td className="px-4 py-4">
        <div className="h-4 w-28 animate-pulse rounded bg-muted" />
      </td>
      <td className="px-4 py-4">
        <div className="h-4 w-8 animate-pulse rounded bg-muted" />
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center justify-end gap-2">
          <div className="h-9 w-12 animate-pulse rounded-md bg-muted" />
          {canManage && (
            <div className="h-9 w-14 animate-pulse rounded-md bg-muted" />
          )}
        </div>
      </td>
    </tr>
  );
}

function RoleCardSkeleton({ canManage }: { canManage: boolean }) {
  return (
    <li className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 w-28 animate-pulse rounded bg-muted" />
          <div className="h-3 w-20 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-3 w-12 animate-pulse rounded bg-muted" />
      </div>
      <AccessSkeleton />
      <div className="h-4 w-28 animate-pulse rounded bg-muted" />
      <div className="flex items-center gap-2">
        <div className="h-9 w-12 animate-pulse rounded-md bg-muted" />
        {canManage && (
          <div className="h-9 w-14 animate-pulse rounded-md bg-muted" />
        )}
      </div>
    </li>
  );
}

export function RolesLoadingSkeleton({
  canManage,
}: {
  canManage: boolean;
}) {
  return (
    <div className="space-y-6" aria-busy="true">
      <p className="sr-only" role="status">Loading roles</p>

      {canManage && (
        <div className="flex justify-end" aria-hidden="true">
          <div className="h-10 w-36 animate-pulse rounded-md bg-muted" />
        </div>
      )}

      <div className="hidden overflow-hidden rounded-xl border md:block" aria-hidden="true">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              {['Role', 'Access', 'Permissions', 'Users', 'Actions'].map((heading) => (
                <th key={heading} scope="col" className="px-4 py-3 font-medium">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[0, 1, 2, 3].map((row) => (
              <RoleRowSkeleton key={row} canManage={canManage} />
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 md:hidden" aria-hidden="true">
        {[0, 1, 2, 3].map((item) => (
          <RoleCardSkeleton key={item} canManage={canManage} />
        ))}
      </ul>
    </div>
  );
}
