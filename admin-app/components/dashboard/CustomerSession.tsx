'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';

const CustomerSessionContext = createContext('');

export function CustomerSession({ userId, children }: { userId: string; children: ReactNode }) {
  return <CustomerSessionContext.Provider value={userId}>{children}</CustomerSessionContext.Provider>;
}

export function useCustomerSessionId() {
  const verifiedId = useContext(CustomerSessionContext);
  const { user, sessionResolved } = useAuth();

  if (user) return user.id === verifiedId ? verifiedId : '';
  return sessionResolved ? '' : verifiedId;
}
