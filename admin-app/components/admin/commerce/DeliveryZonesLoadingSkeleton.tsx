export function DeliveryZonesLoadingSkeleton({
  canManage,
}: {
  canManage: boolean;
}) {
  return (
    <div className="space-y-5" aria-busy="true">
      <p className="sr-only" role="status">Loading delivery zones</p>

      {canManage && (
        <div className="flex justify-end" aria-hidden="true">
          <div className="h-12 w-56 animate-pulse rounded-md bg-muted" />
        </div>
      )}

      <div
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        aria-hidden="true"
      >
        {Array.from({ length: 6 }, (_, index) => (
          <article
            key={index}
            className="flex min-h-44 flex-col items-start rounded-xl border border-border bg-card p-5"
          >
            <div className="flex w-full items-center gap-4">
              <div className="size-10 shrink-0 animate-pulse rounded-lg bg-muted" />
              <div className="h-5 w-36 max-w-full animate-pulse rounded bg-muted" />
            </div>
            <div className="flex w-full flex-1 items-center gap-2 pt-1">
              <div className="size-4 shrink-0 animate-pulse rounded bg-muted" />
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            </div>
            <div className="mt-4 h-3 w-44 max-w-full animate-pulse rounded bg-muted" />
          </article>
        ))}
      </div>
    </div>
  );
}
