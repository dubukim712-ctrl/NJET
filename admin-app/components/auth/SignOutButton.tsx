'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/Button';

export function SignOutButton() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut();
      toast.success('Signed out.');
      router.push('/login');
      router.refresh();
    } catch {
      toast.error('Could not sign out. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button type="button" variant="outline" loading={loading} onClick={handleSignOut}>
      Sign out
    </Button>
  );
}
