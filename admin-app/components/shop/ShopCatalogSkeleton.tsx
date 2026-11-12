const PRODUCT_CARDS = ['first', 'second', 'third'] as const;
const FILTERS = ['search', 'category', 'subcategory'] as const;

export function ShopCatalogSkeleton({ showHero = true }: { showHero?: boolean }) {
  return (
    <div
      className={showHero ? 'mx-auto max-w-7xl space-y-8' : 'space-y-8'}
      role="status"
      aria-label="Loading shop catalog"
      aria-busy="true"
    >
      {showHero && (
        <header className="space-y-3 rounded-2xl bg-primary px-5 py-8 text-primary-foreground sm:px-10 sm:py-12">
          <div className="h-3 w-48 animate-pulse rounded bg-primary-foreground/30" />
          <div className="h-10 w-3/4 max-w-2xl animate-pulse rounded bg-primary-foreground/30 sm:h-14" />
          <div className="space-y-2">
            <div className="h-4 w-full max-w-2xl animate-pulse rounded bg-primary-foreground/20" />
            <div className="h-4 w-4/5 max-w-xl animate-pulse rounded bg-primary-foreground/20" />
          </div>
        </header>
      )}

      <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8">
        <aside className="h-fit rounded-xl border bg-card p-4">
          <div className="h-5 w-32 animate-pulse rounded bg-muted" />
          <div className="mt-4 space-y-4">
            {FILTERS.map((filter) => (
              <div key={filter} className="space-y-2">
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                <div className="h-11 animate-pulse rounded-md border bg-muted/40" />
              </div>
            ))}
          </div>
        </aside>

        <section>
          <div className="mb-4 flex items-end justify-between gap-3">
            <div className="space-y-2">
              <div className="h-3 w-20 animate-pulse rounded bg-muted" />
              <div className="h-8 w-36 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-5 w-16 animate-pulse rounded bg-muted" />
          </div>
          <div className="grid gap-4 min-[321px]:max-[768px]:grid-cols-2 min-[321px]:max-[768px]:gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {PRODUCT_CARDS.map((card) => (
              <article key={card} className="overflow-hidden rounded-xl border bg-card min-[321px]:max-[768px]:rounded-lg">
                <div className="aspect-[4/3] animate-pulse bg-muted" />
                <div className="space-y-3 p-4 sm:p-5 min-[321px]:max-[768px]:space-y-2 min-[321px]:max-[768px]:p-2.5">
                  <div className="h-6 w-32 animate-pulse rounded-full bg-muted min-[321px]:max-[768px]:h-5 min-[321px]:max-[768px]:w-24" />
                  <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-full animate-pulse rounded bg-muted" />
                  <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                  <div className="flex items-center justify-between gap-3 pt-1 min-[321px]:max-[768px]:flex-col min-[321px]:max-[768px]:items-start min-[321px]:max-[768px]:gap-1">
                    <div className="h-5 w-24 animate-pulse rounded bg-muted" />
                    <div className="h-10 w-28 animate-pulse rounded-md bg-muted min-[321px]:max-[768px]:h-8 min-[321px]:max-[768px]:w-24" />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
