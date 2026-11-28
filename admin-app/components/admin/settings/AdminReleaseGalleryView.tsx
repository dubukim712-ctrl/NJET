'use client';

import { useQuery } from '@tanstack/react-query';
import { useVerifiedAdminProfile } from '@/components/providers/AdminProvider';
import { Button } from '@/components/ui/Button';
import { CustomerReleaseManager } from '@/components/admin/settings/CustomerReleaseManager';
import { getAdminReleaseGallery } from '@/data/actions/admin-release-gallery';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import type { UserProfile } from '@/types/database';

function Gallery({ profile }: { profile: UserProfile }) {
  const query = useQuery({
    queryKey: ['admin-release-gallery', profile.id, profile.branch_id, profile.is_full_access],
    queryFn: () => getAdminReleaseGallery(profile.id),
    retry: false,
  });
  if (query.isPending) return <p role="status">Loading customer releases…</p>;
  if (!query.data) return (
    <div role="alert" className="space-y-2">
      <p>Customer releases are temporarily unavailable.</p>
      <Button variant="outline" onClick={() => void query.refetch()}>Try again</Button>
    </div>
  );
  return (
    <>
      {query.data.ordersUnavailable && <p role="alert" className="text-sm text-muted-foreground">Completed orders are temporarily unavailable. You can still submit a standalone photo.</p>}
      <CustomerReleaseManager {...query.data} userId={profile.id} canApprove={profile.is_full_access}
        onDataChanged={() => void query.refetch()} />
    </>
  );
}

export function AdminReleaseGalleryView() {
  const profile = useVerifiedAdminProfile();
  if (!profile || profile.scope !== 'staff' || (!profile.is_full_access && !hasPermission(profile, PERMISSIONS.ordersRead))) return null;
  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-semibold tracking-tight">Customer Releases</h1>
      <Gallery profile={profile} />
    </div>
  );
}
