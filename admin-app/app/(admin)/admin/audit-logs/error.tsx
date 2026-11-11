'use client';

import { AlertTriangle } from 'lucide-react';

export default function AuditLogsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card px-6 py-16 text-center">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="h-6 w-6" aria-hidden="true" />
      </span>
      <h2 className="text-lg font-semibold">Could not load audit logs</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Something went wrong while loading this page. Please try again.
        {error.digest ? (
          <span className="mt-1 block text-xs opacity-70">
            Reference: {error.digest}
          </span>
        ) : null}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-5 inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Try again
      </button>
    </div>
  );
}
