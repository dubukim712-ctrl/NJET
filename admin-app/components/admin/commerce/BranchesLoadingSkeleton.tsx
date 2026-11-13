export function BranchesLoadingSkeleton({
  canCreateBranch,
}: {
  canCreateBranch: boolean;
}) {
  return (
    <div className="space-y-5" aria-busy="true">
      <p className="sr-only" role="status">Loading branches</p>

      {canCreateBranch && (
        <div className="flex justify-end" aria-hidden="true">
          <div className="h-12 w-44 animate-pulse rounded-md bg-muted" />
        </div>
      )}

      <div
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        aria-hidden="true"
      >
        {[0, 1, 2].map((item) => (
          <article
            key={item}
            className="flex min-h-44 flex-col items-start rounded-xl border border-border bg-card p-5"
          >
            <div className="flex w-full items-center gap-4">
              <div className="size-10 shrink-0 animate-pulse rounded-lg bg-muted" />
              <div className="h-5 w-40 max-w-full animate-pulse rounded bg-muted" />
            </div>
            <div className="flex w-full flex-1 items-start gap-2 pt-4">
              <div className="mt-0.5 size-4 shrink-0 animate-pulse rounded bg-muted" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-full animate-pulse rounded bg-muted" />
                <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
              </div>
            </div>
            <div className="mt-4 h-3 w-44 animate-pulse rounded bg-muted" />
          </article>
        ))}
      </div>
    </div>
  );
}
