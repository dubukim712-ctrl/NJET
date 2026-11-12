import Link from 'next/link';
import {
  ArrowUpRight,
  Boxes,
  CalendarDays,
  Shield,
  ShoppingBag,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import type { UserProfile } from '@/types/database';
import type { DashboardBranchContext } from '@/data/dashboard/branch-context';
import type { StaffDashboardData } from '@/data/dashboard/queries';
import type { RealtimeTable } from '@/types/realtime';
import { DashboardBranchSelector } from './DashboardBranchSelector';
import { DashboardRealtimeRefresh } from './DashboardRealtimeRefresh';
import { StaffDashboardActivity } from './StaffDashboardActivity';
import { StaffDashboardOperations } from './StaffDashboardOperations';
import { DashboardMetrics } from './StaffDashboardWidgets';

type Props = {
  profile: UserProfile;
  data: StaffDashboardData;
  branchContext: DashboardBranchContext;
  realtimeTables: RealtimeTable[];
};

export function StaffLandingPage({
  profile,
  data,
  branchContext,
  realtimeTables,
}: Props) {
  const isAdmin = profile.is_full_access;
  const isSales = profile.role === 'sales';
  const isTechnician = profile.role === 'technician';
  const showOrders = Boolean(data.orders);
  const showJobs = Boolean(data.appointments);
  const showInventory = Boolean(data.inventory);
  const roleName = profile.role_name || 'Staff';
  const quickActions: { href: string; label: string; icon: LucideIcon }[] = [
    ...(showOrders ? [{ href: '/admin/orders', label: 'Sales orders', icon: ShoppingBag }] : []),
    ...(showJobs ? [{ href: '/admin/appointments', label: 'Service queue', icon: Wrench }] : []),
    ...(showInventory ? [{ href: '/admin/products', label: 'Inventory', icon: Boxes }] : []),
    ...(showJobs ? [{ href: '#schedule', label: 'Today’s schedule', icon: CalendarDays }] : []),
    ...(data.teamMembers ? [{ href: '/admin/users', label: 'Customers & team', icon: Users }] : []),
    ...(hasPermission(profile, PERMISSIONS.rolesRead)
      ? [{ href: '/admin/roles', label: 'Roles & access', icon: Shield }]
      : []),
  ];
  const today = new Intl.DateTimeFormat('en-PH', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'Asia/Manila',
  }).format(new Date());

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header className="flex flex-col gap-5 border-b border-border/80 pb-6 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
              {roleName} workspace
            </span>
            <DashboardRealtimeRefresh
              branchId={branchContext.selectedBranchId}
              tables={realtimeTables}
            />
          </div>
          <p className="text-sm font-medium text-muted-foreground">{today} · Daily overview</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
            Welcome back, {profile.full_name?.split(' ')[0] || 'there'}.
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            {isSales
              ? 'Keep customer orders moving and stay ahead of the day.'
              : isTechnician
                ? 'Your service queue, inventory, and schedule at a glance.'
                : 'A clear view of today across sales, service, and operations.'}
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 self-start sm:w-auto sm:flex-row sm:items-end sm:self-auto">
          <DashboardBranchSelector context={branchContext} />
          {isAdmin && (
            <Link
              href="/dashboard"
              className="hidden min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 sm:inline-flex"
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
          <h2 id="quick-actions-heading" className="text-lg font-semibold tracking-tight">
            Quick actions
          </h2>
          <span className="text-xs text-muted-foreground">Jump to a workspace section</span>
        </div>
        <div
          className="overflow-x-auto pb-2"
          role="region"
          aria-label="Quick actions"
          tabIndex={0}
        >
          <div className="flex w-max min-w-full gap-2">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex min-h-12 shrink-0 items-center gap-2 whitespace-nowrap rounded-md border border-border bg-card px-3 py-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <action.icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <span>{action.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <StaffDashboardOperations data={data} />
        <StaffDashboardActivity data={data} />
      </div>
    </div>
  );
}
