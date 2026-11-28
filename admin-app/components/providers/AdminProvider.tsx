'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import type { UserProfile } from '@/types/database';

const AdminContext = createContext<UserProfile | null>(null);

export function AdminProvider({
  profile,
  children,
}: {
  profile: UserProfile;
  children: ReactNode;
}) {
  return <AdminContext.Provider value={profile}>{children}</AdminContext.Provider>;
}

export function useAdminProfile() {
  const profile = useContext(AdminContext);
  if (!profile) throw new Error('useAdminProfile must be used inside AdminProvider.');
  return profile;
}

export function useVerifiedAdminProfile() {
  const profile = useAdminProfile();
  const { user, sessionResolved } = useAuth();
  if (!sessionResolved && !user) return profile;
  if (!user || user.id !== profile.id || user.branch_id !== profile.branch_id ||
      user.role_id !== profile.role_id || user.role !== profile.role ||
      user.is_full_access !== profile.is_full_access ||
      user.permissions.length !== profile.permissions.length ||
      !user.permissions.every((permission) => profile.permissions.includes(permission))) return null;
  return profile;
}
