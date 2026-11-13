import type { ReactNode } from 'react';

type DashboardSections = {
  orders: boolean;
  jobs: boolean;
  inventory: boolean;
  team: boolean;
  isSales: boolean;
  isTechnician: boolean;
};

function PanelSkeleton({
  titleWidth,
  rows = 3,
}: {
  titleWidth: string;
  rows?: number;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card" aria-hidden="true">
      <div className="border-b border-border px-5 py-4">
        <div className="h-3 w-16 animate-pulse rounded bg-muted" />
        <div className={`mt-2 h-5 ${titleWidth} animate-pulse rounded bg-muted`} />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="flex items-center justify-between gap-4 px-5 py-4">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-3/5 animate-pulse rounded bg-muted" />
              <div className="h-3 w-2/5 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-6 w-20 shrink-0 animate-pulse rounded-full bg-muted" />
          </div>
        ))}
      </div>
    </section>
  );
}

function ActivitySkeleton({ chart = false }: { chart?: boolean }) {
  return (
    <section className="rounded-lg border border-border bg-card p-5" aria-hidden="true">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-muted" />
        <div className="space-y-2">
          <div className="h-3 w-16 animate-pulse rounded bg-muted" />
          <div className="h-5 w-32 animate-pulse rounded bg-muted" />
        </div>
      </div>
      {chart ? (
        <div className="mt-6 flex h-28 items-end justify-between gap-2">
          {[35, 55, 42, 75, 58, 90, 48].map((height, index) => (
            <div
              key={index}
              className="w-full animate-pulse rounded-t-sm bg-muted"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {[0, 1, 2].map((item) => (
            <div key={item} className="flex gap-3">
              <div className="h-4 w-16 shrink-0 animate-pulse rounded bg-muted" />
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function StaffDashboardSkeleton({
  quickActions,
  sections,
}: {
  quickActions: ReactNode;
  sections: DashboardSections;
}) {
  const metricCount =
    (sections.orders ? (sections.isSales ? 3 : 1) : 0) +
    (sections.jobs ? (sections.isTechnician ? 2 : 1) : 0) +
    Number(sections.inventory) +
    Number(sections.team);
  const operationCount =
    Number(sections.orders) + Number(sections.jobs) + Number(sections.inventory);

  return (
    <div className="space-y-8" aria-busy="true">
      <p className="sr-only" role="status">Loading dashboard overview</p>
      <section
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
        aria-hidden="true"
      >
        {Array.from({ length: metricCount || 1 }, (_, index) => (
          <div key={index} className="rounded-lg border border-border bg-card p-5">
            <div className="h-4 w-28 animate-pulse rounded bg-muted" />
            <div className="mt-4 flex items-end justify-between gap-3">
              <div className="h-9 w-12 animate-pulse rounded bg-muted" />
              <div className="mb-1 h-6 w-16 animate-pulse rounded-full bg-muted" />
            </div>
            <div className="mt-2 h-3 w-32 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </section>

      {quickActions}

      {operationCount > 0 && (
        <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
          <div className="space-y-5">
            {sections.orders && <PanelSkeleton titleWidth="w-36" />}
            {sections.jobs && <PanelSkeleton titleWidth="w-48" />}
            {sections.inventory && <PanelSkeleton titleWidth="w-40" rows={2} />}
          </div>
          <div className="space-y-5">
            {sections.orders && <ActivitySkeleton chart />}
            {sections.jobs && <ActivitySkeleton />}
            {(sections.orders || sections.jobs) && (
              <ActivitySkeleton />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
