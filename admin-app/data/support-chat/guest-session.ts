import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';

export const SUPPORT_CHAT_GUEST_COOKIE = 'njet_support_chat_guest';
const GUEST_SESSION_MAX_AGE = 60 * 60 * 24 * 180;

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
