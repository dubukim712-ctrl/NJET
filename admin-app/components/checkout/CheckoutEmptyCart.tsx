'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export function CheckoutEmptyCart({ cartError }: { cartError: string | null }) {
  return (
    <section className="rounded-xl border bg-card p-8 text-center">
      {cartError && <p className="mb-4 text-sm text-destructive" role="alert">{cartError}</p>}
      <h1 className="text-xl font-semibold">Your cart is empty</h1>
      <p className="mt-2 text-sm text-muted-foreground">Add products before starting checkout.</p>
      <Button asChild className="mt-5"><Link href="/shop">Browse products</Link></Button>
    </section>
  );
}
