export function StorefrontCatalogLoading({ label }: { label: string }) {
  return (
    <div
      className="space-y-4"
      role="status"
      aria-label={`Loading ${label}`}
      aria-busy="true"
    >
      <div className="h-12 w-48 animate-pulse rounded-lg bg-muted" />
      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-4">
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="aspect-[4/3] w-[72vw] max-w-md shrink-0 snap-start animate-pulse rounded-xl border bg-card sm:w-80"
          />
        ))}
      </div>
    </div>
  );
}
