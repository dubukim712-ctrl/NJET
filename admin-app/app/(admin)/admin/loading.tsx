'use client';

import { usePathname } from 'next/navigation';
import { StaffLandingPage } from '@/components/dashboard/StaffLandingPage';
import { useVerifiedAdminProfile } from '@/components/providers/AdminProvider';

export default function AdminLoading() {
  const pathname = usePathname();
  const profile = useVerifiedAdminProfile();
  if (!profile) return null;
  if (pathname === '/admin') return <StaffLandingPage />;
  return <p role="status" className="text-sm text-muted-foreground">Loading admin page…</p>;
}
