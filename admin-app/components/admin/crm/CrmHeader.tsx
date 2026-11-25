import { CrmNavigation } from './CrmNavigation';

export function CrmHeader({ current, title, description }: {
  current: 'customers' | 'follow-ups';
  title: string;
  description: string;
}) {
  return (
    <header className="flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Customer support</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <CrmNavigation current={current} />
    </header>
  );
}
