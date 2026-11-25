import type { OrderView } from '@/lib/order-queue';

const views: { id: OrderView; label: string }[] = [
  { id: 'attention', label: 'Needs attention' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'completed', label: 'Completed' },
  { id: 'closed', label: 'Expired & Cancelled' },
  { id: 'all', label: 'All' },
];

export function OrderQueueViews({ view, onChange }: {
  view: OrderView;
  onChange: (view: OrderView) => void;
}) {
  return (
    <div role="group" aria-label="Order views" className="flex flex-wrap gap-2">
      {views.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          aria-pressed={view === id}
          className="min-h-11 rounded-full border bg-card px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:bg-accent aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary"
          onClick={() => onChange(id)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
