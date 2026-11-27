'use client';

import { AuthenticatorCodeForm } from '@/components/auth/AuthenticatorCodeForm';
import { addSignInNotice } from '@/lib/auth-sign-in-notice';

export function AuthenticatorSignIn({ destination }: { destination: string }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Two-factor authentication</h1>
      <p className="text-sm text-muted-foreground">Enter the six-digit code from your authenticator app to finish signing in.</p>
      <AuthenticatorCodeForm onVerified={() => window.location.assign(addSignInNotice(new URL(destination, window.location.origin)))} />
    </div>
  );
}
