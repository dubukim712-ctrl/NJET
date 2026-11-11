import Link from 'next/link';
import {
  ArrowUpRight,
  Boxes,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  ClipboardList,
  PackageCheck,
  Shield,
  ShoppingBag,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import type { UserProfile } from '@/types/database';
import {
  CALENDAR_ITEMS,
  INVENTORY_ITEMS,
  RECENT_ACTIVITY,
  SALES_ORDERS,
  STAFF_METRICS,
  TECHNICIAN_JOBS,
  WEEKLY_ACTIVITY,
} from '@/data/dashboard/demo';

type StaffView = keyof typeof STAFF_METRICS;

export function StaffLandingPage({ profile }: { profile: UserProfile }) {
  const isAdmin = profile.is_full_access;
  const isSales = profile.role === 'sales';
  const isTechnician = profile.role === 'technician';
  const view: StaffView | null = isAdmin
    ? 'admin'
    : isSales
      ? 'sales'
      : isTechnician
        ? 'technician'
        : null;
  const metrics = view
    ? STAFF_METRICS[view]
    : [{ label: 'Workspace', value: 'Ready', note: 'Your staff access is active' }];
  const showOrders = isAdmin || isSales;
  const showJobs = isAdmin || isTechnician;
  const showInventory = isAdmin || isTechnician;
  const showReports = isAdmin || isSales;
  const roleName = profile.role_name || 'Staff';
  const quickActions: { href: string; label: string; icon: LucideIcon }[] = [
    ...(showOrders ? [{ href: '#orders', label: 'Sales orders', icon: ShoppingBag }] : []),
    ...(showJobs ? [{ href: '#jobs', label: 'Service queue', icon: Wrench }] : []),
    ...(showInventory ? [{ href: '#inventory', label: 'Inventory', icon: Boxes }] : []),
    { href: '#schedule', label: 'Today’s schedule', icon: CalendarDays },
    ...(hasPermission(profile, PERMISSIONS.usersRead)
      ? [{ href: '/admin/users', label: 'Customers & team', icon: Users }]
      : []),
    ...(hasPermission(profile, PERMISSIONS.rolesRead)
      ? [{ href: '/admin/roles', label: 'Roles & access', icon: Shield }]
      : []),
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header className="flex flex-col gap-5 border-b border-border/80 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
              {roleName} workspace
            </span>
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              Sample data
            </span>
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            Tuesday · Daily overview
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
            Welcome back, {profile.full_name?.split(' ')[0] || 'there'}.
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            {isSales
              ? 'Keep customer orders moving and stay ahead of the day.'
              : isTechnician
                ? 'Your service queue, parts, and schedule at a glance.'
                : 'A clear view of today across sales, service, and operations.'}
          </p>
        </div>
        {isAdmin && (
          <Link
            href="/dashboard"
            className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 sm:self-auto"
          >
            <ShoppingBag className="h-4 w-4" aria-hidden="true" />
            Preview storefront
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}
      </header>

      <section aria-label="Overview metrics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric, index) => (
          <article
            key={metric.label}
            className="rounded-lg border border-border bg-card p-5 shadow-sm shadow-foreground/[0.03]"
          >
            <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>
            <div className="mt-4 flex items-end justify-between gap-3">
              <p className="text-3xl font-semibold tracking-tight">{metric.value}</p>
              <span className="mb-1 rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
                {index === 0 ? 'Today' : 'Demo'}
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{metric.note}</p>
          </article>
        ))}
      </section>

      <section aria-labelledby="quick-actions-heading">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="quick-actions-heading" className="text-lg font-semibold tracking-tight">
            Quick actions
          </h2>
          <span className="text-xs text-muted-foreground">Jump to a workspace section</span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="flex min-h-12 items-center gap-2 rounded-md border border-border bg-card px-3 py-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <action.icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span>{action.label}</span>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          {showOrders && (
            <section id="orders" aria-labelledby="orders-heading" className="rounded-lg border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Sales</p>
                  <h2 id="orders-heading" className="mt-1 text-lg font-semibold">Recent orders</h2>
                </div>
                <ShoppingBag className="h-5 w-5 text-primary" aria-hidden="true" />
              </div>
              <div className="divide-y divide-border">
                {SALES_ORDERS.map((order) => (
                  <div key={order.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                    <div className="min-w-[10rem]">
                      <p className="font-medium">{order.customer}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{order.id} · {order.total}</p>
                    </div>
                    <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                      {order.status}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {showJobs && (
            <section id="jobs" aria-labelledby="jobs-heading" className="rounded-lg border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Service</p>
                  <h2 id="jobs-heading" className="mt-1 text-lg font-semibold">Technician job board</h2>
                </div>
                <Wrench className="h-5 w-5 text-primary" aria-hidden="true" />
              </div>
              <div className="divide-y divide-border">
                {TECHNICIAN_JOBS.map((job) => (
                  <div key={job.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                    <div className="min-w-[10rem]">
                      <p className="font-medium">{job.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{job.id} · {job.customer} · {job.time}</p>
                    </div>
                    <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
                      {job.status}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {showInventory && (
            <section id="inventory" aria-labelledby="inventory-heading" className="rounded-lg border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Operations</p>
                  <h2 id="inventory-heading" className="mt-1 text-lg font-semibold">Inventory watch</h2>
                </div>
                <Boxes className="h-5 w-5 text-primary" aria-hidden="true" />
              </div>
              <div className="grid gap-px bg-border sm:grid-cols-3">
                {INVENTORY_ITEMS.map((item) => (
                  <div key={item.name} className="bg-card p-4">
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{item.stock}</p>
                    <p className="mt-1 text-xs font-medium text-primary">{item.level}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="space-y-5">
          {showReports && (
            <section aria-labelledby="report-heading" className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-primary">
                  <ChartNoAxesColumnIncreasing className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Reports</p>
                  <h2 id="report-heading" className="font-semibold">Weekly activity</h2>
                </div>
              </div>
              <div className="mt-6 flex h-28 items-end justify-between gap-2" aria-label="Illustrative weekly activity chart">
                {WEEKLY_ACTIVITY.map((item, index) => (
                  <div key={`${item.day}-${index}`} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                    <div className="w-full rounded-t-sm bg-primary/80" style={{ height: item.height }} />
                    <span className="text-xs text-muted-foreground">{item.day}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Illustrative sample activity · live reports not connected</p>
            </section>
          )}

          <section id="schedule" aria-labelledby="schedule-heading" className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Today</p>
                <h2 id="schedule-heading" className="mt-1 text-lg font-semibold">Schedule</h2>
              </div>
              <CalendarDays className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <ol className="mt-5 space-y-4">
              {CALENDAR_ITEMS.map((item) => (
                <li key={item.time} className="flex gap-3">
                  <time className="w-12 shrink-0 pt-0.5 text-xs font-semibold text-primary">{item.time}</time>
                  <p className="border-l-2 border-border pl-3 text-sm leading-5">{item.label}</p>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="activity-heading" className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <h2 id="activity-heading" className="text-lg font-semibold">Recent activity</h2>
              <PackageCheck className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <ul className="mt-4 space-y-4">
              {RECENT_ACTIVITY.map((item) => (
                <li key={item.title} className="flex gap-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        Demo workspace content only. Connect orders, service, and inventory data before operational use.
      </p>
    </div>
  );
}
