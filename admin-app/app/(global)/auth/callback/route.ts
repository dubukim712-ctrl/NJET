import { addSignInNotice } from '@/lib/auth-sign-in-notice';
import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/data/supabase/server';
import { queueWelcomeEmail } from '@/data/email/welcome-email';
import { authenticatorVerificationPath, needsAuthenticatorVerification } from '@/data/auth/mfa';
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

  const supabase = await createClient();

  try {
    let authenticated = false;
    let isRecovery = false;

    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      authenticated = !error;
      isRecovery = authenticated && 'redirectType' in data && data.redirectType === 'recovery';
    } else if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type,
      });
      authenticated = !error;
      isRecovery = authenticated && type === 'recovery';
    }

    if (authenticated) {
      const isOAuthCallback = Boolean(code) && !isRecovery;
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('Auth callback did not establish a session.');
      if (isRecovery) return NextResponse.redirect(new URL('/reset-password', origin));

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

      if (requestedNext) {
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

      if (profile?.scope === 'customer') {
        // OAuth sign-in also uses this callback. Only welcome newly created Google accounts.
        const accountAge = Date.now() - Date.parse(user.created_at);
        const newGoogleAccount = isOAuthCallback && !emailIdentity && googleIdentity &&
          accountAge >= 0 && accountAge < 5 * 60_000;
        if ((!code && type === 'signup') || newGoogleAccount) queueWelcomeEmail(user);
      }

      if (await needsAuthenticatorVerification(supabase.auth, user)) {
        return NextResponse.redirect(new URL(authenticatorVerificationPath(destination), origin));
      }

      const destinationUrl = new URL(destination, origin);
      return NextResponse.redirect(isOAuthCallback ? addSignInNotice(destinationUrl) : destinationUrl);
    }
  } catch {
    // Fall through to the error redirect below.
  }

  const errorUrl = new URL('/login', origin);
  errorUrl.searchParams.set('error', 'auth_callback_failed');
  return NextResponse.redirect(errorUrl);
}
