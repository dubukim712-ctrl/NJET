'use client';

import { useAuth } from '@/components/auth/AuthProvider';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { consumeSignInNotice } from '@/lib/auth-sign-in-notice';

export function AuthSignInNotice() {
  const pathname = usePathname();
  const signedIn = Boolean(useAuth().user);
  useEffect(() => {
    if (!signedIn) return;
    const url = new URL(window.location.href);
    if (!consumeSignInNotice(url)) return;

    window.history.replaceState(null, '', url);
    toast.success('Welcome back!', { id: 'auth-sign-in' });
  }, [pathname, signedIn]);

  return null;
}
