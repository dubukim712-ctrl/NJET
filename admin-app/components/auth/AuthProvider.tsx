'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { createClient } from '@/data/supabase/client';
import { postgresRealtimeTopic } from '@/data/supabase/postgres-realtime-topic';
import type { UserProfile } from '@/types/database';

interface AuthContextType {
  user: UserProfile | null;
  sessionResolved: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function loadProfile(): Promise<UserProfile | null> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) return null;

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  return profile ?? null;
}

export function AuthProvider({
  children,
  initialUser,
}: {
  children: ReactNode;
  initialUser: UserProfile | null;
}) {
  const router = useRouter();
  const [sessionResolved, setSessionResolved] = useState(Boolean(initialUser));
  const [user, setUser] = useState<UserProfile | null>(initialUser);
  const accessAssignment = useRef<Pick<UserProfile, 'id' | 'role_id' | 'branch_id'> | null>(
    initialUser
      ? {
          id: initialUser.id,
          role_id: initialUser.role_id,
          branch_id: initialUser.branch_id,
        }
      : null
  );
  const userId = user?.id;
  const signOutPending = useRef<Promise<void> | null>(null);

  useEffect(() => {
    const supabase = createClient();

    let loadVersion = 0;
    let profileLoad: ReturnType<typeof setTimeout> | undefined;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const version = ++loadVersion;
      if (profileLoad) clearTimeout(profileLoad);
      if (!session) {
        setSessionResolved(true);
        setUser(null);
        return;
      }
      // Defer Supabase calls until the auth callback has released its lock.
      profileLoad = setTimeout(() => {
        void loadProfile().then((profile) => {
          if (version === loadVersion) {
            setUser(profile);
            setSessionResolved(true);
          }
        }).catch(() => {});
      }, 0);
    });

    return () => {
      if (profileLoad) clearTimeout(profileLoad);
      loadVersion++;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      accessAssignment.current = null;
    } else if (accessAssignment.current?.id !== user.id) {
      accessAssignment.current = {
        id: user.id,
        role_id: user.role_id,
        branch_id: user.branch_id,
      };
    }
  }, [user]);

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    let active = true;
    let checking = false;
    const verifyAssignment = async () => {
      if (!active || checking) return;
      checking = true;

      try {
        const {
          data: { user: authenticatedUser },
          error: authError,
        } = await supabase.auth.getUser();
        if (!active || authError || authenticatedUser?.id !== userId) return;

        const { data: updatedProfile, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        if (!active) return;
        if (error) {
          console.error('Could not verify account access changes.', error);
          return;
        }

        const previous = accessAssignment.current;
        if (!updatedProfile) {
          console.error('Could not find the affected account profile.');
          return;
        }
        const accessChanged =
          previous?.id === updatedProfile.id &&
          (previous.role_id !== updatedProfile.role_id ||
            previous.branch_id !== updatedProfile.branch_id);
        if (accessChanged) {
          const { error: signOutError } = await supabase.auth.signOut({
            scope: 'global',
          });
          if (signOutError) {
            console.error('Could not revoke all affected account sessions.', signOutError);
            const { error: localSignOutError } = await supabase.auth.signOut({
              scope: 'local',
            });
            if (localSignOutError) {
              console.error('Could not sign out the affected session.', localSignOutError);
              return;
            }
          }

          setUser(null);
          router.replace('/login');
          router.refresh();
          return;
        }

        accessAssignment.current = {
          id: updatedProfile.id,
          role_id: updatedProfile.role_id,
          branch_id: updatedProfile.branch_id,
        };
        setUser(updatedProfile);
      } catch (error) {
        console.error('Could not verify account access changes.', error);
      } finally {
        checking = false;
      }
    };
    const channel = supabase
      .channel(postgresRealtimeTopic(`auth-access-${userId}`))
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${userId}`,
        },
        () => void verifyAssignment()
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') void verifyAssignment();
      });

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [router, userId]);

  const signOut = useCallback(async () => {
    if (signOutPending.current) return signOutPending.current;

    const signOutRequest = (async () => {
      const { error } = await createClient().auth.signOut();
      if (error) throw error;
      setUser(null);
      toast.success('Signed out.', { id: 'auth-sign-out' });
    })();
    signOutPending.current = signOutRequest;

    try {
      await signOutRequest;
    } finally {
      signOutPending.current = null;
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      setUser(await loadProfile());
    } catch {
      // Keep the last known profile on transient failures.
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        sessionResolved,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}