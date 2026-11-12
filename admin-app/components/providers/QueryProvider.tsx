'use client';

import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AccessQueryCacheSync />
      {children}
    </QueryClientProvider>
  );
}

function AccessQueryCacheSync() {
  const { user } = useAuth();
  const previous = useRef<{
    id: string;
    roleId: string;
    branchId: string | null;
    scope: string;
    isFullAccess: boolean;
    permissionSignature: string;
  } | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) {
      if (previous.current) queryClient.clear();
      previous.current = null;
      return;
    }

    const next = {
      id: user.id,
      roleId: user.role_id,
      branchId: user.branch_id,
      scope: user.scope,
      isFullAccess: user.is_full_access,
      permissionSignature: JSON.stringify(user.permissions),
    };
    const current = previous.current;
    if (
      current &&
      (current.id !== next.id ||
        current.roleId !== next.roleId ||
        current.branchId !== next.branchId ||
        current.scope !== next.scope ||
        current.isFullAccess !== next.isFullAccess ||
        current.permissionSignature !== next.permissionSignature)
    ) {
      queryClient.clear();
    }
    previous.current = next;
  }, [queryClient, user]);

  return null;
}
