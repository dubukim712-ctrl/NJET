import type { ServiceAppointmentStatus } from '@/types/commerce-tables';

const STATUS_COLORS: Record<ServiceAppointmentStatus, string> = {
  requested: 'bg-yellow-100 text-yellow-900 dark:bg-yellow-900/30 dark:text-yellow-200',
  confirmed: 'bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-200',
  in_service: 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900/30 dark:text-indigo-200',
  ready_for_pickup: 'bg-purple-100 text-purple-900 dark:bg-purple-900/30 dark:text-purple-200',
  completed: 'bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-200',
  cancelled: 'bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-200',
  no_show: 'bg-orange-100 text-orange-900 dark:bg-orange-900/30 dark:text-orange-200',
};

export function ServiceAppointmentStatusBadge({
  status,
}: {
  status: ServiceAppointmentStatus;
}) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${STATUS_COLORS[status]}`}>
      {status.replaceAll('_', ' ')}
    </span>
  );
}
