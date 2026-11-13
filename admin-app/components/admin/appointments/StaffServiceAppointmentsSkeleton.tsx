export function StaffServiceAppointmentsSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <p className="sr-only" role="status">Loading appointments</p>
      {[0, 1, 2].map((item) => (
        <article
          key={item}
          className="rounded-xl border border-border bg-card p-5 sm:p-6"
          aria-hidden="true"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="h-5 w-56 max-w-full animate-pulse rounded bg-muted" />
            <div className="flex items-center gap-3">
              <div className="h-7 w-24 animate-pulse rounded-full bg-muted" />
              <div className="h-5 w-5 animate-pulse rounded bg-muted" />
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
