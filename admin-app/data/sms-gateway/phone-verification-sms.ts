import { Buffer } from 'node:buffer';
import { z } from 'zod';

const SMS_GATEWAY_API_URL = 'https://api.sms-gate.app';
const tokenSchema = z.object({
  access_token: z.string().min(1),
}).passthrough();

function getCredentials() {
  const username = process.env.SMS_GATEWAY_USERNAME;
  const password = process.env.SMS_GATEWAY_PASSWORD;
  if (!username || !password) {
    throw new Error('SMS Gate server credentials are not configured.');
  }
  return { username, password };
}

export async function sendPhoneVerificationSms(phoneNumber: string, code: string) {
  const { username, password } = getCredentials();
  const credentials = Buffer.from(`${username}:${password}`).toString('base64');
  const tokenResponse = await fetch(
    `${SMS_GATEWAY_API_URL}/3rdparty/v1/auth/token`,
    {
      method: 'POST',
      headers: {
        authorization: `Basic ${credentials}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ ttl: 600, scopes: ['messages:send'] }),
      signal: AbortSignal.timeout(10_000),
    }
  );
  if (!tokenResponse.ok) {
    throw new Error(`SMS Gate token request failed (${tokenResponse.status}).`);
  }

  const tokenValidation = tokenSchema.safeParse(await tokenResponse.json());
  if (!tokenValidation.success) {
    throw new Error('SMS Gate returned an invalid access token response.');
  }

  const messageResponse = await fetch(
    `${SMS_GATEWAY_API_URL}/3rdparty/v1/messages`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${tokenValidation.data.access_token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        phoneNumbers: [phoneNumber],
        textMessage: {
          text: `Your NJET verification code is ${code}. It expires in 5 minutes.`,
        },
      }),
      signal: AbortSignal.timeout(10_000),
    }
  );
  if (!messageResponse.ok) {
    throw new Error(`SMS Gate message request failed (${messageResponse.status}).`);
  }
}
