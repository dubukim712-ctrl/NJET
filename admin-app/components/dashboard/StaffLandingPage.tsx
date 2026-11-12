import Link from "next/link";
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
} from "lucide-react";
import { formatPhp } from "@/lib/commerce";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import type { UserProfile } from "@/types/database";
import type { DashboardBranchContext } from "@/data/dashboard/branch-context";
import type { StaffDashboardData } from "@/data/dashboard/queries";
import { DashboardBranchSelector } from "./DashboardBranchSelector";
import {
  DashboardMetrics,
  EmptyState,
  formatDashboardDate,
  LoadError,
  PanelHeader,
} from "./StaffDashboardWidgets";

type Props = {
  profile: UserProfile;
  data: StaffDashboardData;
  branchContext: DashboardBranchContext;
};

type Activity = {
  id: string;
  title: string;
  detail: string;
  createdAt: string;
};

export function StaffLandingPage({ profile, data, branchContext }: Props) {
  const isAdmin = profile.is_full_access;
  const isSales = profile.role === "sales";
  const isTechnician = profile.role === "technician";
  const showOrders = Boolean(data.orders);
  const showJobs = Boolean(data.appointments);
  const showInventory = Boolean(data.inventory);
  const showReports = showOrders;
  const roleName = profile.role_name || "Staff";
  const quickActions: { href: string; label: string; icon: LucideIcon }[] = [
    ...(showOrders
      ? [{ href: "/admin/orders", label: "Sales orders", icon: ShoppingBag }]
      : []),
    ...(showJobs
      ? [{ href: "/admin/appointments", label: "Service queue", icon: Wrench }]
      : []),
    ...(showInventory
      ? [{ href: "/admin/products", label: "Inventory", icon: Boxes }]
      : []),
    ...(showJobs
      ? [{ href: "#schedule", label: "Today’s schedule", icon: CalendarDays }]
      : []),
    ...(data.teamMembers
      ? [{ href: "/admin/users", label: "Customers & team", icon: Users }]
      : []),
    ...(hasPermission(profile, PERMISSIONS.rolesRead)
      ? [{ href: "/admin/roles", label: "Roles & access", icon: Shield }]
      : []),
  ];
  const activity: Activity[] = [
    ...(data.orders?.data?.recent.map((order) => ({
      id: `order-${order.id}`,
      title: `Order ${order.order_number}`,
      detail: `${order.customer_name} · ${formatPhp(order.total_minor)}`,
      createdAt: order.created_at,
    })) ?? []),
    ...(data.appointments?.data?.recent.map((appointment) => ({
      id: `appointment-${appointment.id}`,
      title: `Appointment ${appointment.appointment_number}`,
      detail: `${appointment.customer_name} · ${appointment.status.replaceAll("_", " ")}`,
      createdAt: appointment.created_at,
    })) ?? []),
  ]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 5);
  const today = new Intl.DateTimeFormat("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila",
  }).format(new Date());
  const weeklyActivity = data.orders?.data?.weeklyActivity ?? [];
  const weeklyMax = Math.max(...weeklyActivity.map((item) => item.count), 1);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header className="flex flex-col gap-5 border-b border-border/80 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
              {roleName} workspace
            </span>
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              Live data
            </span>
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            {today} · Daily overview
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
            Welcome back, {profile.full_name?.split(" ")[0] || "there"}.
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            {isSales
              ? "Keep customer orders moving and stay ahead of the day."
              : isTechnician
                ? "Your service queue, inventory, and schedule at a glance."
                : "A clear view of today across sales, service, and operations."}
          </p>
        </div>
        <div className="flex flex-col gap-3 self-start sm:flex-row sm:items-end sm:self-auto">
          <DashboardBranchSelector context={branchContext} />
          {isAdmin && (
            <Link
              href="/dashboard"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              Preview storefront
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          )}
        </div>
      </header>

      <DashboardMetrics
        profile={profile}
        data={data}
        selectedBranchName={branchContext.selectedBranchName}
      />

      <section aria-labelledby="quick-actions-heading">
        <div className="mb-3 flex items-center justify-between">
          <h2
            id="quick-actions-heading"
            className="text-lg font-semibold tracking-tight"
          >
            Quick actions
          </h2>
          <span className="text-xs text-muted-foreground">
            Jump to a workspace section
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="flex min-h-12 items-center gap-2 rounded-md border border-border bg-card px-3 py-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <action.icon
                className="h-4 w-4 shrink-0 text-primary"
                aria-hidden="true"
              />
              <span>{action.label}</span>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          {showOrders && (
            <section
              id="orders"
              aria-labelledby="orders-heading"
              className="rounded-lg border border-border bg-card"
            >
              <PanelHeader
                icon={ShoppingBag}
                eyebrow="Sales"
                title="Recent orders"
                id="orders-heading"
              />
              {data.orders?.error ? (
                <LoadError message={data.orders.error} href="/admin/orders" />
              ) : (
                <div className="divide-y divide-border">
                  {data.orders?.data?.recent.length ? (
                    data.orders.data.recent.map((order) => (
                      <div
                        key={order.id}
                        className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                      >
                        <div className="min-w-[10rem]">
                          <p className="font-medium">{order.customer_name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {order.order_number} ·{" "}
                            {formatPhp(order.total_minor)}
                          </p>
                        </div>
                        <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium capitalize text-secondary-foreground">
                          {order.status.replaceAll("_", " ")}
                        </span>
                      </div>
                    ))
                  ) : (
                    <EmptyState>No recent orders.</EmptyState>
                  )}
                </div>
              )}
            </section>
          )}

          {showJobs && (
            <section
              id="jobs"
              aria-labelledby="jobs-heading"
              className="rounded-lg border border-border bg-card"
            >
              <PanelHeader
                icon={Wrench}
                eyebrow="Service"
                title="Technician job board"
                id="jobs-heading"
              />
              {data.appointments?.error ? (
                <LoadError
                  message={data.appointments.error}
                  href="/admin/appointments"
                />
              ) : (
                <div className="divide-y divide-border">
                  {data.appointments?.data?.queue.length ? (
                    data.appointments.data.queue.map((job) => (
                      <div
                        key={job.id}
                        className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                      >
                        <div className="min-w-[10rem]">
                          <p className="font-medium">
                            {job.appointment_number} · {job.customer_name}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {job.scheduled_at
                              ? formatDashboardDate(job.scheduled_at)
                              : `Requested · ${formatDashboardDate(job.preferred_start_at)}`}
                          </p>
                        </div>
                        <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-medium capitalize text-accent-foreground">
                          {job.status.replaceAll("_", " ")}
                        </span>
                      </div>
                    ))
                  ) : (
                    <EmptyState>No open service appointments.</EmptyState>
                  )}
                </div>
              )}
            </section>
          )}

          {showInventory && (
            <section
              id="inventory"
              aria-labelledby="inventory-heading"
              className="rounded-lg border border-border bg-card"
            >
              <PanelHeader
                icon={Boxes}
                eyebrow="Operations"
                title="Inventory watch"
                id="inventory-heading"
              />
              {data.inventory?.error ? (
                <LoadError
                  message={data.inventory.error}
                  href="/admin/products"
                />
              ) : (
                <div className="grid gap-px bg-border sm:grid-cols-3">
                  {data.inventory?.data?.lowestStock.length ? (
                    data.inventory.data.lowestStock.map((item) => (
                      <div key={item.id} className="bg-card p-4">
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {item.sku}
                        </p>
                        <p className="mt-1 text-xs font-medium text-primary">
                          {item.stock === 0
                            ? "Out of stock"
                            : `${item.stock} in stock`}
                        </p>
                      </div>
                    ))
                  ) : (
                    <EmptyState>No branch inventory records found.</EmptyState>
                  )}
                </div>
              )}
            </section>
          )}
        </div>

        <div className="space-y-5">
          {showReports && (
            <section
              aria-labelledby="report-heading"
              className="rounded-lg border border-border bg-card p-5"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-primary">
                  <ChartNoAxesColumnIncreasing
                    className="h-5 w-5"
                    aria-hidden="true"
                  />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Reports
                  </p>
                  <h2 id="report-heading" className="font-semibold">
                    Weekly activity
                  </h2>
                </div>
              </div>
              {data.orders?.error ? (
                <LoadError message={data.orders.error} href="/admin/orders" />
              ) : (
                <>
                  <div
                    className="mt-6 flex h-28 items-end justify-between gap-2"
                    aria-label="Daily order counts for the last week"
                  >
                    {weeklyActivity.map((item, index) => (
                      <div
                        key={`${item.day}-${index}`}
                        className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                      >
                        <span className="text-xs text-muted-foreground">
                          {item.count}
                        </span>
                        <div
                          className="w-full rounded-t-sm bg-primary/80"
                          style={{
                            height: `${Math.max((item.count / weeklyMax) * 100, 4)}%`,
                          }}
                        />
                        <span className="text-xs text-muted-foreground">
                          {item.day}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Orders created · Philippine time
                  </p>
                </>
              )}
            </section>
          )}

          {showJobs && (
            <section
              id="schedule"
              aria-labelledby="schedule-heading"
              className="rounded-lg border border-border bg-card p-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Today
                  </p>
                  <h2
                    id="schedule-heading"
                    className="mt-1 text-lg font-semibold"
                  >
                    Schedule
                  </h2>
                </div>
                <CalendarDays
                  className="h-5 w-5 text-primary"
                  aria-hidden="true"
                />
              </div>
              {data.appointments?.error ? (
                <LoadError
                  message={data.appointments.error}
                  href="/admin/appointments"
                />
              ) : (
                <ol className="mt-5 space-y-4">
                  {data.appointments?.data?.todaySchedule.length ? (
                    data.appointments.data.todaySchedule.map((item) => (
                      <li key={item.id} className="flex gap-3">
                        <time className="w-20 shrink-0 pt-0.5 text-xs font-semibold text-primary">
                          {formatDashboardDate(
                            item.scheduled_at ?? item.preferred_start_at,
                          )}
                        </time>
                        <p className="border-l-2 border-border pl-3 text-sm leading-5">
                          {item.appointment_number} · {item.customer_name} ·{" "}
                          {item.status.replaceAll("_", " ")}
                        </p>
                      </li>
                    ))
                  ) : (
                    <EmptyState>
                      No appointments are scheduled for today.
                    </EmptyState>
                  )}
                </ol>
              )}
            </section>
          )}

          {(showOrders || showJobs) && (
            <section
              aria-labelledby="activity-heading"
              className="rounded-lg border border-border bg-card p-5"
            >
              <div className="flex items-center justify-between">
                <h2 id="activity-heading" className="text-lg font-semibold">
                  Recent activity
                </h2>
                <PackageCheck
                  className="h-5 w-5 text-primary"
                  aria-hidden="true"
                />
              </div>
              {activity.length ? (
                <ul className="mt-4 space-y-4">
                  {activity.map((item) => (
                    <li key={item.id} className="flex gap-3">
                      <span
                        className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary"
                        aria-hidden="true"
                      />
                      <div>
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {item.detail} · {formatDashboardDate(item.createdAt)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState>No recent activity to show.</EmptyState>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
