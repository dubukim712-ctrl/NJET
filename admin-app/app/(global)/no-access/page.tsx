import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { SignOutButton } from '@/components/auth/SignOutButton';

export const metadata = { title: 'No access' };

export default function NoAccessPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 text-center sm:p-8">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <ShieldAlert className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">
          No access yet
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account does not have a role with access to the admin panel or
          the storefront. Ask an administrator to assign you a role.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <SignOutButton />
          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center rounded-md border border-input px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Back home
          </Link>
        </div>
      </div>
    </main>
  );
}
