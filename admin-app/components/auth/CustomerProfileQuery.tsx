'use client';

import { ProfileForm } from '@/components/auth/ProfileForm';
import { Button } from '@/components/ui/Button';
import {
  CustomerProfileQueryError,
  useCustomerProfileQuery,
} from '@/data/auth/customer-profile-client';

export function CustomerProfileQuery({ userId }: { userId: string }) {
  const query = useCustomerProfileQuery(userId);

  if (!query.data && query.isPending) {
    return (
      <div className="space-y-4" role="status" aria-label="Loading profile" aria-busy="true">
        <div className="h-20 animate-pulse rounded-lg bg-muted" />
        <div className="h-32 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (!query.data) {
    return (
      <section className="space-y-3 rounded-xl border bg-card p-6">
        <p className="text-sm text-muted-foreground" role="alert">
          {query.error instanceof CustomerProfileQueryError
            ? query.error.message
            : 'We couldn’t load your profile. Please refresh the page or sign in again.'}
        </p>
        <Button type="button" variant="outline" onClick={() => { void query.refetch(); }}>
          Try again
        </Button>
      </section>
    );
  }

  return (
    <section
      className="rounded-xl border bg-card p-5 sm:p-6"
      aria-labelledby="profile-heading"
    >
      <h2 id="profile-heading" className="text-lg font-semibold">
        Personal information
      </h2>
      <dl className="mt-3 space-y-1 text-sm">
        <div className="flex flex-wrap gap-x-2">
          <dt className="text-muted-foreground">Email:</dt>
          <dd className="font-medium">{query.data.email}</dd>
        </div>
        <div className="flex flex-wrap gap-x-2">
          <dt className="text-muted-foreground">Role:</dt>
          <dd className="font-medium">{query.data.role_name}</dd>
        </div>
      </dl>
      {query.isError && (
        <p className="mt-3 text-sm text-destructive" role="alert">
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
      <div className="mt-5">
        <ProfileForm profile={query.data} />
      </div>
    </section>
  );
}
