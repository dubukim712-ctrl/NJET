import { Boxes, ShoppingBag, Wrench } from 'lucide-react';
import { ServiceAppointmentStatusBadge } from '@/components/appointments/ServiceAppointmentStatusBadge';
import { formatPhp } from '@/lib/commerce';
import { OrderStatusBadge } from '@/components/commerce/OrderStatusBadge';
import { formatDashboardDate, EmptyState, LoadError, PanelHeader } from './StaffDashboardWidgets';
import type { StaffDashboardData } from '@/data/dashboard/queries';

export function StaffDashboardOperations({
  data,
  showInventoryBranch,
  isTechnician,
}: {
  data: StaffDashboardData;
  showInventoryBranch: boolean;
  isTechnician: boolean;
}) {
  return (
    <div className="space-y-5">
      {data.orders && (
        <section id="orders" aria-labelledby="orders-heading" className="rounded-lg border border-border bg-card">
          <PanelHeader icon={ShoppingBag} eyebrow="Sales" title="Recent orders" id="orders-heading" />
          {data.orders.error ? <LoadError message={data.orders.error} href="/admin/orders" /> : (
            <div className="divide-y divide-border">
              {data.orders.data?.recent.length ? data.orders.data.recent.map((order) => (
                <div key={order.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-[10rem]">
                    <p className="font-medium">{order.customer_name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {order.order_number} · {formatPhp(order.total_minor)}
                    </p>
                  </div>
                  <OrderStatusBadge status={order.status} />
                </div>
              )) : <EmptyState>No recent orders.</EmptyState>}
            </div>
          )}
        </section>
      )}

      {data.appointments && (
        <section id="jobs" aria-labelledby="jobs-heading" className="rounded-lg border border-border bg-card">
          <PanelHeader
            icon={Wrench}
            eyebrow="Service"
            title={isTechnician ? "My tasks" : "Technician job board"}
            id="jobs-heading"
          />
          {data.appointments.error ? <LoadError message={data.appointments.error} href="/admin/appointments" /> : (
            <div className="divide-y divide-border">
              {data.appointments.data?.queue.length ? data.appointments.data.queue.map((job) => (
                <div key={job.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-[10rem]">
                    <p className="font-medium">{job.appointment_number} · {job.customer_name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {job.scheduled_at
                        ? formatDashboardDate(job.scheduled_at)
                        : `Requested · ${formatDashboardDate(job.preferred_start_at)}`}
                    </p>
                  </div>
                  <ServiceAppointmentStatusBadge status={job.status} />
                </div>
              )) : <EmptyState>{isTechnician ? "No assigned tasks." : "No open service appointments."}</EmptyState>}
            </div>
          )}
        </section>
      )}

      {data.inventory && (
        <section id="inventory" aria-labelledby="inventory-heading" className="rounded-lg border border-border bg-card">
          <PanelHeader icon={Boxes} eyebrow="Operations" title="Inventory watch" id="inventory-heading" />
          {data.inventory.error ? <LoadError message={data.inventory.error} href="/admin/products" /> : (
            <div className="grid gap-px bg-border sm:grid-cols-3">
              {data.inventory.data?.lowestStock.length ? data.inventory.data.lowestStock.map((item) => (
                <div key={item.id} className="bg-card p-4">
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{item.sku}</p>
                  {showInventoryBranch && item.branchName && (
                    <p className="mt-1 text-xs text-muted-foreground">{item.branchName}</p>
                  )}
                  <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                    item.stock === 0
                      ? 'bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-200'
                      : 'bg-yellow-100 text-yellow-900 dark:bg-yellow-900/30 dark:text-yellow-200'
                  }`}>
                    {item.stock === 0 ? 'Out of stock' : `${item.stock} in stock`}
                  </span>
                </div>
              )) : <EmptyState>No branch inventory records found.</EmptyState>}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
