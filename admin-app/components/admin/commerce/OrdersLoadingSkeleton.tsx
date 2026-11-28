export function OrdersLoadingSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true">
      <p className="sr-only" role="status">Loading orders</p>

      <div className="space-y-4" aria-hidden="true">
        {[0, 1, 2].map((item) => (
          <article
            key={item}
            className="rounded-xl border border-border bg-card p-4 sm:p-5"
          >
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1 space-y-3">
                <div className="h-6 w-40 animate-pulse rounded bg-muted" />
                <div className="h-4 w-full max-w-xl animate-pulse rounded bg-muted" />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="h-7 w-16 animate-pulse rounded-full bg-muted" />
                <div className="h-7 w-24 animate-pulse rounded-full bg-muted" />
                <div className="h-11 w-36 animate-pulse rounded-md border bg-muted/40" />
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
