'use server';

import { createHmac, randomInt } from 'node:crypto';
import { createClient } from '@/data/supabase/server';
import { createServiceClient } from '@/data/supabase/service';
import {
  clearPendingGuestChatRecovery,
  createGuestChatToken,
  setPendingGuestChatRecovery,
  setGuestChatToken,
} from '@/data/support-chat/guest-session';
import {
  startGuestEmailChatSchema,
  guestEmailAccessVerifySchema,
} from '@/lib/validations/support-chat';
import type { ActionResult } from '@/data/actions/auth';

function hashRecoveryCode(code: string) {
  const secret = process.env.SUPPORT_CHAT_RECOVERY_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('SUPPORT_CHAT_RECOVERY_SECRET must contain at least 32 characters.');
  }
  return createHmac('sha256', secret).update(code).digest('hex');
}

async function sendRecoveryEmail(email: string, code: string) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  if (!apiKey || !senderEmail) {
    throw new Error('Brevo email configuration is missing.');
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: { email: senderEmail },
      to: [{ email }],
      subject: 'Your NJET chat recovery code',
      textContent: `Your NJET chat recovery code is ${code}. It expires in 10 minutes.`,
      htmlContent: `<p>Your NJET chat recovery code is <strong>${code}</strong>.</p><p>It expires in 10 minutes. If you did not request it, you can ignore this email.</p>`,
    }),
  });

  if (!response.ok) {
    throw new Error('Brevo could not send the recovery email.');
  }
}

export async function requestGuestChatEmailAccessAction(
  input: unknown,
): Promise<ActionResult<{ message: string; requestedAt: number }>> {
  const validation = startGuestEmailChatSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: 'Enter your name and a valid email address.' };
  }

  try {
    const userClient = await createClient();
    const { data: authData } = await userClient.auth.getUser();
    if (authData.user) {
      return { success: false, error: 'Sign out before recovering guest chat.' };
    }

    const email = validation.data.email.toLowerCase();
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const serviceClient = createServiceClient();
    const { data: shouldSendCode, error } = await serviceClient.rpc(
      'support_chat_request_guest_email_access',
      {
        p_name: validation.data.name,
        p_email: email,
        p_code_hash: hashRecoveryCode(code),
      },
    );
    if (error) {
      console.error('Guest chat email request RPC failed:', error.message);
      return { success: false, error: 'Recovery could not be started. Please try again later.' };
    }
    if (shouldSendCode === false) {
      return {
        success: false,
        error: 'Too many code requests. Please wait 15 minutes before trying again.',
      };
    }
    if (shouldSendCode !== true) {
      return { success: false, error: 'Recovery could not be started. Please try again later.' };
    }
    await sendRecoveryEmail(email, code);
    const requestedAt = Date.now();
    await setPendingGuestChatRecovery({
      name: validation.data.name,
      email,
      requestedAt,
    });

    return {
      success: true,
      data: { message: 'If a code can be sent, it will arrive shortly.', requestedAt },
    };
  } catch (error) {
    console.error(
      'Guest chat email request failed:',
      error instanceof Error ? error.message : 'Unknown server error.',
    );
    return { success: false, error: 'Recovery could not be started. Please try again later.' };
  }
}

export async function verifyGuestChatEmailAccessAction(
  input: unknown,
): Promise<ActionResult<{ threadId: string; realtimeKey: string }>> {
  const validation = guestEmailAccessVerifySchema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: 'Enter a valid email address and 6-digit code.' };
  }

  try {
    const userClient = await createClient();
    const { data: authData } = await userClient.auth.getUser();
    if (authData.user) {
      return { success: false, error: 'Sign out before recovering guest chat.' };
    }

    const { token, tokenHash, realtimeKey } = createGuestChatToken();
    const serviceClient = createServiceClient();
    const { data, error } = await serviceClient.rpc(
      'support_chat_verify_guest_email_access',
      {
        p_email: validation.data.email.toLowerCase(),
        p_code_hash: hashRecoveryCode(validation.data.code),
        p_token_hash: tokenHash,
        p_realtime_key: realtimeKey,
      },
    );
    if (error) {
      console.error('Guest chat verification RPC failed:', error.message);
      return { success: false, error: 'Code verification is temporarily unavailable. Please try again.' };
    }
    if (!data?.[0]) {
      return { success: false, error: 'That code is invalid or expired. Request a new one and try again.' };
    }

    await setGuestChatToken(token);
    await clearPendingGuestChatRecovery();
    return {
      success: true,
      data: {
        threadId: data[0].thread_id,
        realtimeKey: data[0].realtime_key,
      },
    };
  } catch (error) {
    console.error(
      'Guest chat verification failed:',
      error instanceof Error ? error.message : 'Unknown server error.',
    );
    return { success: false, error: 'Code verification is temporarily unavailable. Please try again.' };
  }
}
