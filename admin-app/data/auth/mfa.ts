import { isWithinRoute, normalizeAuthDestination } from '@/lib/customer-routes';
import type { User } from '@supabase/supabase-js';
import type { createClient } from '@/data/supabase/server';

type Auth = Awaited<ReturnType<typeof createClient>>['auth'];

export async function getPasswordResetStatus(auth: Pick<Auth, 'getSession' | 'mfa'>) {
  const { data: { session }, error: sessionError } = await auth.getSession();
  if (!session?.access_token) return 'expired';
  if (sessionError) return 'unavailable';

  // Supabase validates this token and reads the user's current factors.
  const { data, error } = await auth.mfa.getAuthenticatorAssuranceLevel(session.access_token);
  if (error || !data.currentLevel) return 'unavailable';
  if (data.nextLevel === 'aal2' && data.currentLevel !== 'aal2') return 'challenge';
  return 'ready';
}

export async function needsAuthenticatorVerification(auth: Pick<Auth, 'getClaims'>, user: User) {
  if (!user.factors?.some(({ status }) => status === 'verified')) return false;
  const { data, error } = await auth.getClaims();
  return Boolean(error || data?.claims.aal !== 'aal2');
}

export function authenticatorVerificationPath(destination: string) {
  return '/verify-authenticator?' + new URLSearchParams({ redirect: destination });
}

export function authenticatorDestination(value: string | undefined) {
  const destination = normalizeAuthDestination(value);
  if (!destination || isWithinRoute(destination.split(/[?#]/, 1)[0], '/verify-authenticator')) return '/';
  return destination;
}
