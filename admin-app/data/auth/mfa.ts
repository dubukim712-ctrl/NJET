import type { User } from '@supabase/supabase-js';
import type { createClient } from '@/data/supabase/server';

type Auth = Awaited<ReturnType<typeof createClient>>['auth'];

export async function needsAuthenticatorVerification(auth: Pick<Auth, 'getClaims'>, user: User) {
  if (!user.factors?.some(({ status }) => status === 'verified')) return false;
  const { data, error } = await auth.getClaims();
  return Boolean(error || data?.claims.aal !== 'aal2');
}

export function authenticatorVerificationPath(destination: string) {
  return '/verify-authenticator?' + new URLSearchParams({ redirect: destination });
}

export function authenticatorDestination(value: string | undefined) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\s]/.test(value)) return '/dashboard';
  const base = 'https://local.invalid';
  const url = new URL(value, base);
  if (url.origin !== base || url.pathname.startsWith('//') || url.pathname === '/verify-authenticator') return '/dashboard';
  return url.pathname + url.search + url.hash;
}
