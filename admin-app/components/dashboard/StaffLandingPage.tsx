'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
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
import { useAdminProfile } from '@/components/providers/AdminProvider';
import { useAdminDashboardQuery } from '@/data/dashboard/admin-dashboard-client';
import type { DashboardBranchContext } from '@/data/dashboard/branch-context';
import type { RealtimeTable } from '@/types/realtime';
import { DashboardBranchSelector } from './DashboardBranchSelector';
import { DashboardRealtimeRefresh } from './DashboardRealtimeRefresh';
import { StaffDashboardDataQuery } from './StaffDashboardDataQuery';

export function StaffLandingPage() {
  const profile = useAdminProfile();
  const requestedBranchId = useSearchParams().get('branch');
  const query = useAdminDashboardQuery(profile, requestedBranchId);
  const isBranchScopedStaff = profile.scope === 'staff' && !profile.is_full_access;
  const branchContext: DashboardBranchContext = query.data?.branchContext ?? {
    branches:
      isBranchScopedStaff && profile.branch_id
        ? [{ id: profile.branch_id, name: profile.branch_name ?? 'Assigned branch' }]
        : [],
    selectedBranchId: isBranchScopedStaff ? profile.branch_id : null,
    selectedBranchName: profile.branch_name,
    canSelectBranch:
      !isBranchScopedStaff && hasPermission(profile, PERMISSIONS.branchesRead),
    error:
      isBranchScopedStaff && !profile.branch_id
        ? 'No branch is assigned to your account. Ask an administrator to assign one.'
        : null,
  };
  const isAdmin = profile.is_full_access;
  const isSales = profile.role === 'sales';
  const isTechnician = profile.role === 'technician';
  const canLoadBranchData =
    !(profile.scope === 'staff' && !profile.is_full_access) || Boolean(profile.branch_id);
  const showOrders = canLoadBranchData && hasPermission(profile, PERMISSIONS.ordersRead);
  const showJobs =
    canLoadBranchData && hasPermission(profile, PERMISSIONS.serviceAppointmentsRead);
  const showInventory =
    canLoadBranchData &&
    (hasPermission(profile, PERMISSIONS.productsRead) ||
      hasPermission(profile, PERMISSIONS.productsManage));
  const showTeam = canLoadBranchData && hasPermission(profile, PERMISSIONS.usersRead);
  const roleName = profile.role_name || 'Staff';
  const quickActions: { href: string; label: string; icon: LucideIcon }[] = [
    ...(showOrders ? [{ href: '/admin/orders', label: 'Sales orders', icon: ShoppingBag }] : []),
    ...(showJobs ? [{ href: '/admin/appointments', label: 'Service queue', icon: Wrench }] : []),
    ...(showInventory ? [{ href: '/admin/products', label: 'Inventory', icon: Boxes }] : []),
    ...(showJobs ? [{ href: '#schedule', label: 'Today’s schedule', icon: CalendarDays }] : []),
    ...(showTeam ? [{ href: '/admin/users', label: 'Customers & team', icon: Users }] : []),
    ...(hasPermission(profile, PERMISSIONS.rolesRead)
      ? [{ href: '/admin/roles', label: 'Roles & access', icon: Shield }]
      : []),
  ];
  const realtimeTables: RealtimeTable[] = [
    ...(showOrders ? ['orders' as const] : []),
    ...(showJobs ? ['service_appointments' as const] : []),
    ...(showInventory ? ['branch_inventory', 'product_variants', 'products'] as const : []),
    ...(showTeam ? ['users' as const] : []),
    ...(showTeam && hasPermission(profile, PERMISSIONS.rolesRead)
      ? ['roles' as const]
      : []),
    ...(branchContext.canSelectBranch ? ['branches' as const] : []),
  ];
  const today = new Intl.DateTimeFormat('en-PH', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'Asia/Manila',
  }).format(new Date());
  const quickActionsSection = (
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
  );

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header className="flex flex-col gap-5 border-b border-border/80 pb-6 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
              {roleName} workspace
            </span>
            <DashboardRealtimeRefresh
              profile={profile}
              branchId={branchContext.selectedBranchId}
              requestedBranchId={requestedBranchId}
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

      <StaffDashboardDataQuery
        profile={profile}
        branchName={branchContext.selectedBranchName}
        quickActions={quickActionsSection}
        data={query.data?.data}
        isPending={query.isPending}
        isError={query.isError}
        error={query.error}
        onRetry={() => { void query.refetch(); }}
      />
    </div>
  );
}
