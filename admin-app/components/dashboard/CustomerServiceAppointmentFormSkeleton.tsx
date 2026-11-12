const FORM_FIELDS = [
  'branch',
  'service-type',
  'service-mode',
  'date',
  'time',
  'contact',
  'bike-make',
  'bike-model',
  'serial',
] as const;

export function CustomerServiceAppointmentFormSkeleton() {
  return (
    <div
      className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]"
      role="status"
      aria-label="Loading service appointment form"
      aria-busy="true"
    >
      <div className="space-y-6">
        <section className="space-y-5 rounded-xl border bg-card p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {FORM_FIELDS.map((field) => (
              <div key={field} className="space-y-2">
                <div className="h-5 w-36 max-w-full animate-pulse rounded bg-muted" />
                <div className="h-14 animate-pulse rounded-md border bg-muted/40" />
                <div className="h-4 w-4/5 max-w-full animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <div className="h-5 w-40 animate-pulse rounded bg-muted" />
            <div className="h-28 animate-pulse rounded-md border bg-muted/40" />
            <div className="h-4 w-56 max-w-full animate-pulse rounded bg-muted" />
          </div>
        </section>
        <div className="space-y-2">
          <div className="h-4 w-full max-w-2xl animate-pulse rounded bg-muted" />
          <div className="h-4 w-4/5 max-w-xl animate-pulse rounded bg-muted" />
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="h-11 w-52 animate-pulse rounded-md bg-muted" />
          <div className="h-11 w-24 animate-pulse rounded-md bg-muted" />
        </div>
      </div>

      <aside className="space-y-4 rounded-xl border bg-card p-5">
        <div className="h-3 w-40 animate-pulse rounded bg-muted" />
        <div className="h-6 w-48 animate-pulse rounded bg-muted" />
        <div className="border-t" />
        <div className="space-y-3">
          <div className="h-5 w-52 max-w-full animate-pulse rounded bg-muted" />
          <div className="h-5 w-48 max-w-full animate-pulse rounded bg-muted" />
        </div>
        <div className="space-y-2 border-t pt-4">
          <div className="h-5 w-full animate-pulse rounded bg-muted" />
          <div className="h-5 w-4/5 animate-pulse rounded bg-muted" />
        </div>
        <div className="space-y-2 pt-2">
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        </div>
      </aside>
    </div>
  );
}
