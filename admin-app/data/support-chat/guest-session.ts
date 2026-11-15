import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { pendingGuestChatRecoverySchema } from '@/lib/validations/support-chat';

export const SUPPORT_CHAT_GUEST_COOKIE = 'njet_support_chat_guest';
const GUEST_SESSION_MAX_AGE = 60 * 60 * 24 * 180;
const GUEST_RECOVERY_COOKIE = 'njet_support_chat_recovery';
const GUEST_RECOVERY_MAX_AGE = 10 * 60;
export type PendingGuestChatRecovery = z.infer<typeof pendingGuestChatRecoverySchema>;

export function createGuestChatToken() {
  const token = randomBytes(32).toString('base64url');
  return {
    token,
    tokenHash: hashGuestChatToken(token),
    realtimeKey: randomBytes(32).toString('hex'),
  };
}

export function hashGuestChatToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function getGuestChatToken() {
  const token = (await cookies()).get(SUPPORT_CHAT_GUEST_COOKIE)?.value;
  return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
}

export async function getGuestChatTokenHash() {
  const token = await getGuestChatToken();
  return token ? hashGuestChatToken(token) : null;
}

export async function setGuestChatToken(token: string) {
  (await cookies()).set(SUPPORT_CHAT_GUEST_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: GUEST_SESSION_MAX_AGE,
  });
}

export function parsePendingGuestChatRecovery(value: string | undefined) {
  if (!value) return null;
  try {
    const result = pendingGuestChatRecoverySchema.safeParse(JSON.parse(value));
    if (!result.success || result.data.requestedAt > Date.now()) return null;
    return result.data;
  } catch {
    return null;
  }
}

export async function getPendingGuestChatRecovery() {
  const value = (await cookies()).get(GUEST_RECOVERY_COOKIE)?.value;
  return parsePendingGuestChatRecovery(value);
}

export async function setPendingGuestChatRecovery(recovery: PendingGuestChatRecovery) {
  (await cookies()).set(GUEST_RECOVERY_COOKIE, JSON.stringify(recovery), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/chat',
    maxAge: GUEST_RECOVERY_MAX_AGE,
  });
}

export async function clearPendingGuestChatRecovery() {
  (await cookies()).set(GUEST_RECOVERY_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/chat',
    maxAge: 0,
  });
}
