export function StorefrontCatalogLoading({ label }: { label: string }) {
  return (
    <div
      className="space-y-4"
      role="status"
      aria-label={`Loading ${label}`}
      aria-busy="true"
    >
      <div className="h-12 w-48 animate-pulse rounded-lg bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="aspect-[4/3] animate-pulse rounded-xl border bg-card"
          />
        ))}
      </div>
    </div>
  );
}
