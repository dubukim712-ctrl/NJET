export function ProductsLoadingSkeleton({
  canManageProducts,
}: {
  canManageProducts: boolean;
}) {
  return (
    <div className="space-y-6" aria-busy="true">
      <p className="sr-only" role="status">Loading products and stock</p>

      <div
        className="flex gap-6 overflow-hidden border-b border-border"
        aria-hidden="true"
      >
        <div className="h-12 w-36 shrink-0 animate-pulse border-b-2 border-primary/30" />
        <div className="h-12 w-20 shrink-0 animate-pulse" />
        <div className="h-12 w-16 shrink-0 animate-pulse" />
      </div>

      <section className="space-y-6" aria-hidden="true">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="h-7 w-40 animate-pulse rounded bg-muted" />
          {canManageProducts && (
            <>
              <div className="hidden gap-2 sm:flex">
                <div className="h-11 w-52 animate-pulse rounded-md border bg-muted/40" />
                <div className="h-11 w-48 animate-pulse rounded-md border bg-muted/40" />
                <div className="h-11 w-40 animate-pulse rounded-md bg-muted" />
              </div>
              <div className="h-11 w-11 animate-pulse rounded-md bg-muted sm:hidden" />
            </>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,0.4fr)]">
          <div className="space-y-2">
            <div className="h-4 w-28 animate-pulse rounded bg-muted" />
            <div className="h-14 animate-pulse rounded-md border bg-muted/40" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-16 animate-pulse rounded bg-muted" />
            <div className="h-14 animate-pulse rounded-md border bg-muted/40" />
          </div>
        </div>

        <div className="h-4 w-44 animate-pulse rounded bg-muted" />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <article
              key={item}
              className="flex min-h-44 flex-col justify-between gap-4 rounded-xl border border-border bg-card p-4 sm:p-5"
            >
              <div className="space-y-3">
                <div className="h-5 w-3/5 animate-pulse rounded bg-muted" />
                <div className="h-4 w-full animate-pulse rounded bg-muted" />
                <div className="h-4 w-2/5 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
