'use client';

import Link from 'next/link';
import type { FormEventHandler, ReactNode } from 'react';

export function CheckoutFormLayout({
  onSubmit,
  cartError,
  catalogError,
  loadingCart,
  error,
  requiresLogin,
  fields,
  summary,
}: {
  onSubmit: FormEventHandler<HTMLFormElement>;
  cartError: string | null;
  catalogError: string | null;
  loadingCart: boolean;
  error: string | null;
  requiresLogin: boolean;
  fields: ReactNode;
  summary: ReactNode;
}) {
  return (
    <form className="grid gap-6 lg:grid-cols-[1fr_21rem]" onSubmit={onSubmit}>
      <div className="space-y-5">
        {cartError && (
          <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">
            {cartError}
          </p>
        )}
        {(catalogError || loadingCart) && (
          <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground" role="status">
            {catalogError ?? 'Loading current product details...'}
          </p>
        )}
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
            <p>{error}</p>
            {requiresLogin && (
              <Link href="/login?redirect=%2Fcheckout" className="mt-2 inline-flex min-h-8 items-center font-medium underline underline-offset-4">
                Sign in to continue
              </Link>
            )}
          </div>
        )}
        {fields}
      </div>
      {summary}
    </form>
  );
}
