import type { ServiceAppointmentStatus } from '@/types/commerce-tables';

export const ACTIVE_TASK_STATUSES: readonly ServiceAppointmentStatus[] = [
  'requested', 'confirmed', 'in_service', 'ready_for_pickup',
];

type Task = {
  status: ServiceAppointmentStatus;
  scheduled_at: string | null;
  preferred_start_at: string;
  updated_at: string;
};

const priority: Record<ServiceAppointmentStatus, number> = {
  in_service: 0,
  confirmed: 1,
  ready_for_pickup: 2,
  requested: 3,
  completed: 4,
  cancelled: 5,
  no_show: 5,
};

export function compareTechnicianTasks(a: Task, b: Task) {
  const statusOrder = priority[a.status] - priority[b.status];
  if (statusOrder) return statusOrder;
  if (a.status === 'completed' && b.status === 'completed') {
    return Date.parse(b.updated_at) - Date.parse(a.updated_at);
  }
  return Date.parse(a.scheduled_at ?? a.preferred_start_at) - Date.parse(b.scheduled_at ?? b.preferred_start_at);
}

export function isPastConfirmedTask(task: Pick<Task, 'status' | 'scheduled_at'>, now: number) {
  return task.status === 'confirmed' && !!task.scheduled_at && Date.parse(task.scheduled_at) < now;
}
