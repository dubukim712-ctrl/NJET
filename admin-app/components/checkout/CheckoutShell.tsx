import type { ReactNode } from 'react';

export function CheckoutShell({ children }: { children?: ReactNode }) {
  return (
    <div className="mx-auto min-h-dvh max-w-7xl space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground">Noel &amp; Jane E-bike Trading</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Checkout</h1>
      </header>
      {children ?? (
        <div aria-busy="true" className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,21rem)]">
          <section className="min-w-0 space-y-4 rounded-xl border bg-card p-5 sm:p-6">
            <h2 className="text-lg font-semibold">Your information</h2>
            <div className="grid gap-4 sm:grid-cols-2" aria-hidden="true">
              <div className="h-24 animate-pulse rounded-lg bg-muted" />
              <div className="h-[9.5rem] animate-pulse rounded-lg bg-muted" />
            </div>
            <h3 className="text-sm font-semibold">Address</h3>
            <div className="grid gap-4 sm:grid-cols-2" aria-hidden="true">
              <div className="h-24 animate-pulse rounded-lg bg-muted sm:col-span-2" />
              {[0, 1, 2, 3].map((field) => (
                <div key={field} className="h-24 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          </section>
          <aside className="h-fit space-y-4 rounded-xl border bg-card p-4 sm:p-5">
            <h2 className="text-lg font-semibold">Order summary</h2>
            <div className="h-52 animate-pulse rounded-lg bg-muted" aria-hidden="true" />
            <p role="status" className="sr-only">Loading checkout information</p>
          </aside>
        </div>
      )}
    </div>
  );
}
