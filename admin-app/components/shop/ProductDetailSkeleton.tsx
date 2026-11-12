export function ProductDetailSkeleton() {
  return (
    <div
      className="grid items-start gap-8 lg:grid-cols-2"
      role="status"
      aria-label="Loading product details"
      aria-busy="true"
    >
      <div className="rounded-xl border bg-card p-3">
        <div className="aspect-[4/3] animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="space-y-5">
        <header className="space-y-3">
          <div className="h-4 w-40 animate-pulse rounded bg-muted" />
          <div className="h-10 w-3/4 max-w-md animate-pulse rounded bg-muted" />
          <div className="space-y-2 pt-1">
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
          </div>
        </header>
        <section className="space-y-5 rounded-xl border bg-card p-5 sm:p-6">
          {[0, 1].map((field) => (
            <div key={field} className="space-y-2">
              <div className="h-4 w-28 animate-pulse rounded bg-muted" />
              <div className="h-11 w-full animate-pulse rounded-md border bg-muted/40" />
            </div>
          ))}
          <div className="space-y-2 rounded-lg bg-secondary/60 p-4">
            <div className="h-6 w-32 animate-pulse rounded bg-muted" />
            <div className="h-4 w-48 animate-pulse rounded bg-muted" />
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-11 w-full animate-pulse rounded-md bg-muted" />
        </section>
        <div className="h-4 w-full max-w-sm animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
