import type { createClient } from '@/data/supabase/server';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import type { UserProfile } from '@/types/database';
import type { ServiceAppointmentStatus } from '@/types/commerce-tables';
import type {
  AppointmentsOverview,
  DashboardSection,
  OrdersOverview,
  StaffDashboardData,
} from './types';
import { loadDashboardInventory } from './inventory-queries';
import { loadDashboardTeamMembers } from './team-queries';

export type {
  DashboardActivityDay,
  DashboardAppointment,
  DashboardInventoryItem,
  DashboardOrder,
  DashboardSection,
  StaffDashboardData,
} from './types';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

const OPEN_APPOINTMENT_STATUSES = [
  'requested',
  'confirmed',
  'in_service',
  'ready_for_pickup',
] as const satisfies readonly ServiceAppointmentStatus[];

function manilaDayRange() {
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const start = new Date(`${date}T00:00:00+08:00`);
  return {
    start: start.toISOString(),
    end: new Date(start.getTime() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

function manilaWeekDays() {
  const { start } = manilaDayRange();
  const today = new Date(start);
  return Array.from({ length: 7 }, (_, index) => {
    const dayStart = new Date(today.getTime() - (6 - index) * 24 * 60 * 60 * 1000);
    return {
      start: dayStart.toISOString(),
      end: new Date(dayStart.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      day: new Intl.DateTimeFormat('en-PH', {
        weekday: 'short',
        timeZone: 'Asia/Manila',
      }).format(dayStart),
    };
  });
}

async function loadOrders(
  supabase: SupabaseClient,
  branchId: string | null
): Promise<DashboardSection<OrdersOverview>> {
  try {
    const { start, end } = manilaDayRange();
    const todayQuery = supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', start)
      .lt('created_at', end);
    const awaitingQuery = supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'awaiting_confirmation');
    const confirmedQuery = supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'confirmed');
    const recentQuery = supabase
      .from('orders')
      .select('id, order_number, customer_name, status, total_minor, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    if (branchId) {
      todayQuery.eq('branch_id', branchId);
      awaitingQuery.eq('branch_id', branchId);
      confirmedQuery.eq('branch_id', branchId);
      recentQuery.eq('branch_id', branchId);
    }
    const weekDays = manilaWeekDays();
    const [baseResults, weekResults] = await Promise.all([
      Promise.all([todayQuery, awaitingQuery, confirmedQuery, recentQuery]),
      Promise.all(weekDays.map(({ start: dayStart, end: dayEnd }) => {
        const query = supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', dayStart)
          .lt('created_at', dayEnd);
        if (branchId) query.eq('branch_id', branchId);
        return query;
      })),
    ]);
    const [todayResult, awaitingResult, confirmedResult, recentResult] = baseResults;
    const error =
      todayResult.error ??
      awaitingResult.error ??
      confirmedResult.error ??
      recentResult.error ??
      weekResults.find((result) => result.error)?.error;
    if (error) throw error;
    return {
      data: {
        todayCount: todayResult.count ?? 0,
        awaitingConfirmationCount: awaitingResult.count ?? 0,
        confirmedCount: confirmedResult.count ?? 0,
        recent: recentResult.data ?? [],
        weeklyActivity: weekDays.map(({ day }, index) => ({
          day,
          count: weekResults[index].count ?? 0,
        })),
      },
      error: null,
    };
  } catch (error) {
    console.error('Could not load dashboard orders.', error);
    return { data: null, error: 'Order overview could not be loaded.' };
  }
}

async function loadAppointments(
  supabase: SupabaseClient,
  branchId: string | null
): Promise<DashboardSection<AppointmentsOverview>> {
  try {
    const { start, end } = manilaDayRange();
    const openQuery = supabase
      .from('service_appointments')
      .select('id', { count: 'exact', head: true })
      .in('status', [...OPEN_APPOINTMENT_STATUSES]);
    const todayQuery = supabase
      .from('service_appointments')
      .select('id', { count: 'exact', head: true })
      .in('status', [...OPEN_APPOINTMENT_STATUSES])
      .gte('scheduled_at', start)
      .lt('scheduled_at', end);
    const inProgressQuery = supabase
      .from('service_appointments')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'in_service');
    const queueQuery = supabase
      .from('service_appointments')
      .select('id, appointment_number, customer_name, status, scheduled_at, preferred_start_at, created_at')
      .in('status', [...OPEN_APPOINTMENT_STATUSES])
      .order('scheduled_at', { ascending: true, nullsFirst: true })
      .order('preferred_start_at', { ascending: true })
      .limit(5);
    const todayScheduleQuery = supabase
      .from('service_appointments')
      .select('id, appointment_number, customer_name, status, scheduled_at, preferred_start_at, created_at')
      .in('status', [...OPEN_APPOINTMENT_STATUSES])
      .gte('scheduled_at', start)
      .lt('scheduled_at', end)
      .order('scheduled_at', { ascending: true })
      .limit(5);
    const recentQuery = supabase
      .from('service_appointments')
      .select('id, appointment_number, customer_name, status, scheduled_at, preferred_start_at, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    if (branchId) {
      openQuery.eq('branch_id', branchId);
      todayQuery.eq('branch_id', branchId);
      inProgressQuery.eq('branch_id', branchId);
      queueQuery.eq('branch_id', branchId);
      todayScheduleQuery.eq('branch_id', branchId);
      recentQuery.eq('branch_id', branchId);
    }
    const [
      openResult,
      todayResult,
      inProgressResult,
      queueResult,
      todayScheduleResult,
      recentResult,
    ] = await Promise.all([
      openQuery,
      todayQuery,
      inProgressQuery,
      queueQuery,
      todayScheduleQuery,
      recentQuery,
    ]);
    const error =
      openResult.error ??
      todayResult.error ??
      inProgressResult.error ??
      queueResult.error ??
      todayScheduleResult.error ??
      recentResult.error;
    if (error) throw error;
    return {
      data: {
        openCount: openResult.count ?? 0,
        todayCount: todayResult.count ?? 0,
        inProgressCount: inProgressResult.count ?? 0,
        queue: queueResult.data ?? [],
        todaySchedule: todayScheduleResult.data ?? [],
        recent: recentResult.data ?? [],
      },
      error: null,
    };
  } catch (error) {
    console.error('Could not load dashboard service appointments.', error);
    return { data: null, error: 'Service overview could not be loaded.' };
  }
}

export async function getStaffDashboardData(
  supabase: SupabaseClient,
  profile: UserProfile,
  selectedBranchId: string | null
): Promise<StaffDashboardData> {
  const isBranchScopedStaff = profile.scope === 'staff' && !profile.is_full_access;
  const branchId = isBranchScopedStaff ? profile.branch_id : selectedBranchId;
  const canLoadBranchData = !isBranchScopedStaff || Boolean(profile.branch_id);
  const [orders, appointments, inventory, teamMembers] = await Promise.all([
    canLoadBranchData && hasPermission(profile, PERMISSIONS.ordersRead)
      ? loadOrders(supabase, branchId)
      : Promise.resolve(null),
    canLoadBranchData && hasPermission(profile, PERMISSIONS.serviceAppointmentsRead)
      ? loadAppointments(supabase, branchId)
      : Promise.resolve(null),
    canLoadBranchData &&
    (hasPermission(profile, PERMISSIONS.productsRead) ||
      hasPermission(profile, PERMISSIONS.productsManage))
      ? loadDashboardInventory(supabase, branchId)
      : Promise.resolve(null),
    canLoadBranchData && hasPermission(profile, PERMISSIONS.usersRead)
      ? loadDashboardTeamMembers(supabase, branchId)
      : Promise.resolve(null),
  ]);
  return { orders, appointments, inventory, teamMembers };
}
