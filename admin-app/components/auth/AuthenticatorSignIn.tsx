'use client';

import { useRouter } from 'next/navigation';
import { AuthenticatorCodeForm } from '@/components/auth/AuthenticatorCodeForm';
import { addSignInNotice } from '@/lib/auth-sign-in-notice';

export function AuthenticatorSignIn(props: { destination: string; passwordReset?: never } | { passwordReset: true; destination?: never }) {
  const router = useRouter();

  function onVerified() {
    if (props.passwordReset) {
      router.refresh();
      return;
    }
    window.location.assign(addSignInNotice(new URL(props.destination, window.location.origin)));
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Two-factor authentication</h1>
      <p className="text-sm text-muted-foreground">
        {props.passwordReset
          ? 'Enter the six-digit code from your authenticator app to continue resetting your password.'
          : 'Enter the six-digit code from your authenticator app to finish signing in.'}
      </p>
      <AuthenticatorCodeForm
        onVerified={onVerified}
        submitLabel={props.passwordReset ? 'Verify and continue' : undefined}
      />
    </div>
  );
}
