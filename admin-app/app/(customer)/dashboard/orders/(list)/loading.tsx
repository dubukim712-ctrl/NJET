const ORDER_CARDS = ["first", "second"] as const;

export default function OrdersLoading() {
  return (
    <div
      className="space-y-6"
      role="status"
      aria-label="Loading orders"
      aria-busy="true"
    >
      <div className="h-10 w-40 animate-pulse rounded bg-muted" />
      <header className="space-y-2">
        <div className="h-3 w-28 animate-pulse rounded bg-muted" />
        <div className="h-9 w-36 animate-pulse rounded bg-muted" />
        <div className="h-5 w-full max-w-md animate-pulse rounded bg-muted" />
      </header>
      <section className="space-y-4">
        <div className="flex justify-end">
          <div className="h-8 w-44 animate-pulse rounded-full bg-muted" />
        </div>
        {ORDER_CARDS.map((card) => (
          <div key={card} className="rounded-xl border bg-card p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
                <div className="space-y-2">
                  <div className="h-5 w-32 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                </div>
              </div>
              <div className="h-6 w-28 animate-pulse rounded-full bg-muted" />
            </div>
            <div className="mt-4 space-y-3 border-y py-4">
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            </div>
            <div className="grid gap-3 pt-4 sm:grid-cols-2">
              <div className="h-4 w-40 animate-pulse rounded bg-muted" />
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="h-4 w-36 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
