'use client';

import Link from 'next/link';
import { ArrowRight, CircleHelp, Package, ShoppingBag, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  CustomerProfileQueryError,
  useCustomerProfileQuery,
} from '@/data/auth/customer-profile-client';

export function StorefrontLandingPage({
  userId,
  permissionError,
}: {
  userId: string;
  permissionError: boolean;
}) {
  const query = useCustomerProfileQuery(userId);

  if (!query.data && query.isPending) {
    return (
      <div className="space-y-6" role="status" aria-label="Loading dashboard" aria-busy="true">
        <div className="h-56 animate-pulse rounded-2xl bg-muted" />
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (!query.data) {
    return (
      <section className="space-y-3 rounded-xl border bg-card p-6">
        <p className="text-sm text-destructive" role="alert">
          {query.error instanceof CustomerProfileQueryError
            ? query.error.message
            : 'Your dashboard could not be loaded. Please try again.'}
        </p>
        <Button type="button" variant="outline" onClick={() => { void query.refetch(); }}>
          Try again
        </Button>
      </section>
    );
  }

  const profile = query.data;
  const firstName = profile.full_name?.split(' ')[0] || 'there';

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {permissionError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
          You don&apos;t have permission to access that page.
        </div>
      )}
      {query.isError && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
          Your profile could not be refreshed. Showing the last loaded information.
          <button
            type="button"
            className="ml-2 font-medium underline underline-offset-4"
            onClick={() => { void query.refetch(); }}
          >
            Try again
          </button>
        </p>
      )}

      <section className="rounded-2xl bg-primary px-5 py-8 text-primary-foreground sm:px-10 sm:py-12">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-80">Noel &amp; Jane E-bike Trading</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-5xl">Welcome back, {firstName}.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 opacity-90 sm:text-base">
          Find e-bikes, dependable spare parts, and useful accessories for your next ride.
        </p>
        <Link
          href="/shop"
          className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-md bg-background px-5 text-sm font-semibold text-foreground transition-colors hover:bg-background/90"
        >
          Browse products <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/shop" className="rounded-xl border bg-card p-5 transition-colors hover:bg-accent">
          <ShoppingBag className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 className="mt-3 font-semibold">Shop the catalog</h2>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">Browse e-bikes, spare parts, and accessories.</p>
        </Link>
        <Link href="/dashboard/orders" className="rounded-xl border bg-card p-5 transition-colors hover:bg-accent">
          <Package className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 className="mt-3 font-semibold">Your orders</h2>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">Review orders and their latest status.</p>
        </Link>
        <Link href="/dashboard/profile" className="rounded-xl border bg-card p-5 transition-colors hover:bg-accent">
          <UserRound className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 className="mt-3 font-semibold">Your account</h2>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">{profile.email}</p>
        </Link>
      </section>

      <div className="rounded-xl border bg-card p-5 sm:flex sm:items-center sm:justify-between sm:gap-5">
        <div>
          <h2 className="font-semibold">Need help?</h2>
          <p className="mt-1 text-sm text-muted-foreground">Our team can help with products, orders, and store pickup.</p>
        </div>
        <Link href="/dashboard/help" className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium hover:bg-accent sm:mt-0">
          <CircleHelp className="h-4 w-4" aria-hidden="true" /> Contact support
        </Link>
      </div>
    </div>
  );
}
