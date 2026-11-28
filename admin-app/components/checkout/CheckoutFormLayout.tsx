'use client';

import type { FormEventHandler, ReactNode } from 'react';

export function CheckoutFormLayout({
  onSubmit,
  cartError,
  catalogError,
  error,
  fields,
  summary,
}: {
  onSubmit: FormEventHandler<HTMLFormElement>;
  cartError: string | null;
  catalogError: string | null;
  error: string | null;
  fields: ReactNode;
  summary: ReactNode;
}) {
  return (
    <form className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,21rem)]" onSubmit={onSubmit}>
      <div className="min-w-0 space-y-5">
        {cartError && (
          <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">
            {cartError}
          </p>
        )}
        {catalogError && (
          <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground" role="status">
            {catalogError}
          </p>
        )}
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert" tabIndex={-1} data-checkout-error>
            <p>{error}</p>
          </div>
        )}
        {fields}
      </div>
      {summary}
    </form>
  );
}
