'use client';

import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function StorefrontError({
  error, retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <section role="alert" className="rounded-xl border bg-card px-6 py-12 text-center">
      <AlertTriangle aria-hidden="true" className="mx-auto mb-3 size-6 text-destructive" />
      <h2 className="text-lg font-semibold">We couldn&apos;t load this page</h2>
      <p className="mt-2 text-sm text-muted-foreground">Try again to reload the page.</p>
      {error.digest && <p className="mt-1 text-xs text-muted-foreground">Reference {error.digest}</p>}
      <Button type="button" onClick={retry} className="mt-5 min-h-11">Try again</Button>
    </section>
  );
}
