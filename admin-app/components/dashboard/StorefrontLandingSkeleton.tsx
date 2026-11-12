const QUICK_ACTIONS = ['shop', 'orders', 'appointments', 'account'] as const;

export function StorefrontLandingSkeleton() {
  return (
    <div
      className="mx-auto max-w-7xl space-y-8"
      role="status"
      aria-label="Loading dashboard"
      aria-busy="true"
    >
      <section className="rounded-2xl bg-primary px-5 py-8 sm:px-10 sm:py-12">
        <div className="h-3 w-48 animate-pulse rounded bg-primary-foreground/30" />
        <div className="mt-3 h-10 w-3/4 max-w-xl animate-pulse rounded bg-primary-foreground/30 sm:h-14" />
        <div className="mt-4 space-y-2">
          <div className="h-4 w-full max-w-2xl animate-pulse rounded bg-primary-foreground/20" />
          <div className="h-4 w-4/5 max-w-xl animate-pulse rounded bg-primary-foreground/20" />
        </div>
        <div className="mt-6 h-11 w-44 animate-pulse rounded-md bg-background/40" />
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {QUICK_ACTIONS.map((action) => (
          <div key={action} className="rounded-xl border bg-card p-5">
            <div className="h-5 w-5 animate-pulse rounded bg-muted" />
            <div className="mt-3 h-5 w-36 max-w-full animate-pulse rounded bg-muted" />
            <div className="mt-2 h-4 w-full max-w-sm animate-pulse rounded bg-muted" />
          </div>
        ))}
      </section>

      <section className="rounded-xl border bg-card p-5 sm:flex sm:items-center sm:justify-between sm:gap-5">
        <div className="space-y-2">
          <div className="h-5 w-28 animate-pulse rounded bg-muted" />
          <div className="h-4 w-64 max-w-full animate-pulse rounded bg-muted" />
        </div>
        <div className="mt-4 h-10 w-36 animate-pulse rounded-md bg-muted sm:mt-0" />
      </section>
    </div>
  );
}
