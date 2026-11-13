import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/data/supabase/server';
import { surfaceHome } from '@/lib/permissions';

function safeNext(value: string | null): string | null {
  return value &&
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.startsWith('/\\')
    ? value
    : null;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const requestedNext = safeNext(searchParams.get('next'));
  const isOAuthCallback = Boolean(code) && requestedNext !== '/reset-password';

  const supabase = await createClient();

  try {
    let authenticated = false;

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      authenticated = !error;
    } else if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type,
      });
      authenticated = !error;
    }

    if (authenticated) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const emailIdentity = user?.identities?.find(
        (identity) => identity.provider === 'email'
      );
      const googleIdentity = user?.identities?.find(
        (identity) => identity.provider === 'google'
      );

      if (isOAuthCallback && emailIdentity && googleIdentity) {
        try {
          await supabase.auth.unlinkIdentity(googleIdentity);
        } finally {
          const { error } = await supabase.auth.signOut({ scope: 'local' });
          if (error) throw error;
        }

        const loginUrl = new URL('/login', origin);
        loginUrl.searchParams.set('error', 'oauth_password_signin_required');
        return NextResponse.redirect(loginUrl);
      }

      let profile: {
        scope: 'staff' | 'customer';
        is_full_access: boolean;
        permissions: string[];
      } | null = null;

      if (user) {
        const { data } = await supabase
          .from('user_profiles')
          .select('scope, is_full_access, permissions')
          .eq('id', user.id)
          .single();
        profile = data;
      }

      const home = surfaceHome(profile);
      let destination = home;

      if (requestedNext === '/reset-password') {
        destination = requestedNext;
      } else if (requestedNext) {
        if (
          home === '/admin' &&
          (requestedNext.startsWith('/admin') ||
            requestedNext.startsWith('/dashboard'))
        ) {
          destination = requestedNext;
        } else if (
          home === '/dashboard' &&
          requestedNext.startsWith('/dashboard')
        ) {
          destination = requestedNext;
        }
      }

      return NextResponse.redirect(new URL(destination, origin));
    }
  } catch {
    // Fall through to the error redirect below.
  }

  const errorUrl = new URL('/login', origin);
  errorUrl.searchParams.set('error', 'auth_callback_failed');
  return NextResponse.redirect(errorUrl);
}
