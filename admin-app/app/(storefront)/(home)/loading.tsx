const PRODUCT_SKELETONS = ['first', 'second', 'third'] as const;

export default function StorefrontHomeLoading() {
  return (
    <div
      className="space-y-12 sm:space-y-16"
      role="status"
      aria-label="Loading storefront home"
      aria-busy="true"
    >
      <section className="overflow-hidden rounded-2xl bg-primary">
        <div className="grid gap-8 p-5 sm:p-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-12 lg:p-12">
          <div className="space-y-6">
            <div className="h-3 w-44 animate-pulse rounded bg-primary-foreground/20" />
            <div className="space-y-2">
              <div className="h-10 w-4/5 animate-pulse rounded bg-primary-foreground/20 sm:h-14" />
              <div className="h-10 w-3/5 animate-pulse rounded bg-primary-foreground/20 sm:h-14" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-full max-w-lg animate-pulse rounded bg-primary-foreground/15" />
              <div className="h-4 w-4/5 max-w-lg animate-pulse rounded bg-primary-foreground/15" />
            </div>
            <div className="h-11 w-40 animate-pulse rounded-md bg-background/70" />
            <div className="h-3 w-64 max-w-full animate-pulse rounded bg-primary-foreground/15" />
          </div>
          <div className="min-h-64 animate-pulse rounded-2xl bg-[#f6f1e7]/20 sm:min-h-80" />
        </div>
      </section>

      <section className="grid gap-4 border-y py-6 sm:grid-cols-3 sm:gap-6 sm:py-8">
        {PRODUCT_SKELETONS.map((item) => (
          <div key={item} className="flex gap-3">
            <div className="mt-0.5 h-5 w-5 shrink-0 animate-pulse rounded bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="h-4 w-full max-w-56 animate-pulse rounded bg-muted" />
              <div className="h-4 w-4/5 max-w-48 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-2">
            <div className="h-3 w-28 animate-pulse rounded bg-muted" />
            <div className="h-8 w-64 max-w-full animate-pulse rounded bg-muted" />
          </div>
          <div className="h-5 w-32 animate-pulse rounded bg-muted" />
        </div>
        <div className="flex snap-x snap-mandatory gap-4 overflow-hidden pb-4">
          {PRODUCT_SKELETONS.map((item) => (
            <div
              key={item}
              className="w-[72vw] max-w-md shrink-0 snap-start overflow-hidden rounded-xl border bg-card sm:w-80 min-[320px]:max-[768px]:rounded-lg"
            >
              <div className="aspect-[4/3] animate-pulse bg-muted" />
              <div className="space-y-3 p-4 sm:p-5 min-[320px]:max-[768px]:space-y-2 min-[320px]:max-[768px]:p-2.5">
                <div className="h-6 w-28 animate-pulse rounded-full bg-muted min-[320px]:max-[768px]:h-5 min-[320px]:max-[768px]:w-24" />
                <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-4 w-full animate-pulse rounded bg-muted" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
