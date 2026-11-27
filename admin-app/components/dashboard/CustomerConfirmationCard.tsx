import { CircleCheck } from 'lucide-react';
import type { ReactNode } from 'react';

export function CustomerConfirmationCard({ title, reference, status, children, actions }: {
  title: string;
  reference: string;
  status: ReactNode;
  children: ReactNode;
  actions: ReactNode;
}) {
  return (
    <section className="mx-auto w-full max-w-2xl space-y-5 rounded-2xl border bg-card p-5 sm:p-8">
      <div className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <CircleCheck aria-hidden="true" />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
      <div className="flex flex-wrap items-center gap-3">
        <p className="font-semibold">{reference}</p>
        {status}
      </div>
      {children}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">{actions}</div>
    </section>
  );
}
