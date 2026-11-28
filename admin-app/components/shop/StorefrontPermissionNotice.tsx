'use client';

import { useSearchParams } from 'next/navigation';

export function StorefrontPermissionNotice() {
  if (useSearchParams().get('error') !== 'insufficient_permissions') return null;
  return (
    <p role="alert" className="mx-auto max-w-7xl border border-destructive/30 p-3 text-sm text-destructive">
      You don&apos;t have permission to access that page.
    </p>
  );
}
