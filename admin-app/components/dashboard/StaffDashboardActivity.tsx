import {
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  PackageCheck,
} from 'lucide-react';
import { formatPhp } from '@/lib/commerce';
import type { StaffDashboardData } from '@/data/dashboard/queries';
import { EmptyState, formatDashboardDate, LoadError } from './StaffDashboardWidgets';

type Activity = {
  id: string;
  title: string;
  detail: string;
  createdAt: string;
};

export function StaffDashboardActivity({ data }: { data: StaffDashboardData }) {
  const weeklyActivity = data.orders?.data?.weeklyActivity ?? [];
  const weeklyMax = Math.max(...weeklyActivity.map((item) => item.count), 1);
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
      detail: `${appointment.customer_name} · ${appointment.status.replaceAll('_', ' ')}`,
      createdAt: appointment.created_at,
    })) ?? []),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-5">
      {data.orders && (
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
          {data.orders.error ? <LoadError message={data.orders.error} href="/admin/orders" /> : (
            <>
              <div
                className="mt-6 flex h-28 items-end justify-between gap-2"
                aria-label="Daily order counts for the last week"
              >
                {weeklyActivity.map((item, index) => (
                  <div key={`${item.day}-${index}`} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                    <span className="text-xs text-muted-foreground">{item.count}</span>
                    <div
                      className="w-full rounded-t-sm bg-primary/80"
                      style={{ height: `${Math.max((item.count / weeklyMax) * 100, 4)}%` }}
                    />
                    <span className="text-xs text-muted-foreground">{item.day}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Orders created · Philippine time</p>
            </>
          )}
        </section>
      )}

      {data.appointments && (
        <section id="schedule" aria-labelledby="schedule-heading" className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Today</p>
              <h2 id="schedule-heading" className="mt-1 text-lg font-semibold">Schedule</h2>
            </div>
            <CalendarDays className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          {data.appointments.error ? <LoadError message={data.appointments.error} href="/admin/appointments" /> : (
            <ol className="mt-5 space-y-4">
              {data.appointments.data?.todaySchedule.length ? data.appointments.data.todaySchedule.map((item) => (
                <li key={item.id} className="flex gap-3">
                  <time className="w-20 shrink-0 pt-0.5 text-xs font-semibold text-primary">
                    {formatDashboardDate(item.scheduled_at ?? item.preferred_start_at)}
                  </time>
                  <p className="border-l-2 border-border pl-3 text-sm leading-5">
                    {item.appointment_number} · {item.customer_name} · {item.status.replaceAll('_', ' ')}
                  </p>
                </li>
              )) : <EmptyState>No appointments are scheduled for today.</EmptyState>}
            </ol>
          )}
        </section>
      )}

      {(data.orders || data.appointments) && (
        <section aria-labelledby="activity-heading" className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 id="activity-heading" className="text-lg font-semibold">Recent activity</h2>
            <PackageCheck className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          {activity.length ? (
            <ul className="mt-4 space-y-4">
              {activity.map((item) => (
                <li key={item.id} className="flex gap-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
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
            <EmptyState>
              {data.orders?.error ?? data.appointments?.error ?? 'No recent activity to show.'}
            </EmptyState>
          )}
        </section>
      )}
    </div>
  );
}
