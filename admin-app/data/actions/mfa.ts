'use server';

import { createClient } from '@/data/supabase/server';
import { getAuthContext } from '@/data/auth/guards';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import type { ActionResult } from '@/data/actions/auth';

const factorName = 'Authenticator App';

async function settingsContext() {
  const context = await getAuthContext();
  return context && hasPermission(context.profile, PERMISSIONS.storefrontAccess) ? context : null;
}

export async function enrollAuthenticator(): Promise<ActionResult<{ id: string; qrCode: string; secret: string }>> {
  const context = await settingsContext();
  if (!context) return { success: false, error: 'Sign in to manage two-factor authentication.' };
  const { supabase, user } = context;
  const factors = user.factors?.filter(({ factor_type }) => factor_type === 'totp') ?? [];
  if (factors.some(({ status }) => status === 'verified')) {
    return { success: false, error: 'An authenticator app is already enabled. Refresh Settings to view it.' };
  }

  for (const factor of factors.filter(({ friendly_name, status }) => friendly_name === factorName && status === 'unverified')) {
    const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
    if (error) return { success: false, error: 'Could not clear an incomplete setup. Please try again.' };
  }

  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: factorName });
  if (error) return { success: false, error: 'Could not start authenticator setup. Please try again.' };

  const svg = data.totp.qr_code.replace(/^data:image\/svg\+xml;utf-8,/, '');
  return {
    success: true,
    data: { id: data.id, secret: data.totp.secret, qrCode: 'data:image/svg+xml,' + encodeURIComponent(svg) },
  };
}

export async function verifyAuthenticator(code: string, enrollmentId?: string): Promise<ActionResult> {
  if (typeof code !== 'string' || !/^\d{6}$/.test(code)) {
    return { success: false, error: 'Enter a six-digit code from your authenticator app.' };
  }

  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { success: false, error: 'Your session expired. Sign in again.' };
  if (enrollmentId !== undefined && user.factors?.some(({ status }) => status === 'verified')) {
    return { success: false, error: 'Two-factor authentication is already enabled.' };
  }
  const factor = user.factors?.find(({ id, status, factor_type, friendly_name }) =>
    factor_type === 'totp' && (enrollmentId === undefined
      ? status === 'verified'
      : id === enrollmentId && status === 'unverified' && friendly_name === factorName)
  );
  if (!factor) return { success: false, error: 'No matching authenticator app was found.' };

  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
  if (error) return { success: false, error: 'Could not verify the code. Try a fresh code from your authenticator app.' };
  return { success: true, data: undefined };
}

export async function removeAuthenticator(factorId: string, verified: boolean): Promise<ActionResult> {
  const context = await settingsContext();
  if (!context) return { success: false, error: 'Sign in to manage two-factor authentication.' };
  const { supabase, user } = context;
  const factor = user.factors?.find(({ id, factor_type }) => id === factorId && factor_type === 'totp');

  if (!factor && !verified) return { success: true, data: undefined };
  if (factor?.status !== (verified ? 'verified' : 'unverified')) {
    return { success: false, error: 'The authenticator status changed. Refresh Settings and try again.' };
  }

  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) return { success: false, error: 'Could not remove the authenticator app. Please try again.' };
  if (verified) await supabase.auth.refreshSession();
  return { success: true, data: undefined };
}
