import Link from 'next/link';
import { type LucideIcon } from 'lucide-react';
import type { UserProfile } from '@/types/database';
import type { StaffDashboardData } from '@/data/dashboard/queries';

type Metric = { label: string; value: number | string; note: string };

export function formatDashboardDate(value: string) {
  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Manila',
  }).format(new Date(value));
}

function metricList(
  profile: UserProfile,
  data: StaffDashboardData,
  selectedBranchName: string | null
): Metric[] {
  const isAdmin = profile.is_full_access;
  const isSales = profile.role === 'sales';
  const isTechnician = profile.role === 'technician';
  const metrics: Metric[] = [];
  if ((isAdmin || isSales) && data.orders?.data) {
    metrics.push({ label: 'Orders today', value: data.orders.data.todayCount, note: 'Created today' });
    if (isSales) {
      metrics.push(
        {
          label: 'Awaiting confirmation',
          value: data.orders.data.awaitingConfirmationCount,
          note: 'Needs order review',
        },
        {
          label: 'Confirmed orders',
          value: data.orders.data.confirmedCount,
          note: 'Ready for fulfillment',
        }
      );
    }
  }
  if ((isAdmin || isTechnician) && data.appointments?.data) {
    metrics.push({
      label: isTechnician ? 'Assigned today' : 'Open service jobs',
      value: isTechnician ? data.appointments.data.todayCount : data.appointments.data.openCount,
      note: isTechnician ? 'Scheduled appointments' : selectedBranchName ?? 'Across all branches',
    });
    if (isTechnician) {
      metrics.push({
        label: 'In progress',
        value: data.appointments.data.inProgressCount,
        note: 'Active service jobs',
      });
    }
  }
  if ((isAdmin || isTechnician) && data.inventory?.data) {
    metrics.push({
      label: 'Out of stock',
      value: data.inventory.data.outOfStockCount,
      note: 'Branch inventory records',
    });
  }
  if (profile.scope === 'staff' && data.teamMembers?.data != null) {
    metrics.push({ label: 'Team members', value: data.teamMembers.data, note: 'Staff accounts' });
  }
  if (!metrics.length) {
    if (data.orders?.data) {
      metrics.push({ label: 'Orders today', value: data.orders.data.todayCount, note: 'Created today' });
    }
    if (data.appointments?.data) {
      metrics.push({
        label: 'Open service jobs',
        value: data.appointments.data.openCount,
        note: 'Across your queue',
      });
    }
    if (data.inventory?.data) {
      metrics.push({
        label: 'Out of stock',
        value: data.inventory.data.outOfStockCount,
        note: 'Branch inventory records',
      });
    }
    if (data.teamMembers?.data != null) {
      metrics.push({ label: 'Team members', value: data.teamMembers.data, note: 'Staff accounts' });
    }
  }
  return metrics.length
    ? metrics
    : [{ label: 'Workspace', value: 'Ready', note: 'Your staff access is active' }];
}

export function DashboardMetrics({
  profile,
  data,
  selectedBranchName,
}: {
  profile: UserProfile;
  data: StaffDashboardData;
  selectedBranchName: string | null;
}) {
  const metrics = metricList(profile, data, selectedBranchName);

  return (
    <section
      aria-label="Overview metrics"
      className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))] gap-3"
    >
      {metrics.map((metric, index) => (
        <article key={metric.label} className="rounded-lg border border-border bg-card p-5 shadow-sm shadow-foreground/[0.03]">
          <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>
          <div className="mt-4 flex items-end justify-between gap-3">
            <p className="text-3xl font-semibold tracking-tight">{metric.value}</p>
            <span className="mb-1 rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
              {index === 0 ? 'Today' : 'Live'}
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{metric.note}</p>
        </article>
      ))}
    </section>
  );
}

export function LoadError({ message, href }: { message: string; href: string }) {
  return (
    <div className="p-5">
      <p className="text-sm text-destructive" role="alert">{message}</p>
      <Link href={href} className="mt-2 inline-block text-sm font-medium text-primary underline">
        Open workspace
      </Link>
    </div>
  );
}

export function PanelHeader({
  icon: Icon,
  eyebrow,
  title,
  id,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  id: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border px-5 py-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{eyebrow}</p>
        <h2 id={id} className="mt-1 text-lg font-semibold">{title}</h2>
      </div>
      <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
    </div>
  );
}

export function EmptyState({ children }: { children: string }) {
  return <p className="p-5 text-sm text-muted-foreground">{children}</p>;
}
