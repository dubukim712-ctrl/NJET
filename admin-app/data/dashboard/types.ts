import type { ServiceAppointmentStatus } from '@/types/commerce-tables';

export type DashboardSection<T> = {
  data: T | null;
  error: string | null;
};

export type DashboardOrder = {
  id: string;
  order_number: string;
  customer_name: string;
  status: string;
  total_minor: number;
  created_at: string;
};

export type DashboardAppointment = {
  id: string;
  appointment_number: string;
  customer_name: string;
  status: ServiceAppointmentStatus;
  scheduled_at: string | null;
  preferred_start_at: string;
  created_at: string;
};

export type DashboardInventoryItem = {
  id: string;
  name: string;
  sku: string;
  stock: number;
};

export type DashboardActivityDay = {
  day: string;
  count: number;
};

export type OrdersOverview = {
  todayCount: number;
  awaitingConfirmationCount: number;
  confirmedCount: number;
  recent: DashboardOrder[];
  weeklyActivity: DashboardActivityDay[];
};

export type AppointmentsOverview = {
  openCount: number;
  todayCount: number;
  inProgressCount: number;
  queue: DashboardAppointment[];
  todaySchedule: DashboardAppointment[];
  recent: DashboardAppointment[];
};

export type InventoryOverview = {
  outOfStockCount: number;
  lowestStock: DashboardInventoryItem[];
};

export type StaffDashboardData = {
  orders: DashboardSection<OrdersOverview> | null;
  appointments: DashboardSection<AppointmentsOverview> | null;
  inventory: DashboardSection<InventoryOverview> | null;
  teamMembers: DashboardSection<number> | null;
};
