export function SystemSettingsLoadingSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <p className="sr-only" role="status">Loading settings</p>

      <div
        className="flex gap-2 overflow-hidden border-b"
        aria-hidden="true"
      >
        {[36, 32, 40, 28].map((width, index) => (
          <div
            key={index}
            className={`h-11 shrink-0 animate-pulse ${
              index === 0 ? 'border-b-2 border-primary/30' : ''
            }`}
            style={{ width: `${width * 4}px` }}
          />
        ))}
      </div>

      <section
        className="max-w-3xl space-y-5 rounded-xl border border-border bg-card p-4 sm:p-6"
        aria-hidden="true"
      >
        <header className="space-y-2">
          <div className="h-6 w-40 animate-pulse rounded bg-muted" />
          <div className="h-4 w-full max-w-md animate-pulse rounded bg-muted" />
        </header>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="h-4 w-28 animate-pulse rounded bg-muted" />
            <div className="h-14 animate-pulse rounded-md border bg-muted/40" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[0, 1].map((item) => (
              <div key={item} className="space-y-2">
                <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                <div className="h-14 animate-pulse rounded-md border bg-muted/40" />
              </div>
            ))}
          </div>
          {[0, 1].map((item) => (
            <div key={item} className="space-y-2">
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="h-14 animate-pulse rounded-md border bg-muted/40" />
              {item === 1 && (
                <div className="h-3 w-full max-w-lg animate-pulse rounded bg-muted" />
              )}
            </div>
          ))}
          <div className="space-y-2">
            <div className="h-4 w-28 animate-pulse rounded bg-muted" />
            <div className="h-14 animate-pulse rounded-md border bg-muted/40" />
            <div className="h-3 w-64 max-w-full animate-pulse rounded bg-muted" />
          </div>
          <div className="h-11 w-52 animate-pulse rounded-md bg-muted" />
        </div>
      </section>
    </div>
  );
}
