'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export function WalkInSaleActions({
  busy,
  canComplete,
}: {
  busy: boolean;
  canComplete: boolean;
}) {
  return (
    <footer className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      <Button type="button" variant="outline" asChild disabled={busy}>
        <Link href="/admin/orders">Cancel</Link>
      </Button>
      <Button type="submit" loading={busy} disabled={!canComplete}>
        Complete sale
      </Button>
    </footer>
  );
}
