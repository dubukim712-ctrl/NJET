'use client';

import { createContext, useContext, type ReactNode } from 'react';
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
