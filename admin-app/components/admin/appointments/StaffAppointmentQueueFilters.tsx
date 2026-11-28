import type { StaffAppointmentView } from '@/lib/validations/service-appointments';

const views: { id: StaffAppointmentView; label: string }[] = [
  { id: 'attention', label: 'Needs attention' },
  { id: 'today', label: 'Today' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'history', label: 'History' },
];

export function StaffAppointmentQueueFilters({ view, onChange }: {
  view: StaffAppointmentView;
  onChange: (view: StaffAppointmentView) => void;
}) {
  return (
    <div role="group" aria-label="Appointment views" className="flex min-w-0 max-w-full flex-nowrap items-center gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible">
      {views.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          aria-pressed={view === id}
          className="min-h-11 shrink-0 whitespace-nowrap rounded-full border bg-card px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring hover:bg-accent aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary"
          onClick={() => onChange(id)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
