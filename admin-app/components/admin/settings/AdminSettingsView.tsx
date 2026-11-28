'use client';

import { useVerifiedAdminProfile } from '@/components/providers/AdminProvider';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { releasesPath } from '@/lib/customer-releases';
import { SystemSettingsQuery } from '@/components/admin/settings/SystemSettingsQuery';

export function AdminSettingsView() {
  const profile = useVerifiedAdminProfile();
  if (!profile || !(profile.is_full_access)) return null;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Global</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage business information, service hours, payment accounts, and storefront policies.
        </p>
      </header>
      <section className="rounded-xl border bg-card p-5">
        <h2 className="text-lg font-semibold">Customer Releases / Purchase Gallery</h2>
        <p className="mt-1 text-sm text-muted-foreground">Upload release photos and manage what appears on the storefront.</p>
        <Button asChild variant="outline" className="mt-3"><Link prefetch={true} href={releasesPath}>Manage Customer Releases</Link></Button>
      </section>
      <SystemSettingsQuery userId={profile.id} />
    </div>
  );
}
