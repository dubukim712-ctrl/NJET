'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { consumeSignInNotice } from '@/lib/auth-sign-in-notice';

export function AuthSignInNotice({ signedIn }: { signedIn: boolean }) {
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!consumeSignInNotice(url)) return;

    window.history.replaceState(null, '', url);
    if (signedIn) toast.success('Welcome back!', { id: 'auth-sign-in' });
  }, [signedIn]);

  return null;
}
