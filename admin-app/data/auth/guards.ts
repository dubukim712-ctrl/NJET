import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/data/supabase/server';
import type { UserProfile } from '@/types/database';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

export interface AuthContext {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: User;
  profile: UserProfile | null;
}

export async function getAuthContext(): Promise<AuthContext | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return null;
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return { supabase, user, profile: profile ?? null };
  } catch {
    return null;
  }
}

function insufficientPermissionRedirect(
  profile: UserProfile | null
): string {
  if (hasPermission(profile, PERMISSIONS.adminAccess)) {
    return '/admin?error=insufficient_permissions';
  }
  if (hasPermission(profile, PERMISSIONS.storefrontAccess)) {
    return '/dashboard?error=insufficient_permissions';
  }
  return '/no-access';
}

export async function requirePermission(
  permission: string,
  redirectTo = '/admin'
) {
  const context = await getAuthContext();

  if (!context) {
    redirect(`/login?redirect=${encodeURIComponent(redirectTo)}`);
  }

  if (!context.profile) {
    redirect('/no-access');
  }

  if (!hasPermission(context.profile, permission)) {
    redirect(insufficientPermissionRedirect(context.profile));
  }

  return {
    supabase: context.supabase,
    user: context.user,
    profile: context.profile,
  };
}

export async function requireStaff(redirectTo = '/admin') {
  return requirePermission(PERMISSIONS.adminAccess, redirectTo);
}

export async function requireCustomer(redirectTo = '/dashboard') {
  return requirePermission(PERMISSIONS.storefrontAccess, redirectTo);
}

export async function requireFullAccess(redirectTo = '/admin') {
  const context = await requireStaff(redirectTo);

  if (!context.profile.is_full_access) {
    redirect('/admin?error=insufficient_permissions');
  }

  return context;
}
